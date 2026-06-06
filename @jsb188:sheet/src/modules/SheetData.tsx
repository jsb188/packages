import { useEditDataTableCells } from '@jsb188/graphql/hooks/use-dataTable-mtn';
import { useEditSheetCells, useUpdateSheet } from '@jsb188/graphql/hooks/use-sheet-mtn';
import { loadQuery } from '@jsb188/graphql/cache';
import { getDataTableCellsForRowsQueryKey, useDataTableCellsForRows } from '@jsb188/graphql/hooks/use-dataTable-qry';
import type { SheetGridViewportVariables } from '@jsb188/graphql/hooks/use-sheet-qry';
import { useSheetGrid } from '@jsb188/graphql/hooks/use-sheet-qry';
import type { DataTableCellGQL, DataTableGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { OrganizationOperationEnum } from '@jsb188/mday/types/organization.d.ts';
import type { SheetCellGQL, SheetGQL, SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/Layout';
import { useOpenModalPopUp, useOpenModalScreen } from '@jsb188/react/states';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  createSheetStateAtoms,
  type SheetStateAtoms,
} from '../libs/sheet-state.ts';
import {
  SheetController,
  type SheetCellEditInput,
  type SheetDesignPatchInput,
  type SheetInsertViewTableRequest,
} from './SheetController.tsx';
import {
  getSheetCanvasCellsByCoord,
  getSheetCanvasDesign,
  getSheetCanvasFetchRowCount,
  getSheetCanvasGridViewport,
  getSheetCanvasInitialRowCount,
  getSheetCanvasLoadedRowCount,
  replaceSheetCanvasCellsInViewport,
  SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT,
  type SheetLoadedGridState,
} from '../libs/sheet-utils.ts';

export interface SheetProps {
	sheet: SheetGQL;
	bufferColumns?: number;
	bufferRows?: number;
	children?: ReactNode;
	className?: string;
	dataTables?: DataTableGQL[] | null;
	disabled?: boolean;
	operation?: OrganizationOperationEnum | null;
	organizationId?: string | null;
	previewAuthToken?: string | null;
	onPreviewReady?: () => void;
	setFloatingMessage?: SetFloatingMessage;
	timeZone?: string | null;
}

type SheetDataTableCellsForRowsRequest = {
	dataTableId: string;
	dataTableRowIds: string[];
};

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
 * Return active DataTable regions keyed by their stable region id.
 */
function getSheetDataTableRegionsById(regions?: SheetRegionGQL[] | null) {
	return new Map((regions || [])
		.filter((region) => region?.id && region.type === 'DATA_TABLE' && region.source?.dataTableId)
		.map((region) => [String(region.id), region]));
}

/*
 * Return grouped source-row requests for generated Sheet cells.
 */
function getSheetDataTableSourceCellRequests(
	cellsByCoord: Map<string, SheetCellGQL>,
	regions?: SheetRegionGQL[] | null,
) {
	const regionsById = getSheetDataTableRegionsById(regions);
	const rowIdsByDataTableId = new Map<string, Set<string>>();

	cellsByCoord.forEach((cell) => {
		if (cell.sourceType !== 'REGION_GENERATED' || !cell.region?.sourceRowId || !cell.region?.sourceCellKey) {
			return;
		}

		const regionId = String(cell.region.regionId || cell.regionId || '');
		const region = regionsById.get(regionId);
		const dataTableId = String(region?.source?.dataTableId || '');

		if (!dataTableId) {
			return;
		}

		const rowIds = rowIdsByDataTableId.get(dataTableId) || new Set<string>();
		rowIds.add(String(cell.region.sourceRowId));
		rowIdsByDataTableId.set(dataTableId, rowIds);
	});

	return Array.from(rowIdsByDataTableId.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([dataTableId, rowIds]) => ({
			dataTableId,
			dataTableRowIds: Array.from(rowIds).sort(),
		}));
}

/*
 * Return exact GraphQL variables for a generated source-cell hydration request.
 */
function getSheetDataTableSourceCellVariables(
	organizationId: string,
	requests: SheetDataTableCellsForRowsRequest[],
) {
	return {
		organizationId,
		requests,
	};
}

/*
 * Return cached source cells for one exact hydration request when present.
 */
function getCachedSheetDataTableSourceCells(
	organizationId: string,
	requests: SheetDataTableCellsForRowsRequest[],
) {
	if (!organizationId || !requests.length) {
		return null;
	}

	const variables = getSheetDataTableSourceCellVariables(organizationId, requests);
	const cached = loadQuery(getDataTableCellsForRowsQueryKey(variables));

	return Array.isArray(cached) ? cached as DataTableCellGQL[] : null;
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
	const { editDataTableCells } = useEditDataTableCells();
	const { editSheetCells } = useEditSheetCells();
	const { updateSheet } = useUpdateSheet();
	const openModalPopUp = useOpenModalPopUp();
	const openModalScreen = useOpenModalScreen();
	const {
		loading: sheetGridLoading,
		sheetGrid,
	} = useSheetGrid(sheetId, organizationId, gridViewport, {
		authToken: p.previewAuthToken || null,
	});

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
		if (sheetGridLoading || !sheetGrid || !p.onPreviewReady) {
			return;
		}

		const frameId = globalThis.requestAnimationFrame(() => {
			p.onPreviewReady?.();
		});

		return () => {
			globalThis.cancelAnimationFrame(frameId);
		};
	}, [p.onPreviewReady, sheetGrid, sheetGridLoading]);

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
			const cellsByCoord = replaceSheetCanvasCellsInViewport(
				currentState.cellsByCoord,
				sheetGrid.cells as SheetCellGQL[] | null,
				sheetGrid.viewport,
			);
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

	const saveDataTableCells = useCallback((params: {
			cells: Array<{
				cellKey: string;
				dataTableRowId: string;
				value: string | null;
			}>;
		dataTableId: string;
	}) => {
		return editDataTableCells({
			variables: {
				cells: params.cells,
				dataTableId: params.dataTableId,
				organizationId,
			},
		});
	}, [editDataTableCells, organizationId]);

	const updateSheetDesign = useCallback((nextDesign: SheetDesignPatchInput) => {
		return updateSheet({
			variables: {
				design: nextDesign,
				organizationId,
				sheetId,
			},
		});
	}, [organizationId, sheetId, updateSheet]);

	/*
	 * Open the confirmation popup that deletes one data table-backed region from the Sheet.
	 */
	const removeDataTableRegion = useCallback((regionId: string) => {
		if (!organizationId || !sheetId || !regionId) {
			return;
		}

		openModalPopUp({
			name: 'delete_sheet_region',
			preset: 'DELETE_SHEET_REGION',
			props: {
				organizationId,
				regionId,
				sheetId,
			},
		});
	}, [openModalPopUp, organizationId, sheetId]);

	/*
	 * Open the app modal that creates a data table-backed region for this Sheet.
	 */
	const openPopulateFromDataTableModal = useCallback((request: SheetInsertViewTableRequest) => {
		if (!organizationId || !sheetId) {
			return;
		}

		openModalScreen({
			name: 'SHEET_INSERT_VIEW',
			props: {
				...request,
				operation: p.operation || null,
				organizationId,
				sheetId,
			},
		});
	}, [openModalScreen, organizationId, p.operation, sheetId]);

	const cellsByCoord = useMemo(() => {
		return sheetGrid?.cells?.length && !loadedGridState.cellsByCoord.size
			? getSheetCanvasCellsByCoord(sheetGrid.cells as SheetCellGQL[])
			: loadedGridState.cellsByCoord;
	}, [loadedGridState.cellsByCoord, sheetGrid?.cells]);
	const dataTableSourceCellRequests = useMemo(() => {
		return getSheetDataTableSourceCellRequests(cellsByCoord, sheetGrid?.regions);
	}, [cellsByCoord, sheetGrid?.regions]);
	const cachedDataTableSourceCells = useMemo(() => {
		return getCachedSheetDataTableSourceCells(organizationId, dataTableSourceCellRequests);
	}, [dataTableSourceCellRequests, organizationId]);
	const {
		dataTableCellsForRows,
	} = useDataTableCellsForRows(
		organizationId,
		dataTableSourceCellRequests,
		{
			skip: !organizationId || !dataTableSourceCellRequests.length || Boolean(cachedDataTableSourceCells) || Boolean(p.previewAuthToken),
		},
	);
	const sourceDataTableCells = cachedDataTableSourceCells || dataTableCellsForRows || [];

	return <SheetController
		bufferColumns={p.bufferColumns}
		bufferRows={p.bufferRows}
		canFetchMoreRows={!sheetGridLoading}
		cellsByCoord={cellsByCoord}
		children={p.children}
		className={p.className}
		dataTables={p.dataTables}
		design={design}
		disabled={p.disabled}
		hasMoreRows={loadedGridState.hasMoreRows}
		loadedRowCount={loadedGridState.loadedRowCount}
		onFetchMoreRows={fetchMoreRows}
		onPopulateFromDataTable={openPopulateFromDataTableModal}
		onRemoveDataTableRegion={removeDataTableRegion}
		onSaveDataTableCells={saveDataTableCells}
		onSaveCells={saveCells}
		onUpdateSheetDesign={updateSheetDesign}
		onViewportRequest={requestViewport}
		ranges={sheetGrid?.ranges || []}
		regions={sheetGrid?.regions || []}
		setFloatingMessage={p.setFloatingMessage}
		sourceDataTableCells={sourceDataTableCells}
		stateAtoms={p.stateAtoms}
		timeZone={p.timeZone}
	/>;
}

export default Sheet;
