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
	getSheetCellEditInputForMutationPayload,
	getSheetCellEditInputsForMutation,
	sheetCellEditInputMatchesCell,
	type SheetCellEditInput,
	type SheetDataTableCellEditTarget,
} from './sheet-history.ts';
import {
	clearSheetPendingEdits,
	markSheetPendingEditsSent,
	persistSheetPendingEditsBatch,
	readSheetPendingEdits,
	type PersistedSheetPendingEntry,
} from './sheet-pending-persistence.ts';
import { getSheetEditClientId } from './sheet-edit-identity.ts';
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

export type EditSheetCellsResult = {
	/* The GraphQL client resolves request failures instead of rejecting:
	 * doMutate returns `{error}` for network/server errors and `{aborted}`
	 * for aborted requests, so both surface as plain result fields */
	aborted?: boolean | null;
	error?: unknown;
	editSheetCells?: {
		savedCells?: SheetCellGQL[] | null;
		recalculatedCells?: SheetCellGQL[] | null;
		cycleCellIds?: string[] | null;
		cellsRevision?: number | null;
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
			clientId?: string | null;
			organizationId: string;
			sheetId: string;
		};
	}) => Promise<unknown> | unknown;
	/* Reports the sheet's cells revision returned by a successful save */
	onCellsRevision?: (cellsRevision: number) => void;
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
 * Return whether one editSheetCells request failed. The GraphQL client
 * resolves failures instead of rejecting them (see EditSheetCellsResult), so
 * a failure surfaces as an error/aborted field or a missing payload.
 */
export function editSheetCellsResultIsFailure(result: EditSheetCellsResult | null | undefined) {
	return Boolean(result?.error) || Boolean(result?.aborted) || !result?.editSheetCells;
}

/*
 * Return the sent save items the server did not commit: every item when the
 * request itself failed, otherwise the items whose coordinate is silently
 * missing from savedCells (e.g. a server-side batch-limit drop).
 */
export function getFailedSheetCellSaveItems<T extends { coordKey: string }>(
	sendingItems: T[],
	savedCellsByCoord: Map<string, unknown>,
	requestFailed: boolean,
) {
	if (requestFailed) {
		return sendingItems;
	}

	return sendingItems.filter((item) => !savedCellsByCoord.has(item.coordKey));
}

/*
 * Return the freshest confirmed cell known for one coordinate: the higher-
 * revision pick between the render-time base cell and the most recent
 * mutation result for the coordinate. The render base can lag a just-saved
 * cell (a flush re-run from the batch's finally block closes over a
 * pre-render snapshot), so synced-edit skips and payload strips compare
 * against this pick instead of the base alone.
 */
export function getSheetFlushBaseCell(
	baseCell?: SheetCellGQL | null,
	recentSavedCell?: SheetCellGQL | null,
): SheetCellGQL | undefined {
	if (!baseCell || !recentSavedCell) {
		return baseCell || recentSavedCell || undefined;
	}

	const baseRevision = Number(baseCell.revision);
	const recentRevision = Number(recentSavedCell.revision);

	// Equal or unreadable revisions defer to the render base
	if (Number.isFinite(baseRevision) && Number.isFinite(recentRevision)) {
		return recentRevision > baseRevision ? recentSavedCell : baseCell;
	}

	return Number.isFinite(recentRevision) ? recentSavedCell : baseCell;
}

/*
 * Return the base map with recent mutation results overlaid per coordinate
 * (higher revision wins). Kept cheap: only the recent-save entries are
 * touched, and the base map reference is reused when there are none.
 */
export function getSheetFlushBaseCellsByCoord(
	baseCellsByCoord: Map<string, SheetCellGQL>,
	recentSavedCellsByCoord: Map<string, SheetCellGQL>,
) {
	if (!recentSavedCellsByCoord.size) {
		return baseCellsByCoord;
	}

	const merged = new Map(baseCellsByCoord);
	recentSavedCellsByCoord.forEach((savedCell, coordKey) => {
		const flushBaseCell = getSheetFlushBaseCell(merged.get(coordKey), savedCell);
		if (flushBaseCell) {
			merged.set(coordKey, flushBaseCell);
		}
	});

	return merged;
}

/*
 * Serialize one edit payload for exact comparison; bigint values (e.g.
 * regionId) stringify so JSON.stringify does not throw.
 */
function stringifySheetEditPayload(value: unknown) {
	return JSON.stringify(value, (_key, jsonValue) => typeof jsonValue === 'bigint' ? String(jsonValue) : jsonValue);
}

/*
 * Return whether one persisted pending entry still mirrors the in-memory
 * pending edit a reconciliation decision was made for. A different payload
 * means the persisted twin belongs to a newer same-coordinate edit queued
 * after the decision's snapshot, and must survive a twin clear.
 */
export function sheetPersistedEntryMatchesPendingEdit(
	persistedEntry: Pick<PersistedSheetPendingEntry, 'dataTableTarget' | 'input'>,
	pendingEdit: Pick<SheetPendingCellEdit, 'dataTableTarget' | 'input'>,
) {
	return stringifySheetEditPayload(persistedEntry.input) === stringifySheetEditPayload(pendingEdit.input) &&
		stringifySheetEditPayload(persistedEntry.dataTableTarget ?? null) ===
			stringifySheetEditPayload(pendingEdit.dataTableTarget ?? null);
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
	// Revision-gated cache of mutation results for the mounted sheet: the
	// render base can lag a just-saved cell (stale closure on a synchronous
	// flush re-run), so flush-time comparisons fold this cache in
	const recentSavedCellsByCoordRef = useRef(new Map<string, SheetCellGQL>());
	// Coordinates with a mutation currently in flight for the mounted sheet;
	// synced-edit drops skip them because the in-flight save may be about to
	// overwrite the value a newer edit restores
	const inFlightCoordKeysRef = useRef(new Set<string>());

	/*
	 * Return the freshest confirmed cell known for one mounted-sheet
	 * coordinate (render base vs recent mutation results).
	 */
	const getFlushBaseCell = useCallback((coordKey: string) => {
		return getSheetFlushBaseCell(
			params.baseCellsByCoord.get(coordKey),
			recentSavedCellsByCoordRef.current.get(coordKey),
		);
	}, [params.baseCellsByCoord]);

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

			// Edits whose value already matches the freshest confirmed data
			// (render base or a newer mutation result) need no mutation
			const syncedItems = isCurrentSheet
				? sheetItems.filter((item) => {
					return sheetVersionsRef.current[item.coordKey] === item.saveVersion &&
						sheetCellEditInputMatchesCell(item.input, getFlushBaseCell(item.coordKey));
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
					getSheetFlushBaseCellsByCoord(params.baseCellsByCoord, recentSavedCellsByCoordRef.current),
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
			// must not re-send them. Marking 'sent' before the await is safe
			// only because the post-await reconciliation below clears the twin
			// of every item the server did not commit, so a failed edit cannot
			// stay parked in the 'sent' state forever
			markSheetPendingEditsSent(targetSheetId, sendingItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })));

			// Value fields that merely re-send the confirmed value drop out of
			// the payload so the server sees presentation-only edits as such
			const mutationPayloadCells = isCurrentSheet
				? mutationCells.map((input) => getSheetCellEditInputForMutationPayload(
					input,
					getFlushBaseCell(getSheetCellEditInputCoordKey(input)),
				))
				: mutationCells;

			// In-flight coordinates guard the synced-drop in saveCells and the
			// beacon filter while this mutation is on the wire
			if (isCurrentSheet) {
				sendingItems.forEach((item) => inFlightCoordKeysRef.current.add(item.coordKey));
			}

			try {
				const result = await params.editSheetCells({
					variables: {
						cells: mutationPayloadCells,
						// The server echoes the client id on realtime payloads so
						// this client can skip its own echoes
						clientId: getSheetEditClientId(),
						organizationId: sendingItems[0]?.persist.organizationId || params.organizationId,
						sheetId: targetSheetId,
					},
				}) as EditSheetCellsResult | undefined;
				const requestFailed = editSheetCellsResultIsFailure(result);
				const editResult = result?.editSheetCells || null;
				const savedCells = (editResult?.savedCells || []) as SheetCellGQL[];
				const recalculatedCells = (editResult?.recalculatedCells || []) as SheetCellGQL[];
				const savedCellsByCoord = getSheetCanvasCellsByCoord(savedCells);

				// The acting client learns the new sheet revision from the
				// response, so its own (or a dropped) echo never reads as a gap
				const responseCellsRevision = Math.floor(Number(editResult?.cellsRevision || 0));
				if (isCurrentSheet && !requestFailed && responseCellsRevision > 0) {
					params.onCellsRevision?.(responseCellsRevision);
				}

				// A failed request fails every sent item; a "successful" result
				// can still silently omit coordinates from savedCells (e.g. a
				// server-side batch-limit drop), which fails those items alone
				const failedItems = getFailedSheetCellSaveItems(sendingItems, savedCellsByCoord, requestFailed);
				const failedItemSet = new Set(failedItems);
				const savedItems = sendingItems.filter((item) => !failedItemSet.has(item));

				// The server committed the saved coordinates: any later read returns
				// post-commit data, so their persisted twins are no longer needed
				if (savedItems.length) {
					clearSheetPendingEdits(
						targetSheetId,
						savedItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })),
					);
				}

				// Failed edits also drop their persisted twins (seq-gated, so a
				// newer re-persisted edit at the same coordinate survives); the
				// mutation never throws, so the batch onError cannot do this
				if (failedItems.length) {
					clearSheetPendingEdits(
						targetSheetId,
						failedItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })),
					);
				}

				if (!isCurrentSheet) {
					continue;
				}

				// Saved cells and the server-recalculated cascade land in the confirmed
				// store immediately; the realtime echo that follows is a revision-gated
				// no-op. The recent-saves cache mirrors the merge so flush-time
				// comparisons stay fresh even on a pre-render re-run
				if (!requestFailed && (savedCells.length || recalculatedCells.length)) {
					recentSavedCellsByCoordRef.current = mergeConfirmedSheetCells(
						recentSavedCellsByCoordRef.current,
						[...savedCells, ...recalculatedCells],
					);
					params.setConfirmedCellsByCoord((currentState) => {
						return mergeConfirmedSheetCells(currentState, [...savedCells, ...recalculatedCells]);
					});
				}

				if (editResult?.cycleCellIds?.length) {
					params.onCycleCells?.(editResult.cycleCellIds.map(String));
				}

				// The confirmed cells now carry the saved values: drop the previews
				// whose save version is still current (newer edits keep their preview)
				if (savedItems.length) {
					params.setPendingCellEdits((currentState) => {
						const removableKeys = savedItems
							.filter((item) => {
								return sheetVersionsRef.current[item.coordKey] === item.saveVersion &&
									currentState.get(item.coordKey)?.saveVersion === item.saveVersion;
							})
							.map((item) => item.coordKey);

						return removePendingCellEditKeys(currentState, removableKeys);
					});
				}

				// Failed previews fall back to the confirmed value (double-gated
				// like the success path, so a newer edit keeps its preview) and
				// relay the clears so peers drop their mirrored previews too
				if (failedItems.length) {
					const clearedCoordKeys: string[] = [];

					params.setPendingCellEdits((currentState) => {
						let next = currentState;
						failedItems.forEach((item) => {
							if (
								sheetVersionsRef.current[item.coordKey] === item.saveVersion &&
								currentState.get(item.coordKey)?.saveVersion === item.saveVersion
							) {
								next = removePendingCellEditKeys(next, [item.coordKey], item.saveVersion);
								clearedCoordKeys.push(item.coordKey);
							}
						});
						return next;
					});

					if (clearedCoordKeys.length) {
						params.onPendingCoordsCleared?.(clearedCoordKeys);
					}
				}
			} finally {
				// In-flight coordinates lift once reconciliation completed (or
				// the mutation threw and the batch onError takes over)
				if (isCurrentSheet) {
					sendingItems.forEach((item) => inFlightCoordKeysRef.current.delete(item.coordKey));
				}
			}
		}
	}, [getFlushBaseCell, params.baseCellsByCoord, params.editSheetCells, params.onCellsRevision, params.onCycleCells, params.onPendingCoordsCleared, params.organizationId, params.setConfirmedCellsByCoord, params.setPendingCellEdits, params.sheetId]);

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
				// The confirmed base only describes the mounted sheet, and the
				// flush base folds in recent mutation results. Coordinates with
				// a mutation still in flight always send: the in-flight save
				// may be about to overwrite the value this edit restores
				const isCurrentSheet = targetSheetId === params.sheetId;
				const sendableItems = isCurrentSheet
					? group.items.filter((item) => {
						return inFlightCoordKeysRef.current.has(item.coordKey) ||
							!sheetCellEditInputMatchesCell(item.input, getFlushBaseCell(item.coordKey));
					})
					: group.items;
				const sendableItemSet = new Set(sendableItems);
				const filteredItems = group.items.filter((item) => !sendableItemSet.has(item));

				// Items dropped by the mutation filter already match the
				// confirmed base: their persisted twins are stale
				if (filteredItems.length) {
					clearSheetPendingEdits(targetSheetId, filteredItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })));
				}

				if (!sendableItems.length) {
					return true;
				}

				// Value fields that merely re-send the confirmed value drop out
				// of the payload so the server sees presentation-only edits as
				// such; in-flight coordinates keep their full payload because
				// the value they "re-send" is exactly what the in-flight save
				// may be overwriting
				const beaconCells = sendableItems.map((item) => {
					if (!isCurrentSheet || inFlightCoordKeysRef.current.has(item.coordKey)) {
						return item.input;
					}

					return getSheetCellEditInputForMutationPayload(item.input, getFlushBaseCell(item.coordKey));
				});

				const sent = sendCellSaveBeacon({
					cells: beaconCells,
					organizationId: group.organizationId || null,
					targetId: group.targetId || null,
					targetType: 'sheet',
				});

				// An accepted beacon carries the edits; a post-reload rehydrate
				// must not re-send them
				if (sent) {
					markSheetPendingEditsSent(
						targetSheetId,
						sendableItems.map((item) => ({ coordKey: item.coordKey, seq: item.persist.seq })),
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
		// Both caches describe the mounted sheet's coordinates only
		recentSavedCellsByCoordRef.current = new Map();
		inFlightCoordKeysRef.current = new Set();
	}, [params.sheetId]);

	/*
	 * Queue Sheet-owned cell edits with their instant previews.
	 */
	const saveCells = useCallback((entries: SheetCellSaveEntry[]) => {
		if (!entries.length) {
			return;
		}

		const revertKeys: string[] = [];
		const revertClearRefs: Array<{ coordKey: string }> = [];
		const pendingByCoord = new Map<string, SheetPendingCellEdit>();
		// Persistence batches into ONE storage write: large entry sets (whole
		// line formats, big pastes) must not re-serialize the map per cell
		const persistEntries: Array<{ coordKey: string; entry: Omit<PersistedSheetPendingEntry, 'seq'> }> = [];
		const persistQueueIndexes: number[] = [];
		const queueItems: Array<Extract<SheetCellSaveItem, { kind: 'SHEET' }>> = [];

		entries.forEach(({ input, previewCell }) => {
			const coordKey = getSheetCellEditInputCoordKey(input);
			const saveVersion = (sheetVersionsRef.current[coordKey] || 0) + 1;
			sheetVersionsRef.current[coordKey] = saveVersion;

			// Reverts compare against the freshest confirmed data (render base
			// or a newer mutation result), not a stale render snapshot
			if (sheetCellEditInputMatchesCell(input, getFlushBaseCell(coordKey))) {
				// The edit restores the confirmed value: no preview needed; the
				// item still queues below so the flush re-checks it
				revertKeys.push(coordKey);

				if (!inFlightCoordKeysRef.current.has(coordKey)) {
					revertClearRefs.push({ coordKey });
				}
				// An in-flight same-coordinate mutation may be about to
				// overwrite the value this revert restores, so the revert MUST
				// reach the server; the in-flight edit's persisted twin also
				// stays untouched for its own reconciliation to settle
			} else {
				const baseRevision = Number(getFlushBaseCell(coordKey)?.revision);

				// The persisted twin lets a remounting Sheet rehydrate this
				// preview while the flushed save is still in flight
				persistEntries.push({
					coordKey,
					entry: {
						baseRevision: Number.isFinite(baseRevision) ? baseRevision : null,
						editedAt: Date.now(),
						flushState: 'queued',
						input,
						previewCell,
					},
				});
				persistQueueIndexes.push(queueItems.length);

				pendingByCoord.set(coordKey, {
					input,
					previewCell,
					saveVersion,
					state: 'pending',
				});
			}

			queueItems.push({
				coordKey,
				input,
				kind: 'SHEET',
				persist: {
					organizationId: params.organizationId,
					// Seq 0 marks items with no persisted twin; seq-gated clears
					// skip it. Persisted items get their seq stamped below.
					seq: 0,
					sheetId: params.sheetId,
				},
				saveVersion,
			});
		});

		const persistSeqs = persistSheetPendingEditsBatch(params.sheetId, persistEntries);
		persistQueueIndexes.forEach((queueIndex, position) => {
			queueItems[queueIndex].persist.seq = persistSeqs[position] ?? 0;
		});

		if (revertClearRefs.length) {
			clearSheetPendingEdits(params.sheetId, revertClearRefs);
		}

		queueItems.forEach((item) => {
			queue(item);
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
	}, [getFlushBaseCell, params.organizationId, params.setPendingCellEdits, params.sheetId, queue]);

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
			// Twin persistence batches into one storage write per source edit
			const persistEntries: Array<{ coordKey: string; entry: Omit<PersistedSheetPendingEntry, 'seq'> }> = [];

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
				persistEntries.push({
					coordKey,
					entry: {
						baseRevision: Number.isFinite(baseRevision) ? baseRevision : null,
						dataTableTarget,
						editedAt: Date.now(),
						flushState: 'queued',
						input,
						previewCell,
					},
				});

				pendingByCoord.set(coordKey, {
					dataTableTarget,
					input,
					previewCell,
					saveVersion,
					state: 'pending',
				});
			});

			const persistSeqs = persistSheetPendingEditsBatch(params.sheetId, persistEntries);
			persistEntries.forEach(({ coordKey }, position) => {
				seqByCoordKey[coordKey] = persistSeqs[position] ?? 0;
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
