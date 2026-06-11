import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';
import { useCallback, useEffect, useRef } from 'react';
import { sendCellSaveBeacon } from './cell-save-beacon.ts';
import {
	getSheetCellEditInputsForMutation,
	getSheetCellEditInputCoordKey,
	sheetCellEditInputMatchesCell,
	type SheetCellEditInput,
} from './sheet-history.ts';
import { removeSheetOptimisticCellKeys } from './sheet-local-state.ts';
import { getSheetCanvasCellsByCoord } from './sheet-utils.ts';
import { useDebouncedCellSaveBatch } from './use-debounced-cell-save-batch.ts';

type SheetPendingCellSave = {
	coordKey: string;
	input: SheetCellEditInput;
	saveVersion: number;
};

type EditSheetCellsResult = {
	editSheetCells?: SheetCellGQL[] | null;
};

type EditSheetCellsVariables = {
	cells: SheetCellEditInput[];
	organizationId: string;
	sheetId: string;
};

type SetOptimisticSheetCells = (
	update:
		| Map<string, SheetCellGQL>
		| ((currentState: Map<string, SheetCellGQL>) => Map<string, SheetCellGQL>),
) => void;

export type UseSheetCellSaveQueueParams = {
	editSheetCells: (params: { variables: EditSheetCellsVariables }) => Promise<unknown> | unknown;
	gridCellsByCoord: Map<string, SheetCellGQL>;
	organizationId: string;
	setOptimisticCellsByCoord: SetOptimisticSheetCells;
	sheetId: string;
};

/*
 * Own debounced Sheet cell mutation saves and optimistic cell reconciliation.
 */
export function useSheetCellSaveQueue(params: UseSheetCellSaveQueueParams) {
	const saveVersionRef = useRef<Record<string, number>>({});
	const { queue } = useDebouncedCellSaveBatch<SheetPendingCellSave>({
		getKey: (item) => item.coordKey,
		onError: (items) => {
			params.setOptimisticCellsByCoord((currentState) => {
				const revertKeys = items
					.filter((item) => saveVersionRef.current[item.coordKey] === item.saveVersion)
					.map((item) => item.coordKey);

				return removeSheetOptimisticCellKeys(currentState, revertKeys);
			});
		},
		onBeaconFlush: (items) => {
			const mutationCells = getSheetCellEditInputsForMutation(
				items.map((item) => item.input),
				params.gridCellsByCoord,
			);

			if (!mutationCells.length) {
				return true;
			}

			return sendCellSaveBeacon({
				cells: mutationCells,
				organizationId: params.organizationId,
				targetId: params.sheetId,
				targetType: 'sheet',
			});
		},
		onFlush: async (items) => {
			const syncedKeys = items
				.filter((item) => {
					return saveVersionRef.current[item.coordKey] === item.saveVersion &&
						sheetCellEditInputMatchesCell(
							item.input,
							params.gridCellsByCoord.get(item.coordKey),
						);
				})
				.map((item) => item.coordKey);

			if (syncedKeys.length) {
				params.setOptimisticCellsByCoord((currentState) => {
					return removeSheetOptimisticCellKeys(currentState, syncedKeys);
				});
			}

			const mutationItems = items.filter((item) => !syncedKeys.includes(item.coordKey));
			const mutationCells = getSheetCellEditInputsForMutation(
				mutationItems.map((item) => item.input),
				params.gridCellsByCoord,
			);

			if (!mutationCells.length) {
				return;
			}

			const result = await params.editSheetCells({
				variables: {
					cells: mutationCells,
					organizationId: params.organizationId,
					sheetId: params.sheetId,
				},
			}) as EditSheetCellsResult | undefined;
			const savedCellsByCoord = getSheetCanvasCellsByCoord(
				(result?.editSheetCells || []) as SheetCellGQL[],
			);

			if (!savedCellsByCoord.size) {
				return;
			}

			params.setOptimisticCellsByCoord((currentState) => {
				const next = new Map(currentState);
				let changed = false;

				mutationItems.forEach((item) => {
					const savedCell = savedCellsByCoord.get(item.coordKey);

					if (
						savedCell &&
						saveVersionRef.current[item.coordKey] === item.saveVersion
					) {
						next.set(item.coordKey, savedCell);
						changed = true;
					}
				});

				return changed ? next : currentState;
			});
		},
	});

	useEffect(() => {
		saveVersionRef.current = {};
	}, [params.sheetId]);

	const saveCells = useCallback((cells: SheetCellEditInput[]) => {
		if (!cells.length) {
			return;
		}

		const revertedCoordKeys: string[] = [];

		cells.forEach((input) => {
			const coordKey = getSheetCellEditInputCoordKey(input);
			const saveVersion = (saveVersionRef.current[coordKey] || 0) + 1;

			saveVersionRef.current[coordKey] = saveVersion;

			if (sheetCellEditInputMatchesCell(input, params.gridCellsByCoord.get(coordKey))) {
				revertedCoordKeys.push(coordKey);
			}

			queue({
				coordKey,
				input,
				saveVersion,
			});
		});

		if (revertedCoordKeys.length) {
			params.setOptimisticCellsByCoord((currentState) => {
				return removeSheetOptimisticCellKeys(currentState, revertedCoordKeys);
			});
		}
	}, [params.gridCellsByCoord, params.setOptimisticCellsByCoord, queue]);

	return {
		saveCells,
	};
}
