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
import {
	clearSheetPendingEdits,
	markSheetPendingEditsSent,
	persistSheetPendingEdit,
	readSheetPendingEdits,
} from './sheet-pending-persistence.ts';
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

/* Queue-time persistence stamp: identifies the persisted twin of one queued
 * edit (seq-gated clears) and the sheet the edit was queued for, so flush
 * callbacks running after a sheetId switch or unmount target the right sheet */
type SheetCellSavePersistRef = {
	organizationId: string;
	seq: number;
	sheetId: string;
};

type SheetCellSaveItem =
	| {
		kind: 'SHEET';
		coordKey: string;
		input: SheetCellEditInput;
		persist: SheetCellSavePersistRef;
		saveVersion: number;
	}
	| {
		kind: 'DATA_TABLE';
		cellKey: string;
		coordKeys: string[];
		dataTableId: string;
		dataTableRowId: string;
		organizationId: string | number | bigint | null;
		persist: { seqByCoordKey: Record<string, number>; sheetId: string };
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
		// A flush can resolve after a sheetId switch in the same mount, so
		// items group by the sheet they were queued for and never save to the
		// wrong sheet
		const itemGroupsBySheetId = new Map<string, typeof items>();
		items.forEach((item) => {
			const group = itemGroupsBySheetId.get(item.persist.sheetId);
			if (group) {
				group.push(item);
			} else {
				itemGroupsBySheetId.set(item.persist.sheetId, [item]);
			}
		});

		for (const [targetSheetId, sheetItems] of itemGroupsBySheetId) {
			// The confirmed base only describes the mounted sheet, so synced
			// skips and mutation filtering are only valid for its own items
			const isCurrentSheet = targetSheetId === params.sheetId;

			// Edits whose value already matches the confirmed base need no mutation
			const syncedItems = isCurrentSheet
				? sheetItems.filter((item) => {
					return sheetVersionsRef.current[item.coordKey] === item.saveVersion &&
						sheetCellEditInputMatchesCell(item.input, params.baseCellsByCoord.get(item.coordKey));
				})
				: [];

			if (syncedItems.length) {
				params.setPendingCellEdits((currentState) => {
					return removePendingCellEditKeys(currentState, syncedItems.map((item) => item.coordKey));
				});
				clearSheetPendingEdits(targetSheetId, syncedItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })));
			}

			const mutationItems = sheetItems.filter((item) => !syncedItems.includes(item));
			const mutationCells = isCurrentSheet
				? getSheetCellEditInputsForMutation(
					mutationItems.map((item) => item.input),
					params.baseCellsByCoord,
				)
				: mutationItems.map((item) => item.input);
			const mutationCellSet = new Set(mutationCells);
			const sendingItems = mutationItems.filter((item) => mutationCellSet.has(item.input));
			const filteredItems = mutationItems.filter((item) => !mutationCellSet.has(item.input));

			// Items dropped by the mutation filter already match the confirmed
			// base: their persisted twins are stale
			if (filteredItems.length) {
				clearSheetPendingEdits(targetSheetId, filteredItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })));
			}

			if (!mutationCells.length) {
				continue;
			}

			// The mutation now carries these edits; a post-reload rehydrate
			// must not re-send them
			markSheetPendingEditsSent(targetSheetId, sendingItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })));

			const result = await params.editSheetCells({
				variables: {
					cells: mutationCells,
					organizationId: sendingItems[0]?.persist.organizationId || params.organizationId,
					sheetId: targetSheetId,
				},
			}) as EditSheetCellsResult | undefined;
			const editResult = result?.editSheetCells || null;
			const savedCells = (editResult?.savedCells || []) as SheetCellGQL[];
			const recalculatedCells = (editResult?.recalculatedCells || []) as SheetCellGQL[];
			const savedCellsByCoord = getSheetCanvasCellsByCoord(savedCells);

			// The server committed the saved coordinates: any later read returns
			// post-commit data, so their persisted twins are no longer needed
			clearSheetPendingEdits(
				targetSheetId,
				sendingItems
					.filter((item) => savedCellsByCoord.has(item.coordKey))
					.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })),
			);

			if (!isCurrentSheet) {
				continue;
			}

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
				const removableKeys = sendingItems
					.filter((item) => {
						return savedCellsByCoord.has(item.coordKey) &&
							sheetVersionsRef.current[item.coordKey] === item.saveVersion &&
							currentState.get(item.coordKey)?.saveVersion === item.saveVersion;
					})
					.map((item) => item.coordKey);

				return removePendingCellEditKeys(currentState, removableKeys);
			});
		}
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
			// Synced edits also drop their persisted twins
			syncedItems.forEach((item) => {
				clearSheetPendingEdits(item.persist.sheetId, item.coordKeys.map((coordKey) => ({
					coordKey,
					seq: item.persist.seqByCoordKey[coordKey] ?? 0,
				})));
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

			// The mutation now carries these edits; a post-reload rehydrate
			// must not re-send them
			group.items.forEach((item) => {
				markSheetPendingEditsSent(item.persist.sheetId, item.coordKeys.map((coordKey) => ({
					coordKey,
					seq: item.persist.seqByCoordKey[coordKey] ?? 0,
				})));
			});

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
			// Failed edits drop their persisted twins (seq-gated, so a stale
			// post-unmount failure cannot clear a re-persisted newer edit)
			items.forEach((item) => {
				if (item.kind === 'SHEET') {
					clearSheetPendingEdits(item.persist.sheetId, [{ coordKey: item.coordKey, seq: item.persist.seq }]);
				} else {
					clearSheetPendingEdits(item.persist.sheetId, item.coordKeys.map((coordKey) => ({
						coordKey,
						seq: item.persist.seqByCoordKey[coordKey] ?? 0,
					})));
				}
			});

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

			// Sheet items group by their queue-time sheet so a beacon fired
			// after a sheetId switch still targets the right sheet
			const sheetGroups = groupCellSaveItemsByTarget(sheetItems, (item) => ({
				organizationId: item.persist.organizationId,
				targetId: item.persist.sheetId,
			}));
			allSent = sendGroupedCellSaveItems(sheetGroups, (group) => {
				const targetSheetId = String(group.targetId || '');
				// The confirmed base only describes the mounted sheet
				const mutationCells = targetSheetId === params.sheetId
					? getSheetCellEditInputsForMutation(
						group.items.map((item) => item.input),
						params.baseCellsByCoord,
					)
					: group.items.map((item) => item.input);
				const mutationCellSet = new Set(mutationCells);
				const filteredItems = group.items.filter((item) => !mutationCellSet.has(item.input));

				// Items dropped by the mutation filter already match the
				// confirmed base: their persisted twins are stale
				if (filteredItems.length) {
					clearSheetPendingEdits(targetSheetId, filteredItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })));
				}

				if (!mutationCells.length) {
					return true;
				}

				const sent = sendCellSaveBeacon({
					cells: mutationCells,
					organizationId: group.organizationId || null,
					targetId: group.targetId || null,
					targetType: 'sheet',
				});

				// An accepted beacon carries the edits; a post-reload rehydrate
				// must not re-send them
				if (sent) {
					markSheetPendingEditsSent(
						targetSheetId,
						group.items
							.filter((item) => mutationCellSet.has(item.input))
							.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })),
					);
				}

				return sent;
			}) && allSent;

			const dataTableMutationItems = dataTableItems.filter((item) => {
				return getSheetDataTableSourceCellCurrentValue(
					item.sourceKey,
					params.sourceCellsByTargetKey,
					params.designCellsByDataTableId,
					item.target.lookup.cell,
					item.target.lookup.designCell,
				) !== item.value;
			});

			// Synced DataTable edits drop their persisted twins
			dataTableItems
				.filter((item) => !dataTableMutationItems.includes(item))
				.forEach((item) => {
					clearSheetPendingEdits(item.persist.sheetId, item.coordKeys.map((coordKey) => ({
						coordKey,
						seq: item.persist.seqByCoordKey[coordKey] ?? 0,
					})));
				});

			if (dataTableMutationItems.length) {
				const groups = groupCellSaveItemsByTarget(dataTableMutationItems, (item) => ({
					organizationId: item.organizationId,
					targetId: item.dataTableId,
				}));

				allSent = sendGroupedCellSaveItems(groups, (group) => {
					const sent = sendCellSaveBeacon({
						cells: group.items.map((item) => ({
							cellKey: item.cellKey,
							dataTableRowId: item.dataTableRowId,
							value: item.value,
						})),
						organizationId: group.organizationId || null,
						targetId: group.targetId || null,
						targetType: 'dataTable',
					});

					// An accepted beacon carries the edits; a post-reload
					// rehydrate must not re-send them
					if (sent) {
						group.items.forEach((item) => {
							markSheetPendingEditsSent(item.persist.sheetId, item.coordKeys.map((coordKey) => ({
								coordKey,
								seq: item.persist.seqByCoordKey[coordKey] ?? 0,
							})));
						});
					}

					return sent;
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

			// Seq 0 marks items with no persisted twin; seq-gated clears skip it
			let persistSeq = 0;

			if (sheetCellEditInputMatchesCell(input, params.baseCellsByCoord.get(coordKey))) {
				// The edit restores the confirmed value: no preview needed
				revertKeys.push(coordKey);
				clearSheetPendingEdits(params.sheetId, [{ coordKey }]);
			} else {
				const baseRevision = Number(params.baseCellsByCoord.get(coordKey)?.revision);

				// The persisted twin lets a remounting Sheet rehydrate this
				// preview while the flushed save is still in flight
				persistSeq = persistSheetPendingEdit(params.sheetId, coordKey, {
					baseRevision: Number.isFinite(baseRevision) ? baseRevision : null,
					editedAt: Date.now(),
					flushState: 'queued',
					input,
					previewCell,
				});

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
				persist: {
					organizationId: params.organizationId,
					seq: persistSeq,
					sheetId: params.sheetId,
				},
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
	}, [params.baseCellsByCoord, params.organizationId, params.setPendingCellEdits, params.sheetId, queue]);

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

			const dataTableTarget = {
				cellKey: edit.cellKey,
				dataTableId: edit.dataTableId,
				dataTableRowId: edit.dataTableRowId,
				organizationId: edit.organizationId === null || edit.organizationId === undefined
					? null
					: String(edit.organizationId),
				value: edit.value,
			};
			const seqByCoordKey: Record<string, number> = {};

			edit.previews.forEach(({ coordKey, previewCell }) => {
				const [rowPart, columnPart] = coordKey.split(':');
				const input = {
					cell: {
						columnIndex: Math.floor(Number(columnPart)),
						rowIndex: Math.floor(Number(rowPart)),
					},
				};
				const baseRevision = Number(params.baseCellsByCoord.get(coordKey)?.revision);

				// The persisted twin lets a remounting Sheet rehydrate this
				// preview while the flushed save is still in flight
				seqByCoordKey[coordKey] = persistSheetPendingEdit(params.sheetId, coordKey, {
					baseRevision: Number.isFinite(baseRevision) ? baseRevision : null,
					dataTableTarget,
					editedAt: Date.now(),
					flushState: 'queued',
					input,
					previewCell,
				});

				pendingByCoord.set(coordKey, {
					dataTableTarget,
					input,
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
				persist: {
					seqByCoordKey,
					sheetId: params.sheetId,
				},
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
	}, [params.baseCellsByCoord, params.setPendingCellEdits, params.sheetId, queue]);

	/*
	 * Drop every pending preview tied to one DataTable source cell.
	 */
	const clearDataTablePendingEdits = useCallback((sourceKey: string) => {
		// Drop the persisted twins first so a reload cannot resurrect them
		const persistedRefs: Array<{ coordKey: string }> = [];
		readSheetPendingEdits(params.sheetId).forEach((entry, coordKey) => {
			const target = entry.dataTableTarget;
			if (
				target &&
				getSheetDataTableSourceCellKey(target.dataTableId, target.dataTableRowId, target.cellKey) === sourceKey
			) {
				persistedRefs.push({ coordKey });
			}
		});
		if (persistedRefs.length) {
			clearSheetPendingEdits(params.sheetId, persistedRefs);
		}

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
	}, [params.setPendingCellEdits, params.sheetId]);

	return {
		clearDataTablePendingEdits,
		saveCells,
		saveDataTableCellEdits,
	};
}
