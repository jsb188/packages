import type { DataTableCellGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { SheetCellGQL } from '@jsb188/mday/types/sheet.d.ts';
import { useCallback, useEffect, useRef } from 'react';
import { sendCellSaveBeacon } from './cell-save-beacon.ts';
import type { DataTableRuntimeDesignCell } from './dataTable-cell-editing.tsx';
import type { SheetPendingCellEdit } from './sheet-cell-store.ts';
import { mergeConfirmedSheetCells } from './sheet-cell-store.ts';
import {
	getSheetDataTableSourceCellKey,
	getSheetDataTableSourceCellCurrentValue,
} from './sheet-dataTable-preview.ts';
import {
	getSheetCellEditInputCoordKey,
	getSheetCellEditInputsForMutation,
	sheetCellEditInputMatchesCell,
	type SheetCellEditInput,
	type SheetDataTableCellEditTarget,
} from './sheet-history.ts';
import { getSheetCanvasCellsByCoord } from './sheet-utils.ts';
import {
	groupCellSaveItemsByTarget,
	sendGroupedCellSaveItems,
	useDebouncedCellSaveBatch,
} from './use-debounced-cell-save-batch.ts';

/*
 * One queue for every Sheet edit kind. Sheet-owned cells and DataTable source
 * cells edited through regions share the debounce window, the beacon flush,
 * and the unified pending-edit store that renders instant previews.
 */

export type SheetCellSaveEntry = {
	input: SheetCellEditInput;
	previewCell: SheetCellGQL;
};

export type SheetDataTableCellSaveEdit = {
	cellKey: string;
	dataTableId: string;
	dataTableRowId: string;
	organizationId: string | number | bigint | null;
	/* Pending previews fanned out to every region coordinate mirroring the source cell */
	previews: Array<{ coordKey: string; previewCell: SheetCellGQL }>;
	target: SheetDataTableCellEditTarget;
	value: string | null;
};

type SheetCellSaveItem =
	| {
		kind: 'SHEET';
		coordKey: string;
		input: SheetCellEditInput;
		saveVersion: number;
	}
	| {
		kind: 'DATA_TABLE';
		cellKey: string;
		coordKeys: string[];
		dataTableId: string;
		dataTableRowId: string;
		organizationId: string | number | bigint | null;
		saveVersion: number;
		sourceKey: string;
		target: SheetDataTableCellEditTarget;
		value: string | null;
	};

type EditSheetCellsResult = {
	editSheetCells?: {
		savedCells?: SheetCellGQL[] | null;
		recalculatedCells?: SheetCellGQL[] | null;
		recalculatedCount?: number | null;
		cycleCellIds?: string[] | null;
	} | null;
};

type SetPendingCellEdits = (
	update: (currentState: Map<string, SheetPendingCellEdit>) => Map<string, SheetPendingCellEdit>,
) => void;

export type UseSheetCellSavesParams = {
	/* Confirmed-derived base cells used for synced-edit skips */
	baseCellsByCoord: Map<string, SheetCellGQL>;
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>;
	editSheetCells: (params: {
		variables: {
			cells: SheetCellEditInput[];
			organizationId: string;
			sheetId: string;
		};
	}) => Promise<unknown> | unknown;
	/* Reports cells that are part of a circular reference chain */
	onCycleCells?: (cycleCellIds: string[]) => void;
	/* Pending previews dropped after a save error; used to relay CELLS_CLEAR */
	onPendingCoordsCleared?: (coordKeys: string[]) => void;
	onSaveDataTableCells: (params: {
		cells: Array<{
			cellKey: string;
			dataTableRowId: string;
			value: string | null;
		}>;
		dataTableId: string;
	}) => Promise<unknown> | unknown;
	organizationId: string;
	setConfirmedCellsByCoord: (
		update: (currentState: Map<string, SheetCellGQL>) => Map<string, SheetCellGQL>,
	) => void;
	setPendingCellEdits: SetPendingCellEdits;
	sheetId: string;
	sourceCellsByTargetKey: Map<string, DataTableCellGQL>;
};

/*
 * Return the source key of one pending edit's DataTable target, or null.
 */
export function getSheetPendingEditDataTableSourceKey(pendingEdit: SheetPendingCellEdit) {
	const target = pendingEdit.dataTableTarget;
	if (!target) {
		return null;
	}

	return getSheetDataTableSourceCellKey(target.dataTableId, target.dataTableRowId, target.cellKey);
}

/*
 * Return a pending map with the listed coordinate keys removed.
 */
function removePendingCellEditKeys(
	currentState: Map<string, SheetPendingCellEdit>,
	coordKeys: string[],
	saveVersion?: number,
) {
	let next = currentState;
	let changed = false;

	coordKeys.forEach((coordKey) => {
		const pendingEdit = next.get(coordKey);
		if (!pendingEdit || (saveVersion !== undefined && pendingEdit.saveVersion !== saveVersion)) {
			return;
		}

		if (!changed) {
			next = new Map(currentState);
			changed = true;
		}
		next.delete(coordKey);
	});

	return next;
}

/*
 * Own the unified debounced save queue and the pending-edit lifecycle for
 * Sheet cell edits and region-backed DataTable cell edits.
 */
export function useSheetCellSaves(params: UseSheetCellSavesParams) {
	const sheetVersionsRef = useRef<Record<string, number>>({});
	const dataTableVersionsRef = useRef<Record<string, number>>({});

	const flushSheetItems = useCallback(async (items: Extract<SheetCellSaveItem, { kind: 'SHEET' }>[]) => {
		// Edits whose value already matches the confirmed base need no mutation
		const syncedKeys = items
			.filter((item) => {
				return sheetVersionsRef.current[item.coordKey] === item.saveVersion &&
					sheetCellEditInputMatchesCell(item.input, params.baseCellsByCoord.get(item.coordKey));
			})
			.map((item) => item.coordKey);

		if (syncedKeys.length) {
			params.setPendingCellEdits((currentState) => removePendingCellEditKeys(currentState, syncedKeys));
		}

		const mutationItems = items.filter((item) => !syncedKeys.includes(item.coordKey));
		const mutationCells = getSheetCellEditInputsForMutation(
			mutationItems.map((item) => item.input),
			params.baseCellsByCoord,
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
		const editResult = result?.editSheetCells || null;
		const savedCells = (editResult?.savedCells || []) as SheetCellGQL[];
		const recalculatedCells = (editResult?.recalculatedCells || []) as SheetCellGQL[];
		const savedCellsByCoord = getSheetCanvasCellsByCoord(savedCells);

		// Saved cells and the server-recalculated cascade land in the confirmed
		// store immediately; the realtime echo that follows is a revision-gated
		// no-op
		if (savedCells.length || recalculatedCells.length) {
			params.setConfirmedCellsByCoord((currentState) => {
				return mergeConfirmedSheetCells(currentState, [...savedCells, ...recalculatedCells]);
			});
		}

		if (editResult?.cycleCellIds?.length) {
			params.onCycleCells?.(editResult.cycleCellIds.map(String));
		}

		// The confirmed cells now carry the saved values: drop the previews
		// whose save version is still current (newer edits keep their preview)
		params.setPendingCellEdits((currentState) => {
			const removableKeys = mutationItems
				.filter((item) => {
					return savedCellsByCoord.has(item.coordKey) &&
						sheetVersionsRef.current[item.coordKey] === item.saveVersion &&
						currentState.get(item.coordKey)?.saveVersion === item.saveVersion;
				})
				.map((item) => item.coordKey);

			return removePendingCellEditKeys(currentState, removableKeys);
		});
	}, [params.baseCellsByCoord, params.editSheetCells, params.onCycleCells, params.organizationId, params.setConfirmedCellsByCoord, params.setPendingCellEdits, params.sheetId]);

	const flushDataTableItems = useCallback(async (items: Extract<SheetCellSaveItem, { kind: 'DATA_TABLE' }>[]) => {
		// Edits whose value matches the confirmed source cell need no mutation
		const syncedItems = items.filter((item) => {
			return dataTableVersionsRef.current[item.sourceKey] === item.saveVersion &&
				getSheetDataTableSourceCellCurrentValue(
					item.sourceKey,
					params.sourceCellsByTargetKey,
					params.designCellsByDataTableId,
					item.target.lookup.cell,
					item.target.lookup.designCell,
				) === item.value;
		});

		if (syncedItems.length) {
			params.setPendingCellEdits((currentState) => {
				return removePendingCellEditKeys(currentState, syncedItems.flatMap((item) => item.coordKeys));
			});
		}

		const mutationItems = items.filter((item) => !syncedItems.includes(item));
		const groups = groupCellSaveItemsByTarget(mutationItems, (item) => ({
			organizationId: item.organizationId,
			targetId: item.dataTableId,
		}));

		for (const group of groups) {
			if (!group.targetId) {
				continue;
			}

			await params.onSaveDataTableCells({
				dataTableId: String(group.targetId),
				cells: group.items.map((item) => ({
					cellKey: item.cellKey,
					dataTableRowId: item.dataTableRowId,
					value: item.value,
				})),
			});
		}

		// Pending DataTable previews stay until the confirmed region cells
		// catch up (rematerialization arrives via realtime deltas); the
		// catch-up effect in SheetData clears them
	}, [params.designCellsByDataTableId, params.onSaveDataTableCells, params.setPendingCellEdits, params.sourceCellsByTargetKey]);

	const { queue } = useDebouncedCellSaveBatch<SheetCellSaveItem>({
		getKey: (item) => item.kind === 'SHEET' ? `sheet:${item.coordKey}` : `dt:${item.sourceKey}`,
		onError: (items) => {
			// Reverted previews fall back to the confirmed value
			const clearedCoordKeys: string[] = [];

			params.setPendingCellEdits((currentState) => {
				let next = currentState;
				items.forEach((item) => {
					if (item.kind === 'SHEET') {
						if (sheetVersionsRef.current[item.coordKey] === item.saveVersion) {
							next = removePendingCellEditKeys(next, [item.coordKey], item.saveVersion);
							clearedCoordKeys.push(item.coordKey);
						}
					} else if (dataTableVersionsRef.current[item.sourceKey] === item.saveVersion) {
						next = removePendingCellEditKeys(next, item.coordKeys);
						clearedCoordKeys.push(...item.coordKeys);
					}
				});
				return next;
			});

			if (clearedCoordKeys.length) {
				params.onPendingCoordsCleared?.(clearedCoordKeys);
			}
		},
		onBeaconFlush: (items) => {
			const sheetItems = items.filter((item) => item.kind === 'SHEET');
			const dataTableItems = items.filter((item) => item.kind === 'DATA_TABLE');

			let allSent = true;

			const sheetMutationCells = getSheetCellEditInputsForMutation(
				sheetItems.map((item) => item.input),
				params.baseCellsByCoord,
			);
			if (sheetMutationCells.length) {
				allSent = sendCellSaveBeacon({
					cells: sheetMutationCells,
					organizationId: params.organizationId,
					targetId: params.sheetId,
					targetType: 'sheet',
				}) && allSent;
			}

			const dataTableMutationItems = dataTableItems.filter((item) => {
				return getSheetDataTableSourceCellCurrentValue(
					item.sourceKey,
					params.sourceCellsByTargetKey,
					params.designCellsByDataTableId,
					item.target.lookup.cell,
					item.target.lookup.designCell,
				) !== item.value;
			});
			if (dataTableMutationItems.length) {
				const groups = groupCellSaveItemsByTarget(dataTableMutationItems, (item) => ({
					organizationId: item.organizationId,
					targetId: item.dataTableId,
				}));

				allSent = sendGroupedCellSaveItems(groups, (group) => {
					return sendCellSaveBeacon({
						cells: group.items.map((item) => ({
							cellKey: item.cellKey,
							dataTableRowId: item.dataTableRowId,
							value: item.value,
						})),
						organizationId: group.organizationId || null,
						targetId: group.targetId || null,
						targetType: 'dataTable',
					});
				}) && allSent;
			}

			return allSent;
		},
		onFlush: async (items) => {
			const sheetItems = items.filter((item) => item.kind === 'SHEET');
			const dataTableItems = items.filter((item) => item.kind === 'DATA_TABLE');

			if (sheetItems.length) {
				await flushSheetItems(sheetItems);
			}
			if (dataTableItems.length) {
				await flushDataTableItems(dataTableItems);
			}
		},
	});

	useEffect(() => {
		sheetVersionsRef.current = {};
		dataTableVersionsRef.current = {};
	}, [params.sheetId]);

	/*
	 * Queue Sheet-owned cell edits with their instant previews.
	 */
	const saveCells = useCallback((entries: SheetCellSaveEntry[]) => {
		if (!entries.length) {
			return;
		}

		const revertKeys: string[] = [];
		const pendingByCoord = new Map<string, SheetPendingCellEdit>();

		entries.forEach(({ input, previewCell }) => {
			const coordKey = getSheetCellEditInputCoordKey(input);
			const saveVersion = (sheetVersionsRef.current[coordKey] || 0) + 1;
			sheetVersionsRef.current[coordKey] = saveVersion;

			if (sheetCellEditInputMatchesCell(input, params.baseCellsByCoord.get(coordKey))) {
				// The edit restores the confirmed value: no preview needed
				revertKeys.push(coordKey);
			} else {
				pendingByCoord.set(coordKey, {
					input,
					previewCell,
					saveVersion,
					state: 'pending',
				});
			}

			queue({
				coordKey,
				input,
				kind: 'SHEET',
				saveVersion,
			});
		});

		params.setPendingCellEdits((currentState) => {
			let next = removePendingCellEditKeys(currentState, revertKeys);
			if (pendingByCoord.size) {
				next = next === currentState ? new Map(currentState) : next;
				pendingByCoord.forEach((pendingEdit, coordKey) => {
					next.set(coordKey, pendingEdit);
				});
			}
			return next;
		});
	}, [params.baseCellsByCoord, params.setPendingCellEdits, queue]);

	/*
	 * Queue DataTable source cell edits with previews fanned out to every
	 * region coordinate mirroring the source cell.
	 */
	const saveDataTableCellEdits = useCallback((edits: SheetDataTableCellSaveEdit[]) => {
		if (!edits.length) {
			return;
		}

		const pendingByCoord = new Map<string, SheetPendingCellEdit>();

		edits.forEach((edit) => {
			const sourceKey = getSheetDataTableSourceCellKey(edit.dataTableId, edit.dataTableRowId, edit.cellKey);
			const saveVersion = (dataTableVersionsRef.current[sourceKey] || 0) + 1;
			dataTableVersionsRef.current[sourceKey] = saveVersion;

			edit.previews.forEach(({ coordKey, previewCell }) => {
				const [rowPart, columnPart] = coordKey.split(':');

				pendingByCoord.set(coordKey, {
					dataTableTarget: {
						cellKey: edit.cellKey,
						dataTableId: edit.dataTableId,
						dataTableRowId: edit.dataTableRowId,
						organizationId: edit.organizationId === null || edit.organizationId === undefined
							? null
							: String(edit.organizationId),
						value: edit.value,
					},
					input: {
						cell: {
							columnIndex: Math.floor(Number(columnPart)),
							rowIndex: Math.floor(Number(rowPart)),
						},
					},
					previewCell,
					saveVersion,
					state: 'pending',
				});
			});

			queue({
				cellKey: edit.cellKey,
				coordKeys: edit.previews.map((preview) => preview.coordKey),
				dataTableId: edit.dataTableId,
				dataTableRowId: edit.dataTableRowId,
				kind: 'DATA_TABLE',
				organizationId: edit.organizationId,
				saveVersion,
				sourceKey,
				target: edit.target,
				value: edit.value,
			});
		});

		if (pendingByCoord.size) {
			params.setPendingCellEdits((currentState) => {
				const next = new Map(currentState);
				pendingByCoord.forEach((pendingEdit, coordKey) => {
					next.set(coordKey, pendingEdit);
				});
				return next;
			});
		}
	}, [params.setPendingCellEdits, queue]);

	/*
	 * Drop every pending preview tied to one DataTable source cell.
	 */
	const clearDataTablePendingEdits = useCallback((sourceKey: string) => {
		params.setPendingCellEdits((currentState) => {
			let next = currentState;
			let changed = false;

			currentState.forEach((pendingEdit, coordKey) => {
				if (getSheetPendingEditDataTableSourceKey(pendingEdit) === sourceKey) {
					if (!changed) {
						next = new Map(currentState);
						changed = true;
					}
					next.delete(coordKey);
				}
			});

			return next;
		});
	}, [params.setPendingCellEdits]);

	return {
		clearDataTablePendingEdits,
		saveCells,
		saveDataTableCellEdits,
	};
}
