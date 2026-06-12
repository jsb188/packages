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
		sheetView,
	} = useSheetView(params.sheetId, params.organizationId, fullViewport, {
		authToken: params.previewAuthToken || null,
	});
	const typedSheetView = sheetView as SheetViewGQL | null;
	const appliedSheetViewRef = useRef<SheetViewGQL | null>(null);
	const confirmedSheetIdRef = useRef(params.sheetId);

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
	}, [params.sheetStructureGridMergePaused, setConfirmedCellsByCoordValue, typedSheetView]);

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
				deletedCellCoords?: SheetDeletedCellCoord[] | null;
				ranges?: SheetRangeGQL[] | null;
				regions?: SheetRegionGQL[] | null;
				structureOp?: SheetViewStructureOpPatch | null;
			} | null;
			if (!fragment) {
				return;
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

			if (
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
		regions: wsRegions || typedSheetView?.regions || null,
		setConfirmedCellsByCoord,
		sheetView: typedSheetView,
	};
}
