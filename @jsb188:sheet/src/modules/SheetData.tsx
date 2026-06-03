import { useEditSheetCells, useUpdateSheet } from '@jsb188/graphql/hooks/use-sheet-mtn';
import type { SheetGridViewportVariables } from '@jsb188/graphql/hooks/use-sheet-qry';
import { useSheetGrid } from '@jsb188/graphql/hooks/use-sheet-qry';
import type { SheetCellGQL, SheetGQL } from '@jsb188/mday/types/sheet.d.ts';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/Layout';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  createSheetStateAtoms,
  type SheetStateAtoms,
} from '../states/sheet-state.ts';
import {
  SheetController,
  type SheetCellEditInput,
  type SheetDesignPatchInput,
} from './SheetController.tsx';
import {
  getSheetCanvasCellsByCoord,
  getSheetCanvasDesign,
  getSheetCanvasFetchRowCount,
  getSheetCanvasGridViewport,
  getSheetCanvasInitialRowCount,
  getSheetCanvasLoadedRowCount,
  mergeSheetCanvasCellsByCoord,
  SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT,
  type SheetLoadedGridState,
} from './sheet-utils.ts';

export interface SheetProps {
	sheet: SheetGQL;
	bufferColumns?: number;
	bufferRows?: number;
	children?: ReactNode;
	className?: string;
	disabled?: boolean;
	organizationId?: string | null;
	setFloatingMessage?: SetFloatingMessage;
}

type SheetViewportRequest = {
	columnCount: number;
	startColumnIndex: number;
};

/*
 * Return the initial empty loaded-grid state for one Sheet.
 */
function getInitialSheetLoadedGridState(initialRowCount: number): SheetLoadedGridState {
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
function sheetViewportVariablesAreEqual(a?: SheetGridViewportVariables | null, b?: SheetGridViewportVariables | null) {
	return a?.startRowIndex === b?.startRowIndex &&
		a?.startColumnIndex === b?.startColumnIndex &&
		a?.rowCount === b?.rowCount &&
		a?.columnCount === b?.columnCount;
}

/*
 * Return whether one loaded-grid state still matches the blank initial state.
 */
function sheetLoadedGridStateMatchesInitial(state: SheetLoadedGridState, initialRowCount: number) {
	return state.cellsByCoord.size === 0 &&
		state.hasMoreRows === false &&
		state.lastContentRowIndex === null &&
		state.loadedRowCount === initialRowCount;
}

/*
 * Render one Sheet inside an isolated local grid state store.
 */
export function Sheet(p: SheetProps) {
	const stateAtomsRef = useRef<SheetStateAtoms | null>(null);

	if (!stateAtomsRef.current) {
		stateAtomsRef.current = createSheetStateAtoms();
	}

	return <SheetDataContent {...p} stateAtoms={stateAtomsRef.current} />;
}

type SheetDataContentProps = SheetProps & {
	stateAtoms: SheetStateAtoms;
};

/*
 * Render the Sheet data boundary that owns GraphQL fetch and mutation hooks.
 */
function SheetDataContent(p: SheetDataContentProps) {
	const sheetId = p.sheet.id || '';
	const organizationId = p.organizationId || p.sheet.organizationId || '';

	const design = useMemo(() => {
		return getSheetCanvasDesign(p.sheet.design);
	}, [p.sheet.design]);
	const initialRowCount = useMemo(() => {
		return getSheetCanvasInitialRowCount(
			globalThis.window?.innerHeight || SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT,
			design.grid.rowCount,
		);
	}, [design.grid.rowCount]);
	const initialColumnCount = Math.min(100, design.grid.columnCount);
	const initialGridViewport = useMemo(() => {
		return getSheetCanvasGridViewport({
			columnCount: initialColumnCount,
			rowCount: initialRowCount,
		});
	}, [initialColumnCount, initialRowCount]);
	const initialLoadedGridState = useMemo(() => {
		return getInitialSheetLoadedGridState(initialRowCount);
	}, [initialRowCount]);
	const [gridViewportValue, setGridViewportValue] = useAtom(p.stateAtoms.gridViewportAtom);
	const [loadedGridStateValue, setLoadedGridStateValue] = useAtom(p.stateAtoms.loadedGridStateAtom);
	const gridViewport = gridViewportValue || initialGridViewport;
	const loadedGridState = loadedGridStateValue || initialLoadedGridState;
	const setGridViewport = useCallback((update: SheetGridViewportVariables | ((currentState: SheetGridViewportVariables) => SheetGridViewportVariables)) => {
		setGridViewportValue((currentState) => {
			const baseState = currentState || initialGridViewport;

			return typeof update === 'function' ? update(baseState) : update;
		});
	}, [initialGridViewport, setGridViewportValue]);
	const setLoadedGridState = useCallback((update: SheetLoadedGridState | ((currentState: SheetLoadedGridState) => SheetLoadedGridState)) => {
		setLoadedGridStateValue((currentState) => {
			const baseState = currentState || initialLoadedGridState;

			return typeof update === 'function' ? update(baseState) : update;
		});
	}, [initialLoadedGridState, setLoadedGridStateValue]);

	const fetchingMoreRef = useRef(false);
	const { editSheetCells } = useEditSheetCells();
	const { updateSheet } = useUpdateSheet();
	const {
		loading: sheetGridLoading,
		sheetGrid,
	} = useSheetGrid(sheetId, organizationId, gridViewport);

	useEffect(() => {
		const nextViewport = getSheetCanvasGridViewport({
			columnCount: Math.min(100, design.grid.columnCount),
			rowCount: initialRowCount,
		});

		setGridViewport((currentViewport) => {
			return sheetViewportVariablesAreEqual(currentViewport, nextViewport) ? currentViewport : nextViewport;
		});
		setLoadedGridState((currentState) => {
			return sheetLoadedGridStateMatchesInitial(currentState, initialRowCount)
				? currentState
				: getInitialSheetLoadedGridState(initialRowCount);
		});
	}, [design.grid.columnCount, initialRowCount, sheetId]);

	useEffect(() => {
		if (!sheetGridLoading) {
			fetchingMoreRef.current = false;
		}
	}, [sheetGridLoading]);

	useEffect(() => {
		if (!sheetGrid) {
			return;
		}

		setLoadedGridState((currentState) => {
			const requestedRowCount = Number(sheetGrid.viewport?.rowCount || gridViewport.rowCount || initialRowCount);
			const loadedRowCount = Math.min(
				design.grid.rowCount,
				getSheetCanvasLoadedRowCount({
					currentLoadedRowCount: currentState.loadedRowCount,
					pageInfo: sheetGrid.pageInfo,
					requestedRowCount,
					returnedRowCount: sheetGrid.rows?.length || 0,
				}),
			);
			const cellsByCoord = mergeSheetCanvasCellsByCoord(currentState.cellsByCoord, sheetGrid.cells as SheetCellGQL[] | null);
			const hasMoreRows = Boolean(sheetGrid.pageInfo?.hasMoreRows) && loadedRowCount < design.grid.rowCount;
			const lastContentRowIndex = sheetGrid.pageInfo?.lastContentRowIndex || null;

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
	}, [design.grid.rowCount, gridViewport.rowCount, initialRowCount, sheetGrid]);

	const requestViewport = useCallback((viewport: SheetViewportRequest) => {
		setGridViewport((currentViewport) => {
			const nextViewport = getSheetCanvasGridViewport({
				columnCount: Math.min(100, Math.max(1, viewport.columnCount)),
				rowCount: currentViewport.rowCount,
				startColumnIndex: viewport.startColumnIndex,
			});

			return sheetViewportVariablesAreEqual(currentViewport, nextViewport) ? currentViewport : nextViewport;
		});
	}, []);

	const fetchMoreRows = useCallback(async () => {
		if (fetchingMoreRef.current || sheetGridLoading || !loadedGridState.hasMoreRows) {
			return;
		}

		const nextRowCountDelta = getSheetCanvasFetchRowCount(loadedGridState.loadedRowCount, design.grid.rowCount);
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
	}, [design.grid.rowCount, gridViewport.columnCount, gridViewport.startColumnIndex, loadedGridState.hasMoreRows, loadedGridState.loadedRowCount, sheetGridLoading]);

	const saveCells = useCallback((cells: SheetCellEditInput[]) => {
		return editSheetCells({
			variables: {
				cells,
				organizationId,
				sheetId,
			},
		});
	}, [editSheetCells, organizationId, sheetId]);

	const updateSheetDesign = useCallback((nextDesign: SheetDesignPatchInput) => {
		return updateSheet({
			variables: {
				design: nextDesign,
				organizationId,
				sheetId,
			},
		});
	}, [organizationId, sheetId, updateSheet]);

	const cellsByCoord = useMemo(() => {
		return sheetGrid?.cells?.length && !loadedGridState.cellsByCoord.size
			? getSheetCanvasCellsByCoord(sheetGrid.cells as SheetCellGQL[])
			: loadedGridState.cellsByCoord;
	}, [loadedGridState.cellsByCoord, sheetGrid?.cells]);

	return <SheetController
		bufferColumns={p.bufferColumns}
		bufferRows={p.bufferRows}
		canFetchMoreRows={!sheetGridLoading}
		cellsByCoord={cellsByCoord}
		children={p.children}
		className={p.className}
		design={design}
		disabled={p.disabled}
		hasMoreRows={loadedGridState.hasMoreRows}
		loadedRowCount={loadedGridState.loadedRowCount}
		onFetchMoreRows={fetchMoreRows}
		onSaveCells={saveCells}
		onUpdateSheetDesign={updateSheetDesign}
		onViewportRequest={requestViewport}
		ranges={sheetGrid?.ranges || []}
		stateAtoms={p.stateAtoms}
	/>;
}

export default Sheet;
