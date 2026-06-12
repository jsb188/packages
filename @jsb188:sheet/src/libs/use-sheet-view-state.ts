import { loadFragment } from '@jsb188/graphql/cache';
import { observeReactiveFragments } from '@jsb188/graphql/client';
import { getSheetViewFragmentKey, useSheetView } from '@jsb188/graphql/hooks/use-sheet-qry';
import type {
	SheetCellGQL,
	SheetDesignObj,
	SheetRangeGQL,
	SheetRegionGQL,
	SheetViewGQL,
} from '@jsb188/mday/types/sheet.d.ts';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	mergeConfirmedSheetCells,
	mergeRefetchedSheetCells,
	type SheetDeletedCellCoord,
} from './sheet-cell-store.ts';
import { getSheetEditClientId } from './sheet-edit-identity.ts';
import type { SheetStateAtoms } from './sheet-state.ts';
import { getSheetCanvasCellsByCoord } from './sheet-utils.ts';

export type SheetViewStructureOpPatch = {
	opId: string | null;
	operation: string;
	index: number;
	at?: number | null;
};

type UseSheetViewStateParams = {
	/* Cells confirmed by a realtime delta; used to clear remote previews */
	onConfirmedCellsMerged?: (cells: SheetCellGQL[], deletedCoords: SheetDeletedCellCoord[]) => void;
	/* Structure-operation patch backstop for receivers that missed the relay */
	onRemoteStructureOp?: (structureOp: SheetViewStructureOpPatch) => void;
	organizationId: string;
	previewAuthToken?: string | null;
	serverDesign: SheetDesignObj;
	sheetId: string;
	/* Pause server merges while a structure edit is being reconciled */
	sheetStructureGridMergePaused: boolean;
	stateAtoms: SheetStateAtoms;
};

export type SetConfirmedSheetCells = (
	update:
		| Map<string, SheetCellGQL>
		| ((currentState: Map<string, SheetCellGQL>) => Map<string, SheetCellGQL>),
) => void;

/*
 * Own the full-sheet load and the confirmed layer of the Sheet cell store.
 *
 * The entire sheet is fetched once through sheetView (sheets are capped at
 * 1,000 design rows and the server caps region rows the same way), so
 * scrolling never touches the network: the canvas draws the visible range
 * from the in-memory confirmed map. Realtime $sheetViewFragment cell deltas
 * merge into the same map with revision gating, and sheet-scoped query resets
 * refetch the whole view.
 */
export function useSheetViewState(params: UseSheetViewStateParams) {
	const [confirmedCellsByCoord, setConfirmedCellsByCoordValue] = useAtom(
		params.stateAtoms.confirmedCellsByCoordAtom,
	);
	const fullViewport = useMemo(() => {
		return {
			startRowIndex: 1,
			startColumnIndex: 1,
			rowCount: Math.max(1, params.serverDesign.grid.rowCount || 1),
			columnCount: Math.max(1, params.serverDesign.grid.columnCount || 1),
		};
	}, [params.serverDesign.grid.columnCount, params.serverDesign.grid.rowCount]);
	const {
		loading,
		refetch,
		sheetView,
	} = useSheetView(params.sheetId, params.organizationId, fullViewport, {
		authToken: params.previewAuthToken || null,
	});
	const typedSheetView = sheetView as SheetViewGQL | null;
	const appliedSheetViewRef = useRef<SheetViewGQL | null>(null);
	const confirmedSheetIdRef = useRef(params.sheetId);
	// Highest cells revision this client has seen (snapshot, realtime payload,
	// or own mutation response); a realtime payload arriving more than one
	// revision ahead means at least one emission was lost — refetch to heal
	const lastCellsRevisionRef = useRef(0);
	const gapRefetchRequestedRef = useRef(false);
	const refetchRef = useRef(refetch);
	refetchRef.current = refetch;

	/*
	 * Record a cells revision learned outside the realtime pipe (the sheetView
	 * snapshot or a mutation response), so an echo never reads as a gap.
	 */
	const recordCellsRevision = useCallback((cellsRevision: number) => {
		const revision = Math.floor(Number(cellsRevision || 0));

		if (revision > lastCellsRevisionRef.current) {
			lastCellsRevisionRef.current = revision;
		}
	}, []);

	const setConfirmedCellsByCoord: SetConfirmedSheetCells = useCallback((update) => {
		setConfirmedCellsByCoordValue((currentState) => {
			return typeof update === 'function' ? update(currentState) : update;
		});
	}, [setConfirmedCellsByCoordValue]);

	// Reset the confirmed layer when the mounted sheet changes
	useEffect(() => {
		if (confirmedSheetIdRef.current === params.sheetId) {
			return;
		}

		confirmedSheetIdRef.current = params.sheetId;
		appliedSheetViewRef.current = null;
		lastCellsRevisionRef.current = 0;
		gapRefetchRequestedRef.current = false;
		setConfirmedCellsByCoordValue(new Map());
	}, [params.sheetId, setConfirmedCellsByCoordValue]);

	// A fresh sheetView result is the complete authoritative snapshot: replace
	// the confirmed layer wholesale (deletions included by construction). A
	// SAME-sheet refetch (e.g. one triggered by a design rowCount change) can
	// race recently saved cells, so it revision-gates per coordinate instead
	// of rolling them back to the older snapshot the server read
	useEffect(() => {
		if (
			!typedSheetView ||
			params.sheetStructureGridMergePaused ||
			appliedSheetViewRef.current === typedSheetView
		) {
			return;
		}

		const previousSheetView = appliedSheetViewRef.current;
		appliedSheetViewRef.current = typedSheetView;

		// The snapshot seeds (or catches up) the cells revision and settles any
		// pending gap-triggered refetch
		recordCellsRevision(Number(typedSheetView.cellsRevision || 0));
		gapRefetchRequestedRef.current = false;

		const incomingCellsByCoord = getSheetCanvasCellsByCoord(
			(typedSheetView.cells || []) as SheetCellGQL[],
		);

		// The sheet-switch reset effect nulls the applied ref, so a non-null
		// previous snapshot with the same sheet id marks a same-sheet refetch
		const isSameSheetRefetch = Boolean(
			previousSheetView &&
			String(previousSheetView.id || '') === String(typedSheetView.id || ''),
		);

		if (isSameSheetRefetch) {
			setConfirmedCellsByCoordValue((currentState) => {
				return mergeRefetchedSheetCells(currentState, incomingCellsByCoord);
			});
		} else {
			setConfirmedCellsByCoordValue(incomingCellsByCoord);
		}
	}, [params.sheetStructureGridMergePaused, recordCellsRevision, setConfirmedCellsByCoordValue, typedSheetView]);

	// Realtime: merge $sheetViewFragment patches into local state. Cell deltas
	// merge into the confirmed layer (revision-gated, so re-processing the
	// merged fragment cache is a no-op); ranges patches replace the range
	// list; structureOp patches dispatch to the idempotent shift handler.
	// Structure-paused windows skip CELL merging because local coordinates
	// have been shifted ahead of the server snapshot.
	const mergePausedRef = useRef(params.sheetStructureGridMergePaused);
	mergePausedRef.current = params.sheetStructureGridMergePaused;

	const [wsRanges, setWsRanges] = useState<SheetRangeGQL[] | null>(null);
	const [wsRegions, setWsRegions] = useState<SheetRegionGQL[] | null>(null);
	const lastRangesPatchRef = useRef<unknown>(null);
	const lastRegionsPatchRef = useRef<unknown>(null);
	const lastStructureOpRef = useRef<unknown>(null);
	const onConfirmedCellsMergedRef = useRef(params.onConfirmedCellsMerged);
	onConfirmedCellsMergedRef.current = params.onConfirmedCellsMerged;
	const onRemoteStructureOpRef = useRef(params.onRemoteStructureOp);
	onRemoteStructureOpRef.current = params.onRemoteStructureOp;

	useEffect(() => {
		setWsRanges(null);
		setWsRegions(null);
		lastRangesPatchRef.current = null;
		lastRegionsPatchRef.current = null;
		lastStructureOpRef.current = null;
	}, [params.sheetId]);

	useEffect(() => {
		if (!params.sheetId) {
			return;
		}

		const fragmentKey = getSheetViewFragmentKey(params.sheetId);

		return observeReactiveFragments([fragmentKey], () => {
			const fragment = loadFragment(fragmentKey) as {
				cellsDelta?: SheetCellGQL[] | null;
				cellsRevision?: number | null;
				deletedCellCoords?: SheetDeletedCellCoord[] | null;
				originClientId?: string | null;
				ranges?: SheetRangeGQL[] | null;
				regions?: SheetRegionGQL[] | null;
				structureOp?: SheetViewStructureOpPatch | null;
			} | null;
			if (!fragment) {
				return;
			}

			// Gap detection: every server-side cell change bumps the sheet's
			// cells revision and every cells payload carries it (chunks of one
			// change share a value). A payload more than one revision ahead
			// means an emission was silently lost — refetch the snapshot to
			// heal instead of rendering stale cells forever.
			const incomingRevision = Math.floor(Number(fragment.cellsRevision || 0));
			if (incomingRevision > 0 && !mergePausedRef.current) {
				const lastSeenRevision = lastCellsRevisionRef.current;

				if (lastSeenRevision > 0 && incomingRevision > lastSeenRevision + 1 && !gapRefetchRequestedRef.current) {
					lastCellsRevisionRef.current = incomingRevision;
					gapRefetchRequestedRef.current = true;
					refetchRef.current?.();
				} else if (incomingRevision > lastSeenRevision) {
					lastCellsRevisionRef.current = incomingRevision;
				}
			}

			// Structure ops dispatch first so cell deltas land on shifted maps
			if (fragment.structureOp && fragment.structureOp !== lastStructureOpRef.current) {
				lastStructureOpRef.current = fragment.structureOp;
				onRemoteStructureOpRef.current?.(fragment.structureOp);
			}

			if (Array.isArray(fragment.ranges) && fragment.ranges !== lastRangesPatchRef.current) {
				lastRangesPatchRef.current = fragment.ranges;
				setWsRanges(fragment.ranges);
			}

			if (Array.isArray(fragment.regions) && fragment.regions !== lastRegionsPatchRef.current) {
				lastRegionsPatchRef.current = fragment.regions;
				setWsRegions(fragment.regions);
			}

			// Own echoes carry this client's id; the mutation response already
			// merged their cells, so re-processing them is skipped
			const isOwnEcho = Boolean(fragment.originClientId) && fragment.originClientId === getSheetEditClientId();

			if (
				!isOwnEcho &&
				!mergePausedRef.current &&
				(fragment.cellsDelta?.length || fragment.deletedCellCoords?.length)
			) {
				setConfirmedCellsByCoordValue((currentState) => {
					return mergeConfirmedSheetCells(
						currentState,
						fragment.cellsDelta,
						fragment.deletedCellCoords,
					);
				});
				onConfirmedCellsMergedRef.current?.(
					(fragment.cellsDelta || []) as SheetCellGQL[],
					fragment.deletedCellCoords || [],
				);
			}
		});
	}, [params.sheetId, setConfirmedCellsByCoordValue]);

	return {
		confirmedCellsByCoord,
		loading,
		pageInfo: typedSheetView?.pageInfo || null,
		ranges: wsRanges || typedSheetView?.ranges || null,
		recordCellsRevision,
		regions: wsRegions || typedSheetView?.regions || null,
		setConfirmedCellsByCoord,
		sheetView: typedSheetView,
	};
}
