import type { SheetGridViewportVariables } from '@jsb188/graphql/hooks/use-sheet-qry';
import { useSheetGrid } from '@jsb188/graphql/hooks/use-sheet-qry';
import type {
	SheetCellGQL,
	SheetDesignObj,
	SheetGridGQL,
} from '@jsb188/mday/types/sheet.d.ts';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { SheetStateAtoms } from './sheet-state.ts';
import {
	getSheetCanvasFetchRowCount,
	getSheetCanvasGridViewport,
	getSheetCanvasInitialRowCount,
	getSheetCanvasLoadedRowCount,
	replaceSheetCanvasCellsInViewport,
	SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT,
	type SheetLoadedGridState,
} from './sheet-utils.ts';

export type SheetViewportRequest = {
	columnCount: number;
	startColumnIndex: number;
};

export type SetSheetLoadedGridState = (
	update:
		| SheetLoadedGridState
		| ((currentState: SheetLoadedGridState) => SheetLoadedGridState),
) => void;

type SetSheetGridViewport = (
	update:
		| SheetGridViewportVariables
		| ((currentState: SheetGridViewportVariables) => SheetGridViewportVariables),
) => void;

type UseSheetLoadedGridStateParams = {
	design: SheetDesignObj;
	organizationId: string;
	previewAuthToken?: string | null;
	serverDesign: SheetDesignObj;
	sheetId: string;
	sheetStructureGridMergePaused: boolean;
	stateAtoms: SheetStateAtoms;
};

/*
 * Return the initial empty loaded-grid state for one Sheet.
 */
function getInitialSheetLoadedGridState(
	initialRowCount: number,
): SheetLoadedGridState {
	return {
		cellsByCoord: new Map(),
		hasMoreRows: false,
		lastContentRowIndex: null,
		loadedRowCount: initialRowCount,
	};
}

/*
 * Return whether two sheetGrid viewport variable objects are equivalent.
 */
function sheetViewportVariablesAreEqual(
	a?: SheetGridViewportVariables | null,
	b?: SheetGridViewportVariables | null,
) {
	return a?.startRowIndex === b?.startRowIndex &&
		a?.startColumnIndex === b?.startColumnIndex &&
		a?.rowCount === b?.rowCount &&
		a?.columnCount === b?.columnCount;
}

/*
 * Return whether the current fetched Sheet viewport fully covers a requested viewport.
 */
function sheetViewportContainsRequest(
	currentViewport: SheetGridViewportVariables,
	nextViewport: SheetGridViewportVariables,
) {
	const currentEndRowIndex = currentViewport.startRowIndex +
		currentViewport.rowCount - 1;
	const currentEndColumnIndex = currentViewport.startColumnIndex +
		currentViewport.columnCount - 1;
	const nextEndRowIndex = nextViewport.startRowIndex + nextViewport.rowCount -
		1;
	const nextEndColumnIndex = nextViewport.startColumnIndex +
		nextViewport.columnCount - 1;

	return nextViewport.startRowIndex >= currentViewport.startRowIndex &&
		nextViewport.startColumnIndex >= currentViewport.startColumnIndex &&
		nextEndRowIndex <= currentEndRowIndex &&
		nextEndColumnIndex <= currentEndColumnIndex;
}

/*
 * Return whether one loaded-grid state still matches the blank initial state.
 */
function sheetLoadedGridStateMatchesInitial(
	state: SheetLoadedGridState,
	initialRowCount: number,
) {
	return state.cellsByCoord.size === 0 &&
		state.hasMoreRows === false &&
		state.lastContentRowIndex === null &&
		state.loadedRowCount === initialRowCount;
}

/*
 * Own the Sheet grid viewport, sheetGrid query, paged fetch state, and query-to-cache merge.
 */
export function useSheetLoadedGridState(
	params: UseSheetLoadedGridStateParams,
) {
	const initialRowCount = useMemo(() => {
		return getSheetCanvasInitialRowCount(
			globalThis.window?.innerHeight || SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT,
			params.serverDesign.grid.rowCount,
		);
	}, [params.serverDesign.grid.rowCount]);
	const initialGridViewport = useMemo(() => {
		return getSheetCanvasGridViewport({
			columnCount: Math.min(100, params.serverDesign.grid.columnCount),
			rowCount: initialRowCount,
		});
	}, [initialRowCount, params.serverDesign.grid.columnCount]);
	const initialLoadedGridState = useMemo(() => {
		return getInitialSheetLoadedGridState(initialRowCount);
	}, [initialRowCount]);
	const [gridViewportValue, setGridViewportValue] = useAtom(
		params.stateAtoms.gridViewportAtom,
	);
	const [loadedGridStateValue, setLoadedGridStateValue] = useAtom(
		params.stateAtoms.loadedGridStateAtom,
	);
	const gridViewport = gridViewportValue;
	const loadedGridState = loadedGridStateValue || initialLoadedGridState;
	const fetchingMoreRef = useRef(false);
	const loadedGridSheetIdRef = useRef(params.sheetId);
	const setGridViewport: SetSheetGridViewport = useCallback(
		(update) => {
			setGridViewportValue((currentState) => {
				const baseState = currentState || initialGridViewport;

				return typeof update === 'function' ? update(baseState) : update;
			});
		},
		[initialGridViewport, setGridViewportValue],
	);
	const setLoadedGridState: SetSheetLoadedGridState = useCallback(
		(update) => {
			setLoadedGridStateValue((currentState) => {
				const baseState = currentState || initialLoadedGridState;

				return typeof update === 'function' ? update(baseState) : update;
			});
		},
		[initialLoadedGridState, setLoadedGridStateValue],
	);
	const {
		loading: sheetGridLoading,
		sheetGrid,
	} = useSheetGrid(params.sheetId, params.organizationId, gridViewport, {
		authToken: params.previewAuthToken || null,
	});
	const typedSheetGrid = sheetGrid as SheetGridGQL | null | undefined;

	useEffect(() => {
		const sheetChanged = loadedGridSheetIdRef.current !== params.sheetId;
		loadedGridSheetIdRef.current = params.sheetId;

		if (!sheetChanged) {
			setLoadedGridStateValue((currentState) => {
				if (!currentState) {
					return currentState;
				}

				return sheetLoadedGridStateMatchesInitial(currentState, initialRowCount)
					? getInitialSheetLoadedGridState(initialRowCount)
					: currentState;
			});
			return;
		}

		setGridViewportValue(null);
		setLoadedGridStateValue(getInitialSheetLoadedGridState(initialRowCount));
	}, [
		initialRowCount,
		params.sheetId,
		setGridViewportValue,
		setLoadedGridStateValue,
	]);

	useEffect(() => {
		if (!sheetGridLoading) {
			fetchingMoreRef.current = false;
		}
	}, [sheetGridLoading]);

	useEffect(() => {
		if (!typedSheetGrid || params.sheetStructureGridMergePaused) {
			return;
		}

		setLoadedGridState((currentState) => {
			const requestedRowCount = Number(
				typedSheetGrid.viewport?.rowCount || gridViewport?.rowCount ||
					initialRowCount,
			);
			const loadedRowCount = Math.min(
				params.design.grid.rowCount,
				getSheetCanvasLoadedRowCount({
					currentLoadedRowCount: currentState.loadedRowCount,
					pageInfo: typedSheetGrid.pageInfo,
					requestedRowCount,
					returnedRowCount: typedSheetGrid.rows?.length || 0,
				}),
			);
			const cellsByCoord = replaceSheetCanvasCellsInViewport(
				currentState.cellsByCoord,
				typedSheetGrid.cells as SheetCellGQL[] | null,
				typedSheetGrid.viewport,
			);
			const hasMoreRows = Boolean(typedSheetGrid.pageInfo?.hasMoreRows) &&
				loadedRowCount < params.design.grid.rowCount;
			const lastContentRowIndex = typedSheetGrid.pageInfo?.lastContentRowIndex ||
				null;

			if (
				currentState.cellsByCoord === cellsByCoord &&
				currentState.hasMoreRows === hasMoreRows &&
				currentState.lastContentRowIndex === lastContentRowIndex &&
				currentState.loadedRowCount === loadedRowCount
			) {
				return currentState;
			}

			return {
				cellsByCoord,
				hasMoreRows,
				lastContentRowIndex,
				loadedRowCount,
			};
		});
	}, [
		gridViewport?.rowCount,
		initialRowCount,
		params.design.grid.rowCount,
		params.sheetStructureGridMergePaused,
		setLoadedGridState,
		typedSheetGrid,
	]);

	const requestViewport = useCallback((viewport: SheetViewportRequest) => {
		setGridViewportValue((currentViewport) => {
			const baseViewport = currentViewport || initialGridViewport;
			const nextViewport = getSheetCanvasGridViewport({
				columnCount: Math.min(100, Math.max(1, viewport.columnCount)),
				rowCount: baseViewport.rowCount,
				startColumnIndex: viewport.startColumnIndex,
			});

			if (
				currentViewport &&
				(
					sheetViewportVariablesAreEqual(currentViewport, nextViewport) ||
					sheetViewportContainsRequest(currentViewport, nextViewport)
				)
			) {
				return currentViewport;
			}

			return nextViewport;
		});
	}, [initialGridViewport, setGridViewportValue]);

	const fetchMoreRows = useCallback(async () => {
		if (
			fetchingMoreRef.current || sheetGridLoading ||
			!loadedGridState.hasMoreRows ||
			!gridViewport
		) {
			return;
		}

		const nextRowCountDelta = getSheetCanvasFetchRowCount(
			loadedGridState.loadedRowCount,
			params.design.grid.rowCount,
		);
		if (nextRowCountDelta <= 0) {
			return;
		}

		const nextViewport = getSheetCanvasGridViewport({
			columnCount: gridViewport.columnCount,
			rowCount: loadedGridState.loadedRowCount + nextRowCountDelta,
			startColumnIndex: gridViewport.startColumnIndex,
		});

		fetchingMoreRef.current = true;
		setGridViewport(nextViewport);
	}, [
		gridViewport,
		loadedGridState.hasMoreRows,
		loadedGridState.loadedRowCount,
		params.design.grid.rowCount,
		setGridViewport,
		sheetGridLoading,
	]);

	return {
		fetchMoreRows,
		gridViewport,
		loadedGridState,
		requestViewport,
		setLoadedGridState,
		sheetGrid: typedSheetGrid,
		sheetGridLoading,
	};
}
