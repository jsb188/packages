import { useEditSheetCells, useUpdateSheet } from '@jsb188/graphql/hooks/use-sheet-mtn';
import { type SheetGridViewportVariables, useSheetGrid } from '@jsb188/graphql/hooks/use-sheet-qry';
import {
	SHEET_DEFAULT_COLUMN_COUNT,
	SHEET_DEFAULT_ROW_COUNT,
} from '@jsb188/mday/constants/sheet.ts';
import type {
	SheetAxisDesignObj,
	SheetCellGQL,
	SheetDesignGQL,
	SheetGQL,
	SheetGridRowGQL,
} from '@jsb188/mday/types/sheet.d.ts';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/Layout';
import {
	clampSheetColumnWidth,
	clampSheetRowHeight,
	getSheetCellKey,
	getSheetColumnMetrics,
	getSheetRowMetrics,
	getSheetVisibleRange,
	SHEET_COLUMN_WIDTH,
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	SheetUI,
	type SheetColumnMetric,
	type SheetColumnWidths,
	type SheetRowMetric,
	type SheetRowHeights,
	type SheetUICell,
	type SheetUIColumn,
	type SheetUIEditState,
	type SheetUIResizeGuide,
	type SheetUIRowResizeGuide,
	type SheetUIRowSlot,
	type SheetUISelectedCellKeyMap,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { useIsomorphicLayoutEffect } from '@jsb188/react-web/utils/dom';
import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type SheetContextMenuCellTarget, type SheetContextMenuFormat, type SheetContextMenuTarget, useSheetContextMenu } from './Sheet-ContextMenu.tsx';
import { dismissSheetGridContextMenuOnPointerDown } from './sheet-grid-context-menu.ts';
import { addSheetGridKeyboardEventListener, handleSheetGridKeyboardEvent } from './sheet-grid-keyboard.ts';
import {
	getClosestSheetGridElement,
	getSheetGridCellSelectionFromElement,
	getSheetGridKeyboardElements,
	isSheetGridShortcutBlockedByActiveInput,
	isSheetGridTextInputKey,
	useSheetGridElementSize,
	useSheetGridWindowHeight,
} from './sheet-grid-runtime.ts';
import { createSheetGridUICellRenderStore } from './sheet-grid-render-store.ts';
import {
	getSheetGridArrowNavigationSelection,
	getSheetGridSelectionAnchorCell,
	getNextActiveSheetSelectedCell,
	getSheetGridSelectionBoxPosition,
	getSheetSelectedCellKeyMapForGridRange,
	getSheetSelectedCellKeyMapFromCells,
} from './sheet-selection.ts';
import { getSheetViewportVisibleCells } from './sheet-viewport.ts';
import { getSheetUICellRenderSnapshot } from './dataTable-ui-projection.ts';
import { sendCellSaveBeacon } from './cell-save-beacon.ts';
import { groupCellSaveItemsByTarget, sendGroupedCellSaveItems, useDebouncedCellSaveBatch } from './use-debounced-cell-save-batch.ts';

/**
 * Types
 */

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

type SheetAxisDesignMap = Record<string, SheetAxisDesignObj>;

type SheetResizeState = {
	key: string;
	latestSize?: number;
	startClientPosition: number;
	startSize: number;
};

type SheetCellSelectionState = SheetUISelectedCellState;

type SheetCellStyle = Pick<CSSProperties, 'backgroundColor' | 'color'>;

type SheetCellDragSelectionState = {
	anchorCell: SheetCellSelectionState;
	latestCell: SheetCellSelectionState;
	pointerId: number;
	started: boolean;
};

type SheetUICellCacheItem = {
	cell: SheetUICell;
	signature: string;
};

type SheetPendingCellSave = {
	cell: {
		columnIndex: number;
		rawInput?: string | null;
		regionId?: string | number | bigint | null;
		rowIndex: number;
	};
	clear?: boolean;
	optimisticKey: string;
	organizationId: string | number | bigint | null;
	saveVersion: number;
	sheetId: string | number | bigint | null;
};

const SHEET_FALLBACK_VIEWPORT_HEIGHT = 700;
const SHEET_FALLBACK_VIEWPORT_WIDTH = 1000;
const SHEET_FETCH_BUFFER_ROWS = 25;
const SHEET_FETCH_ROW_COUNT = 400;
const SHEET_INITIAL_LOADED_ROW_COUNT = 200;
const SHEET_MAX_ROW_COUNT = SHEET_DEFAULT_ROW_COUNT;
const SHEET_MIN_RENDERED_ROW_COUNT = 200;
const SHEET_ROW_BUFFER_SCREEN_RATIO = 0.7;
const SHEET_GRID_EDITOR_SELECTOR = '[data-sheet-editor="true"]';

/*
 * Return the Sheet row count that can fit inside one screen height.
 */

function getSheetScreenFitRowCount(screenHeight: number) {
	return Math.ceil(Math.max(0, screenHeight) / SHEET_ROW_HEIGHT);
}

/*
 * Return the Sheet row count visible inside one grid viewport body.
 */

function getSheetViewportVisibleRowCount(viewportHeight: number, headerHeight: number) {
	const bodyHeight = Math.max(0, viewportHeight - headerHeight);

	return Math.ceil(bodyHeight / SHEET_ROW_HEIGHT);
}

/*
 * Return the Sheet row buffer count based on visible viewport row capacity.
 */

function getSheetViewportRowBufferCount(viewportHeight: number, headerHeight: number) {
	return Math.ceil(getSheetViewportVisibleRowCount(viewportHeight, headerHeight) * SHEET_ROW_BUFFER_SCREEN_RATIO);
}

/*
 * Return the Sheet column buffer count based on visible viewport column capacity.
 */

function getSheetViewportColumnBufferCount(viewportWidth: number) {
	const bodyWidth = Math.max(0, viewportWidth - SHEET_ROW_NUMBER_WIDTH);

	return Math.ceil(bodyWidth / SHEET_COLUMN_WIDTH);
}

/*
 * Return the maximum rendered Sheet row count for one screen-sized viewport.
 */

function getSheetRenderedRowCount(screenHeight: number) {
	return Math.max(SHEET_MIN_RENDERED_ROW_COUNT, getSheetScreenFitRowCount(screenHeight));
}

/*
 * Return the initial Sheet row count to request for one screen-sized viewport.
 */

function getSheetInitialLoadedRowCount(screenHeight: number, totalRowCount: number) {
	const loadedRowCount = Math.max(SHEET_INITIAL_LOADED_ROW_COUNT, getSheetScreenFitRowCount(screenHeight));

	return Math.min(totalRowCount, loadedRowCount);
}

/*
 * Return one Sheet viewport's inclusive end row index.
 */

function getSheetViewportEndRowIndex(viewport: SheetGridViewportVariables) {
	return viewport.startRowIndex + viewport.rowCount - 1;
}

/*
 * Return the loaded Sheet row count after discovering a meaningful row.
 */

function getNextSheetLoadedRowCount(currentRowCount: number, nextRowCount: number, totalRowCount: number) {
	return Math.min(totalRowCount, Math.max(currentRowCount, nextRowCount));
}

/*
 * Return the loaded Sheet row count implied by backend page metadata.
 */

function getSheetLoadedRowCountFromPageInfo(pageInfo: { hasMoreRows?: boolean | null; lastContentRowIndex?: number | null } | null | undefined, requestedRowCount: number, totalRowCount: number) {
	if (pageInfo?.hasMoreRows) {
		return Math.min(totalRowCount, requestedRowCount);
	}

	const lastContentRowIndex = Math.max(0, Number(pageInfo?.lastContentRowIndex || 0));
	const finalRowCount = lastContentRowIndex
		? Math.min(requestedRowCount, Math.max(SHEET_INITIAL_LOADED_ROW_COUNT, lastContentRowIndex))
		: SHEET_INITIAL_LOADED_ROW_COUNT;

	return Math.min(totalRowCount, finalRowCount);
}

/*
 * Parse one serialized sheet design object field from GraphQL.
 */

function parseSheetDesignObject<T extends Record<string, any>>(value?: string | null, fallback: T = {} as T): T {
	if (!value) {
		return fallback;
	}

	try {
		const parsed = JSON.parse(value);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
	} catch (_err) {
		return fallback;
	}
}

/*
 * Parse one serialized Sheet cell style object into supported CSS values.
 */

function parseSheetCellStyleObject(value?: string | null): SheetCellStyle {
	if (!value) {
		return {};
	}

	try {
		const parsed = JSON.parse(value);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {};
		}

		return {
			backgroundColor: typeof parsed.backgroundColor === 'string' ? parsed.backgroundColor : undefined,
			color: typeof parsed.color === 'string' ? parsed.color : undefined,
		};
	} catch (_err) {
		return {};
	}
}

/*
 * Return the SheetUI style for one backend cell after optimistic overrides.
 */

function getSheetUICellStyle(cell?: SheetCellGQL | null, optimisticStyle?: SheetCellStyle): SheetCellStyle | undefined {
	const style = {
		...parseSheetCellStyleObject(cell?.style),
		...(optimisticStyle || {}),
	};

	return style.backgroundColor || style.color ? style : undefined;
}

/*
 * Return a stable signature for one Sheet UI cell's render-facing data.
 */

function getSheetUICellSignature(params: {
	canEdit: boolean;
	cellStyle?: SheetCellStyle;
	displayValue: string;
	draftValue: string;
}) {
	return [
		params.canEdit ? '1' : '0',
		params.cellStyle?.backgroundColor || '',
		params.cellStyle?.color || '',
		params.displayValue,
		params.draftValue,
	].join('|');
}

/*
 * Return the selected Sheet context-menu targets for a right-clicked cell.
 */

function getSheetContextMenuTargetCells(params: {
	clickedCell: SheetCellSelectionState;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
}) {
	const clickedKey = getSheetCellKey(params.clickedCell.rowId, params.clickedCell.cellKey);
	if (!params.selectedCellKeyMap?.[clickedKey]) {
		return [params.clickedCell];
	}

	return Object.keys(params.selectedCellKeyMap).map((key) => {
		const [rowId, cellKey] = key.split(':');
		return {
			cellKey,
			rowId,
		};
	}).filter((cell): cell is SheetContextMenuCellTarget => Boolean(cell.rowId && cell.cellKey));
}

/*
 * Return one bounded grid design value from a sheet.
 */

function getSheetGridDesign(sheet: SheetGQL) {
	const grid = sheet.design?.grid || {};

	return {
		columnCount: Math.max(1, Math.floor(Number(grid.columnCount || SHEET_DEFAULT_COLUMN_COUNT))),
		frozenColumns: Math.max(0, Math.floor(Number(grid.frozenColumns || 0))),
		frozenRows: Math.max(0, Math.floor(Number(grid.frozenRows || 0))),
		rowCount: Math.min(SHEET_MAX_ROW_COUNT, Math.max(1, Math.floor(Number(grid.rowCount || SHEET_DEFAULT_ROW_COUNT)))),
	};
}

/*
 * Return a spreadsheet column label for a 1-based column index.
 */

function getSheetColumnLabel(columnIndex: number) {
	let value = Math.max(1, Math.floor(columnIndex));
	let label = '';

	while (value > 0) {
		const remainder = (value - 1) % 26;
		label = String.fromCharCode(65 + remainder) + label;
		value = Math.floor((value - 1) / 26);
	}

	return label;
}

/*
 * Build the generic SheetUI column definitions for one sheet design.
 */

function getSheetUIColumns(columnCount: number): SheetUIColumn[] {
	return Array.from({ length: columnCount }, (_value, index) => {
		const columnIndex = index + 1;
		const key = String(columnIndex);

		return {
			id: key,
			key,
			label: getSheetColumnLabel(columnIndex),
			fieldType: 'TEXT',
			headerClassName: 'a_c',
			headerLayoutClassName: 'h_center',
			humanFieldType: 'TEXT',
		};
	});
}

/*
 * Return the effective column widths after stored design and local drafts.
 */

function getSheetColumnWidths(columnsDesign: SheetAxisDesignMap, drafts: SheetColumnWidths): SheetColumnWidths {
	const storedWidths = Object.entries(columnsDesign).reduce<SheetColumnWidths>((acc, [key, design]) => {
		if (design?.width) {
			acc[key] = clampSheetColumnWidth(design.width);
		}

		return acc;
	}, {});

	return {
		...storedWidths,
		...drafts,
	};
}

/*
 * Return the effective row heights after stored design and local drafts.
 */

function getSheetRowHeights(rowsDesign: SheetAxisDesignMap, drafts: SheetRowHeights): SheetRowHeights {
	const storedHeights = Object.entries(rowsDesign).reduce<SheetRowHeights>((acc, [key, design]) => {
		if (design?.height) {
			acc[key] = clampSheetRowHeight(design.height);
		}

		return acc;
	}, {});

	return {
		...storedHeights,
		...drafts,
	};
}

/*
 * Return a stable coordinate key for flat SheetGrid cells.
 */

function getSheetGridCellCoordKey(rowIndex?: number | null, columnIndex?: number | null) {
	return `${Number(rowIndex || 0)}:${Number(columnIndex || 0)}`;
}

/*
 * Return the editable value for one backend sheet cell.
 */

function getSheetCellDraftValue(cell?: SheetCellGQL | null) {
	if (!cell) {
		return '';
	}

	return cell.rawInput ?? cell.textValue ?? cell.value ?? '';
}

/*
 * Return the display value for one backend sheet cell.
 */

function getSheetCellDisplayValue(cell?: SheetCellGQL | null, optimisticValue?: string | null) {
	if (optimisticValue !== undefined) {
		return optimisticValue || '';
	}

	return cell?.textValue ?? cell?.value ?? cell?.rawInput ?? '';
}

/*
 * Return whether one backend Sheet cell contains any user-visible data.
 */

function sheetCellHasData(cell?: SheetCellGQL | null) {
	return Boolean(
		cell &&
		(
			cell.rawInput ||
			cell.value ||
			cell.textValue ||
			cell.numberValue !== undefined && cell.numberValue !== null ||
			cell.booleanValue !== undefined && cell.booleanValue !== null ||
			cell.dateValue ||
			cell.datetimeValue ||
			cell.formula
		)
	);
}

/*
 * Return whether one Sheet cell has saved or optimistic formatting.
 */

function sheetCellHasFormatting(cell?: SheetCellGQL | null, optimisticStyle?: SheetCellStyle) {
	const cellStyle = getSheetUICellStyle(cell, optimisticStyle);

	return Boolean(cellStyle || cell?.format);
}

/*
 * Return the raw input value from one active editor element.
 */

function getSheetEditorValue(editorElement?: Element | null) {
	if (editorElement instanceof HTMLInputElement || editorElement instanceof HTMLTextAreaElement) {
		return editorElement.value;
	}

	return '';
}

/*
 * Return whether one Sheet cell coordinate is inside one viewport.
 */

function sheetCellIsInViewport(cell: SheetCellGQL, viewport: SheetGridViewportVariables) {
	const rowIndex = Number(cell.rowIndex || 0);
	const columnIndex = Number(cell.columnIndex || 0);
	const endRowIndex = viewport.startRowIndex + viewport.rowCount - 1;
	const endColumnIndex = viewport.startColumnIndex + viewport.columnCount - 1;

	return rowIndex >= viewport.startRowIndex &&
		rowIndex <= endRowIndex &&
		columnIndex >= viewport.startColumnIndex &&
		columnIndex <= endColumnIndex;
}

/*
 * Merge fetched Sheet cells into the local sparse cell cache for one viewport.
 */

function mergeSheetCellsForViewport(currentCells: SheetCellGQL[], nextCells: SheetCellGQL[], viewport: SheetGridViewportVariables) {
	const nextCellMap = new Map(currentCells
		.filter((cell) => !sheetCellIsInViewport(cell, viewport))
		.map((cell) => [
			getSheetGridCellCoordKey(cell.rowIndex, cell.columnIndex),
			cell,
		]));

	nextCells.forEach((cell) => {
		nextCellMap.set(getSheetGridCellCoordKey(cell.rowIndex, cell.columnIndex), cell);
	});

	return Array.from(nextCellMap.values())
		.sort((a, b) => Number(a.rowIndex || 0) - Number(b.rowIndex || 0) || Number(a.columnIndex || 0) - Number(b.columnIndex || 0));
}

/*
 * Return a stable merge key for one fetched Sheet viewport payload.
 */

function getSheetGridMergeKey(sheetGrid?: { cells?: SheetCellGQL[]; pageInfo?: { hasMoreRows?: boolean | null; lastContentRowIndex?: number | null } | null; viewport?: SheetGridViewportVariables | null } | null) {
	if (!sheetGrid?.viewport) {
		return '';
	}

	const viewport = sheetGrid.viewport;
	const cellKey = (sheetGrid.cells || []).map((cell) => [
		cell.id || '',
		cell.rowIndex || '',
		cell.columnIndex || '',
		cell.updatedAt || '',
		cell.rawInput || '',
		cell.value || '',
		cell.textValue || '',
		cell.style || '',
		cell.format || '',
	].join(',')).join('|');

	return [
		viewport.startRowIndex,
		viewport.startColumnIndex,
		viewport.rowCount,
		viewport.columnCount,
		sheetGrid.pageInfo?.hasMoreRows ? '1' : '0',
		sheetGrid.pageInfo?.lastContentRowIndex || '',
		cellKey,
	].join(':');
}

/*
 * Return coordinate-backed rows for one visible Sheet range.
 */

function getSheetVisibleGridRows(visibleRange: { rowStart: number; rowEnd: number }): SheetGridRowGQL[] {
	return Array.from({ length: Math.max(0, visibleRange.rowEnd - visibleRange.rowStart) }, (_value, index) => ({
		rowIndex: visibleRange.rowStart + index + 1,
	}));
}

/*
 * Return the Sheet rows that should be rendered for the current scroll window.
 */

function getSheetRenderedGridRows(params: {
	bufferRows: number;
	renderedRowCount: number;
	totalRowCount: number;
	visibleRowCount: number;
	visibleRange: { rowStart: number; rowEnd: number };
}) {
	const visibleStartRowIndex = Math.min(params.totalRowCount, Math.max(0, params.visibleRange.rowStart + params.bufferRows));
	const beforeVisibleRowCount = Math.max(0, Math.floor((params.renderedRowCount - params.visibleRowCount) / 2));
	const rowStart = Math.min(
		Math.max(0, visibleStartRowIndex - beforeVisibleRowCount),
		Math.max(0, params.totalRowCount - params.renderedRowCount),
	);
	const rowEnd = Math.min(params.totalRowCount, rowStart + params.renderedRowCount);

	return getSheetVisibleGridRows({
		rowEnd,
		rowStart,
	});
}

/*
 * Return whether one object has at least one own value key.
 */

function hasObjectValues(value: Record<string, any>) {
	return Object.keys(value).length > 0;
}

/*
 * Merge and serialize one updated column width into a SheetDesign patch.
 */

function getSheetColumnWidthDesignPatch(columnsDesign: SheetAxisDesignMap, columnKey: string, width: number): Pick<SheetDesignGQL, 'columns'> {
	return {
		columns: JSON.stringify({
			...columnsDesign,
			[columnKey]: {
				...(columnsDesign[columnKey] || {}),
				width: clampSheetColumnWidth(width),
			},
		}),
	};
}

/*
 * Merge and serialize one updated row height into a SheetDesign patch.
 */

function getSheetRowHeightDesignPatch(rowsDesign: SheetAxisDesignMap, rowKey: string, height: number): Pick<SheetDesignGQL, 'rows'> {
	return {
		rows: JSON.stringify({
			...rowsDesign,
			[rowKey]: {
				...(rowsDesign[rowKey] || {}),
				height: clampSheetRowHeight(height),
			},
		}),
	};
}

/*
 * Render a human-editable GraphQL-backed Sheet grid.
 */

export function Sheet(p: SheetProps) {
	const {
		bufferColumns,
		bufferRows,
		children,
		className,
		disabled,
		sheet,
	} = p;
	const organizationId = p.organizationId || sheet.organizationId || null;
	const sheetId = sheet.id || null;
	const containerElement = useSheetGridElementSize<HTMLDivElement>();
	const scrollNodeRef = useRef<HTMLDivElement | null>(null);
	const windowHeight = useSheetGridWindowHeight();
	const [scrollNode, setScrollNode] = useState<HTMLDivElement | null>(null);
	const editStateRef = useRef<SheetUIEditState | null>(null);
	const columnResizeStateRef = useRef<SheetResizeState | null>(null);
	const rowResizeStateRef = useRef<SheetResizeState | null>(null);
	const cellDragSelectionStateRef = useRef<SheetCellDragSelectionState | null>(null);
	const cellUICacheRef = useRef(new Map<string, SheetUICellCacheItem>());
	const cellRenderStoreRef = useRef(createSheetGridUICellRenderStore());
	const cellSaveVersionRef = useRef<Record<string, number>>({});
	const fetchingMoreSheetRowsRef = useRef(false);
	const canFetchMoreSheetRowsRef = useRef(true);
	const loadedRowCountRef = useRef(0);
	const columnsDesign = useMemo(() => parseSheetDesignObject<SheetAxisDesignMap>(sheet.design?.columns), [sheet.design?.columns]);
	const rowsDesign = useMemo(() => parseSheetDesignObject<SheetAxisDesignMap>(sheet.design?.rows), [sheet.design?.rows]);
	const gridDesign = useMemo(() => getSheetGridDesign(sheet), [sheet]);
	const uiColumns = useMemo(() => getSheetUIColumns(gridDesign.columnCount), [gridDesign.columnCount]);
	const visualRowCount = gridDesign.rowCount;
	const rowKeys = useMemo(() => Array.from({ length: visualRowCount }, (_value, index) => String(index + 1)), [visualRowCount]);
	const [scrollState, setScrollState] = useState({
		scrollLeft: 0,
		scrollTop: 0,
	});
	const [columnWidthDrafts, setColumnWidthDrafts] = useState<SheetColumnWidths>({});
	const [rowHeightDrafts, setRowHeightDrafts] = useState<SheetRowHeights>({});
	const [editState, setEditState] = useState<SheetUIEditState | null>(null);
	const [selectedCellKeyMap, setSelectedCellKeyMap] = useState<SheetUISelectedCellKeyMap | null>(null);
	const [selectedCellState, setSelectedCellState] = useState<SheetUISelectedCellState | null>(null);
	const [canFetchMoreSheetRows, setCanFetchMoreSheetRows] = useState(true);
	const [loadedCells, setLoadedCells] = useState<SheetCellGQL[]>([]);
	const [loadedRowCount, setLoadedRowCount] = useState(0);
	const [optimisticCellStyles, setOptimisticCellStyles] = useState<Record<string, SheetCellStyle>>({});
	const [optimisticValues, setOptimisticValues] = useState<Record<string, string | null>>({});
	const [resizeGuide, setResizeGuide] = useState<SheetUIResizeGuide | null>(null);
	const [rowResizeGuide, setRowResizeGuide] = useState<SheetUIRowResizeGuide | null>(null);
	const { editSheetCells } = useEditSheetCells();
	const { updateSheet } = useUpdateSheet();
	const stickyHeaderHeight = SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE;
	const viewportHeight = containerElement.size.height || SHEET_FALLBACK_VIEWPORT_HEIGHT;
	const viewportWidth = containerElement.size.width || SHEET_FALLBACK_VIEWPORT_WIDTH;
	const visibleViewportRowCount = getSheetViewportVisibleRowCount(viewportHeight, stickyHeaderHeight);
	const visibleRangeBufferRows = bufferRows ?? getSheetViewportRowBufferCount(viewportHeight, stickyHeaderHeight);
	const visibleRangeBufferColumns = bufferColumns ?? getSheetViewportColumnBufferCount(viewportWidth);
	const renderedRowCount = useMemo(() => getSheetRenderedRowCount(windowHeight || viewportHeight), [viewportHeight, windowHeight]);
	const initialLoadedRowCount = useMemo(() => getSheetInitialLoadedRowCount(windowHeight || viewportHeight, gridDesign.rowCount), [gridDesign.rowCount, viewportHeight, windowHeight]);
	const loadedVisualRowCount = Math.min(gridDesign.rowCount, Math.max(SHEET_INITIAL_LOADED_ROW_COUNT, loadedRowCount || 0));
	const columnWidths = useMemo(() => getSheetColumnWidths(columnsDesign, columnWidthDrafts), [columnWidthDrafts, columnsDesign]);
	const rowHeights = useMemo(() => getSheetRowHeights(rowsDesign, rowHeightDrafts), [rowHeightDrafts, rowsDesign]);
	const columnMetricsState = useMemo(() => getSheetColumnMetrics(uiColumns, columnWidths), [columnWidths, uiColumns]);
	const rowMetricsState = useMemo(() => getSheetRowMetrics(rowKeys, rowHeights), [rowHeights, rowKeys]);
	const rowMetricKeys = useMemo(() => rowMetricsState.metrics.map((metric) => metric.rowKey), [rowMetricsState.metrics]);
	const frozenColumnCount = Math.min(gridDesign.frozenColumns, uiColumns.length);
	const stickyColumnEndLeft = SHEET_ROW_NUMBER_WIDTH + columnMetricsState.metrics.slice(0, frozenColumnCount).reduce((sum, metric) => sum + metric.width, 0);
	const displayColumnMetrics = useMemo(() => {
		return columnMetricsState.metrics.map((metric) => {
			if (metric.columnIndex < frozenColumnCount) {
				return metric;
			}

			return {
				...metric,
				left: metric.left + SHEET_STICKY_SPACER_SIZE,
			};
		});
	}, [columnMetricsState.metrics, frozenColumnCount]);
	const columnOffsetsWithStickySpacer = useMemo(() => {
		return columnMetricsState.offsets.map((offset, index) => {
			return index > frozenColumnCount ? offset + SHEET_STICKY_SPACER_SIZE : offset;
		});
	}, [columnMetricsState.offsets, frozenColumnCount]);
	const canvasWidth = SHEET_ROW_NUMBER_WIDTH + columnMetricsState.totalWidth + SHEET_STICKY_SPACER_SIZE;
	const canvasHeight = stickyHeaderHeight + (rowMetricsState.offsets[loadedVisualRowCount] || 0);
	const visibleRange = useMemo(() => getSheetVisibleRange({
		bufferColumns: visibleRangeBufferColumns,
		bufferRows: visibleRangeBufferRows,
		columnCount: uiColumns.length,
		columnOffsets: columnOffsetsWithStickySpacer,
		containerHeight: viewportHeight,
		containerWidth: viewportWidth,
		headerHeight: stickyHeaderHeight,
		rowCount: loadedVisualRowCount,
		rowOffsets: rowMetricsState.offsets,
		scrollLeft: scrollState.scrollLeft,
		scrollTop: scrollState.scrollTop,
	}), [
		columnOffsetsWithStickySpacer,
		loadedVisualRowCount,
		rowMetricsState.offsets,
		scrollState.scrollLeft,
		scrollState.scrollTop,
		stickyHeaderHeight,
		uiColumns.length,
		viewportHeight,
		viewportWidth,
		visibleRangeBufferColumns,
		visibleRangeBufferRows,
	]);
	const viewportColumnStart = frozenColumnCount > 0 ? 0 : visibleRange.columnStart;
	const viewportColumnEnd = frozenColumnCount > 0 ? Math.max(visibleRange.columnEnd, frozenColumnCount) : visibleRange.columnEnd;
	const viewport = useMemo<SheetGridViewportVariables>(() => {
		return {
			startColumnIndex: viewportColumnStart + 1,
			startRowIndex: 1,
			columnCount: Math.max(1, viewportColumnEnd - viewportColumnStart),
			rowCount: initialLoadedRowCount,
		};
	}, [initialLoadedRowCount, viewportColumnEnd, viewportColumnStart]);
	const columnViewportKey = `${viewport.startColumnIndex}:${viewport.columnCount}`;
	const { sheetGrid, refetch, fetchMore } = useSheetGrid(sheetId, organizationId, viewport);
	const sheetGridMergeKey = useMemo(() => getSheetGridMergeKey(sheetGrid), [sheetGrid?.cells, sheetGrid?.pageInfo, sheetGrid?.viewport]);
	const visibleColumns = useMemo(() => {
		const visibleColumnIndexes = new Set<number>();

		for (let index = 0; index < frozenColumnCount && index < displayColumnMetrics.length; index += 1) {
			visibleColumnIndexes.add(index);
		}

		for (let index = visibleRange.columnStart; index < visibleRange.columnEnd; index += 1) {
			visibleColumnIndexes.add(index);
		}

		return Array.from(visibleColumnIndexes)
			.sort((a, b) => a - b)
			.map((index) => displayColumnMetrics[index])
			.filter(Boolean);
	}, [displayColumnMetrics, frozenColumnCount, visibleRange.columnEnd, visibleRange.columnStart]);
	const cellLookup = useMemo(() => new Map(
		loadedCells.map((cell) => [
			getSheetGridCellCoordKey(cell.rowIndex, cell.columnIndex),
			cell,
		]),
	), [loadedCells]);
	const selectedRangeBoxPosition = useMemo(() => {
		return getSheetGridSelectionBoxPosition({
			columnMetrics: displayColumnMetrics,
			rowMetrics: rowMetricsState.metrics,
			selectedCellKeyMap,
			stickyHeaderHeight,
		});
	}, [displayColumnMetrics, rowMetricsState.metrics, selectedCellKeyMap, stickyHeaderHeight]);
	const sheetOverlayContent = selectedRangeBoxPosition
		? <div
			className='sheet_selection_box abs noclick'
			data-sheet-selection-box='true'
			style={{
				height: selectedRangeBoxPosition.height,
				left: selectedRangeBoxPosition.left,
				top: selectedRangeBoxPosition.top,
				width: selectedRangeBoxPosition.width,
			}}
		/>
		: null;

	editStateRef.current = editState;

	useEffect(() => {
		loadedRowCountRef.current = loadedRowCount;
	}, [loadedRowCount]);

	useEffect(() => {
		canFetchMoreSheetRowsRef.current = canFetchMoreSheetRows;
	}, [canFetchMoreSheetRows]);

	useEffect(() => {
		setLoadedCells([]);
	}, [sheetId]);

	useEffect(() => {
		fetchingMoreSheetRowsRef.current = false;
		canFetchMoreSheetRowsRef.current = false;
		loadedRowCountRef.current = initialLoadedRowCount;
		setCanFetchMoreSheetRows(false);
		setLoadedRowCount(initialLoadedRowCount);
	}, [columnViewportKey, initialLoadedRowCount, sheetId]);

	useEffect(() => {
		if (!sheetGridMergeKey || !sheetGrid?.viewport) {
			return;
		}

		const fetchedViewport = sheetGrid.viewport as SheetGridViewportVariables;
		const pageInfo = sheetGrid.pageInfo;
		setLoadedCells((currentCells) => mergeSheetCellsForViewport(currentCells, sheetGrid.cells || [], fetchedViewport));
		canFetchMoreSheetRowsRef.current = !!pageInfo?.hasMoreRows;
		setCanFetchMoreSheetRows(!!pageInfo?.hasMoreRows);
		setLoadedRowCount(() => {
			const nextRowCount = getSheetLoadedRowCountFromPageInfo(pageInfo, initialLoadedRowCount, gridDesign.rowCount);
			loadedRowCountRef.current = nextRowCount;

			return nextRowCount;
		});
	}, [gridDesign.rowCount, initialLoadedRowCount, sheetGridMergeKey]);

	/*
	 * Fetch the next Sheet row window for the current horizontal viewport.
	 */

	const fetchMoreSheetRows = useCallback(async () => {
		const currentLoadedRowCount = loadedRowCountRef.current;

		if (fetchingMoreSheetRowsRef.current || !canFetchMoreSheetRowsRef.current || currentLoadedRowCount >= gridDesign.rowCount || !organizationId || !sheetId) {
			return;
		}

		const remainingRowCount = gridDesign.rowCount - currentLoadedRowCount;
		const nextRowCount = Math.min(SHEET_FETCH_ROW_COUNT, remainingRowCount);
		if (nextRowCount <= 0) {
			return;
		}

		const nextViewport: SheetGridViewportVariables = {
			startColumnIndex: viewport.startColumnIndex,
			startRowIndex: currentLoadedRowCount + 1,
			columnCount: viewport.columnCount,
			rowCount: nextRowCount,
		};

		fetchingMoreSheetRowsRef.current = true;

		try {
			const result = await fetchMore({
				variables: {
					organizationId,
					sheetId,
					viewport: nextViewport,
				},
			});
			const nextSheetGrid = result?.data?.sheetGrid || result?.sheetGrid;

			if (nextSheetGrid?.viewport) {
				const fetchedViewport = nextSheetGrid.viewport as SheetGridViewportVariables;
				const lastContentRowIndex = Number(nextSheetGrid.pageInfo?.lastContentRowIndex || 0);
				const nextLoadedRowIndex = lastContentRowIndex
					? Math.min(getSheetViewportEndRowIndex(fetchedViewport), lastContentRowIndex)
					: currentLoadedRowCount;
				canFetchMoreSheetRowsRef.current = !!nextSheetGrid.pageInfo?.hasMoreRows;
				setCanFetchMoreSheetRows(!!nextSheetGrid.pageInfo?.hasMoreRows);
				setLoadedCells((currentCells) => mergeSheetCellsForViewport(currentCells, nextSheetGrid.cells || [], fetchedViewport));
				setLoadedRowCount((currentRowCount) => {
					const nextRowCount = getNextSheetLoadedRowCount(currentRowCount, nextLoadedRowIndex, gridDesign.rowCount);
					loadedRowCountRef.current = nextRowCount;

					return nextRowCount;
				});
			}
		} finally {
			fetchingMoreSheetRowsRef.current = false;
		}
	}, [fetchMore, gridDesign.rowCount, organizationId, sheetId, viewport.columnCount, viewport.startColumnIndex]);

	useEffect(() => {
		if (loadedRowCount <= 0) {
			return;
		}

		if (!canFetchMoreSheetRows || loadedRowCount >= gridDesign.rowCount) {
			return;
		}

		if (visibleRange.rowEnd >= loadedRowCount - SHEET_FETCH_BUFFER_ROWS) {
			void fetchMoreSheetRows();
		}
	}, [canFetchMoreSheetRows, fetchMoreSheetRows, gridDesign.rowCount, loadedRowCount, visibleRange.rowEnd]);

	useIsomorphicLayoutEffect(() => {
		if (!scrollNode) {
			return;
		}

		const maxScrollTop = Math.max(0, canvasHeight - viewportHeight);
		const nextScrollTop = Math.min(scrollNode.scrollTop, maxScrollTop);

		if (scrollNode.scrollTop !== nextScrollTop) {
			scrollNode.scrollTop = nextScrollTop;
		}

		setScrollState((currentState) => {
			if (currentState.scrollTop === nextScrollTop) {
				return currentState;
			}

			return {
				...currentState,
				scrollTop: nextScrollTop,
			};
		});
	}, [canvasHeight, scrollNode, viewportHeight]);

	const setScrollRef = useCallback((node: HTMLDivElement | null) => {
		if (node && node.tabIndex < 0) {
			node.tabIndex = -1;
		}

		scrollNodeRef.current = node;
		setScrollNode(node);
	}, []);

	const { queue: queueSheetCellSave } = useDebouncedCellSaveBatch<SheetPendingCellSave>({
		getKey: (item) => item.optimisticKey,
		onError: (items) => {
			setOptimisticValues((currentValues) => {
				const nextValues = {
					...currentValues,
				};

				items.forEach((item) => {
					if (cellSaveVersionRef.current[item.optimisticKey] === item.saveVersion) {
						delete nextValues[item.optimisticKey];
					}
				});

				return nextValues;
			});
		},
		onBeaconFlush: (items) => {
			const groups = groupCellSaveItemsByTarget(items, (item) => ({
				organizationId: item.organizationId,
				targetId: item.sheetId,
			}));

			return sendGroupedCellSaveItems(groups, (group) => {
				return sendCellSaveBeacon({
					cells: group.items.map((item) => ({
						cell: item.cell,
						clear: item.clear || false,
					})),
					organizationId: group.organizationId || null,
					targetId: group.targetId || null,
					targetType: 'sheet',
				});
			});
		},
		onFlush: async (items) => {
			const groups = groupCellSaveItemsByTarget(items, (item) => ({
				organizationId: item.organizationId,
				targetId: item.sheetId,
			}));

			for (const group of groups) {
				if (!group.organizationId || !group.targetId) {
					continue;
				}

				await editSheetCells({
					variables: {
						organizationId: group.organizationId,
						sheetId: group.targetId,
						cells: group.items.map((item) => ({
							cell: item.cell,
							clear: item.clear || false,
						})),
					},
				});
			}

			refetch();
		},
	});

	const saveSheetDesign = useCallback(async (design: Pick<SheetDesignGQL, 'columns' | 'rows'>) => {
		if (!organizationId || !sheetId) {
			return;
		}

		await updateSheet({
			variables: {
				organizationId,
				sheetId,
				design,
			},
		});

		refetch();
	}, [organizationId, refetch, sheetId, updateSheet]);

	const saveEditState = useCallback(async (nextValue?: string) => {
		const activeEditState = editStateRef.current;
		if (!activeEditState || !organizationId || !sheetId) {
			setEditState(null);
			return;
		}

		const rawInput = nextValue ?? activeEditState.draftValue;
		const rowIndex = Number(activeEditState.rowId);
		const columnIndex = Number(activeEditState.cellKey);
		const coordKey = getSheetGridCellCoordKey(rowIndex, columnIndex);
		const activeCell = cellLookup.get(coordKey);
		const optimisticKey = getSheetCellKey(activeEditState.rowId, activeEditState.cellKey);
		const saveVersion = (cellSaveVersionRef.current[optimisticKey] || 0) + 1;
		cellSaveVersionRef.current[optimisticKey] = saveVersion;

		setEditState(null);
		editStateRef.current = null;
		setOptimisticValues((currentValues) => ({
			...currentValues,
			[optimisticKey]: rawInput || null,
		}));
		queueSheetCellSave({
			cell: {
				rowIndex,
				columnIndex,
				rawInput,
				regionId: activeCell?.regionId || undefined,
			},
			clear: !rawInput,
			optimisticKey,
			organizationId,
			saveVersion,
			sheetId,
		});
	}, [cellLookup, organizationId, queueSheetCellSave, sheetId]);

	const openCellEditor = useCallback((rowId: string, cellKey: string, draftValue?: string) => {
		const rowIndex = Number(rowId);
		const columnIndex = Number(cellKey);
		const cell = cellLookup.get(getSheetGridCellCoordKey(rowIndex, columnIndex));
		const nextEditState = {
			rowId,
			cellKey,
			draftValue: draftValue ?? getSheetCellDraftValue(cell),
		};

		setSelectedCellState({
			rowId,
			cellKey,
		});
		setEditState(nextEditState);
		editStateRef.current = nextEditState;
	}, [cellLookup]);

	const selectCellRange = useCallback((anchorCell: SheetCellSelectionState, latestCell: SheetCellSelectionState, started: boolean) => {
		setSelectedCellState(latestCell);
		setSelectedCellKeyMap(started
			? getSheetSelectedCellKeyMapForGridRange({
				activeCell: latestCell,
				anchorCell,
				columnMetrics: columnMetricsState.metrics,
				rowIds: rowMetricKeys,
			})
			: null);
		setEditState(null);
		editStateRef.current = null;
	}, [columnMetricsState.metrics, rowMetricKeys]);

	/*
	 * Scroll the Sheet viewport just enough to keep one cell visible.
	 */

	const scrollSheetCellIntoView = useCallback((cellState: SheetCellSelectionState) => {
		const columnMetric = displayColumnMetrics.find((metric) => metric.column.key === cellState.cellKey);
		const rowMetric = rowMetricsState.metrics.find((metric) => metric.rowKey === cellState.rowId);

		if (!scrollNode || !columnMetric || !rowMetric) {
			return;
		}

		let nextScrollLeft = scrollNode.scrollLeft;
		let nextScrollTop = scrollNode.scrollTop;
		const cellTop = stickyHeaderHeight + rowMetric.top;
		const cellBottom = cellTop + rowMetric.height;
		const visibleTop = scrollNode.scrollTop + stickyHeaderHeight;
		const visibleBottom = scrollNode.scrollTop + viewportHeight;

		if (cellTop < visibleTop) {
			nextScrollTop = cellTop - stickyHeaderHeight;
		} else if (cellBottom > visibleBottom) {
			nextScrollTop = cellBottom - viewportHeight;
		}

		if (columnMetric.columnIndex >= frozenColumnCount) {
			const cellLeft = SHEET_ROW_NUMBER_WIDTH + columnMetric.left;
			const cellRight = cellLeft + columnMetric.width;
			const visibleLeft = scrollNode.scrollLeft + stickyColumnEndLeft;
			const visibleRight = scrollNode.scrollLeft + viewportWidth;

			if (cellLeft < visibleLeft) {
				nextScrollLeft = cellLeft - stickyColumnEndLeft;
			} else if (cellRight > visibleRight) {
				nextScrollLeft = cellRight - viewportWidth;
			}
		}

		nextScrollLeft = Math.min(Math.max(0, nextScrollLeft), Math.max(0, canvasWidth - viewportWidth));
		nextScrollTop = Math.min(Math.max(0, nextScrollTop), Math.max(0, canvasHeight - viewportHeight));
		scrollNode.scrollLeft = nextScrollLeft;
		scrollNode.scrollTop = nextScrollTop;
		setScrollState((currentState) => {
			if (currentState.scrollLeft === nextScrollLeft && currentState.scrollTop === nextScrollTop) {
				return currentState;
			}

			return {
				scrollLeft: nextScrollLeft,
				scrollTop: nextScrollTop,
			};
		});
	}, [canvasHeight, canvasWidth, displayColumnMetrics, frozenColumnCount, rowMetricsState.metrics, scrollNode, stickyColumnEndLeft, stickyHeaderHeight, viewportHeight, viewportWidth]);

	/*
	 * Move the selected Sheet cell horizontally when no multi-cell range is active.
	 */

	const moveSheetSelectedCellByColumn = useCallback((direction: 'forward' | 'backward') => {
		const currentCell = selectedCellState;
		const currentColumnIndex = currentCell ? columnMetricsState.metrics.findIndex((metric) => metric.column.key === currentCell.cellKey) : -1;
		const currentRowIndex = currentCell ? rowMetricsState.metrics.findIndex((metric) => metric.rowKey === currentCell.rowId) : -1;
		const nextColumnIndex = direction === 'backward'
			? Math.max(0, currentColumnIndex - 1)
			: Math.min(columnMetricsState.metrics.length - 1, currentColumnIndex + 1);
		const nextColumn = columnMetricsState.metrics[nextColumnIndex];
		const nextRow = rowMetricsState.metrics[Math.max(0, currentRowIndex)];

		if (!nextColumn || !nextRow) {
			return;
		}

		const nextCell = {
			cellKey: nextColumn.column.key,
			rowId: nextRow.rowKey,
		};

		scrollSheetCellIntoView(nextCell);
		selectCellRange(nextCell, nextCell, false);
	}, [columnMetricsState.metrics, rowMetricsState.metrics, scrollSheetCellIntoView, selectCellRange, selectedCellState]);

	/*
	 * Move the selected Sheet cell by one keyboard arrow step.
	 */

	const handleSheetArrowKeyNavigation = useCallback((direction: 'left' | 'right' | 'up' | 'down', extendSelection = false) => {
		const nextSelectedCell = getSheetGridArrowNavigationSelection({
			columnMetrics: columnMetricsState.metrics,
			direction,
			rowIds: rowMetricKeys,
			selectedCellState,
		});

		if (!nextSelectedCell) {
			return;
		}

		scrollSheetCellIntoView(nextSelectedCell);
		if (extendSelection && selectedCellState) {
			const anchorCell = getSheetGridSelectionAnchorCell({
				activeCell: selectedCellState,
				columnMetrics: columnMetricsState.metrics,
				rowIds: rowMetricKeys,
				selectedCellKeyMap,
			}) || selectedCellState;

			selectCellRange(anchorCell, nextSelectedCell, true);
			return;
		}

		selectCellRange(nextSelectedCell, nextSelectedCell, false);
	}, [columnMetricsState.metrics, rowMetricKeys, scrollSheetCellIntoView, selectCellRange, selectedCellKeyMap, selectedCellState]);

	/*
	 * Move only the active Sheet cell border through the current multi-cell selection.
	 */

	const handleSheetTabKeyNavigation = useCallback((direction: 'forward' | 'backward') => {
		if (!selectedCellKeyMap || Object.keys(selectedCellKeyMap).length <= 1) {
			moveSheetSelectedCellByColumn(direction);
			return;
		}

		const nextActiveCell = getNextActiveSheetSelectedCell({
			activeCell: selectedCellState,
			columnMetrics: columnMetricsState.metrics,
			direction,
			rowIds: rowMetricKeys,
			selectedCellKeyMap,
		});

		if (!nextActiveCell) {
			return;
		}

		scrollSheetCellIntoView(nextActiveCell);
		setSelectedCellState(nextActiveCell);
		setEditState(null);
		editStateRef.current = null;
	}, [columnMetricsState.metrics, moveSheetSelectedCellByColumn, rowMetricKeys, scrollSheetCellIntoView, selectedCellKeyMap, selectedCellState]);

	/*
	 * Select visible data cells, or the visible viewport cells when the viewport is empty.
	 */

	const selectAllSheetCells = useCallback(() => {
		const visibleCells = getSheetViewportVisibleCells({
			columnMetrics: displayColumnMetrics,
			columnOffsets: columnOffsetsWithStickySpacer,
			frozenColumnCount,
			rowMetrics: rowMetricsState.metrics,
			rowOffsets: rowMetricsState.offsets,
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyHeaderHeight,
			viewportHeight,
			viewportWidth,
		});
		const visibleDataCells = visibleCells.filter((cell) => {
			const backendCell = cellLookup.get(getSheetGridCellCoordKey(Number(cell.rowId), Number(cell.cellKey)));
			const optimisticKey = getSheetCellKey(cell.rowId, cell.cellKey);

			return sheetCellHasData(backendCell) || sheetCellHasFormatting(backendCell, optimisticCellStyles[optimisticKey]);
		});
		const selectedCells = visibleDataCells.length ? visibleDataCells : visibleCells;
		const activeCell = selectedCells[0] || null;

		if (!activeCell) {
			return;
		}

		setSelectedCellState(activeCell);
		setSelectedCellKeyMap(selectedCells.length > 1 ? getSheetSelectedCellKeyMapFromCells(selectedCells) : null);
		setEditState(null);
		editStateRef.current = null;
	}, [
		cellLookup,
		columnOffsetsWithStickySpacer,
		displayColumnMetrics,
		frozenColumnCount,
		optimisticCellStyles,
		rowMetricsState.metrics,
		rowMetricsState.offsets,
		scrollState.scrollLeft,
		scrollState.scrollTop,
		stickyHeaderHeight,
		viewportHeight,
		viewportWidth,
	]);

	const handleSheetContextMenuEditCell = useCallback((target: SheetContextMenuTarget) => {
		openCellEditor(target.rowId, target.cellKey);
	}, [openCellEditor]);

	const handleSheetContextMenuFormatCells = useCallback((target: SheetContextMenuTarget, format: SheetContextMenuFormat) => {
		if (!organizationId || !sheetId || !target.canEdit) {
			return;
		}

		const stylePatch: SheetCellStyle = format.name === 'textColor'
			? { color: format.value }
			: { backgroundColor: format.value };
		const nextStylesByKey = target.cells.reduce<Record<string, SheetCellStyle>>((acc, targetCell) => {
			const rowIndex = Number(targetCell.rowId);
			const columnIndex = Number(targetCell.cellKey);
			const cell = cellLookup.get(getSheetGridCellCoordKey(rowIndex, columnIndex));
			const optimisticKey = getSheetCellKey(targetCell.rowId, targetCell.cellKey);

			acc[optimisticKey] = {
				...parseSheetCellStyleObject(cell?.style),
				...stylePatch,
			};
			return acc;
		}, {});

		setOptimisticCellStyles((currentStyles) => ({
			...currentStyles,
			...nextStylesByKey,
		}));

		void editSheetCells({
			variables: {
				organizationId,
				sheetId,
				cells: target.cells.map((targetCell) => {
					const rowIndex = Number(targetCell.rowId);
					const columnIndex = Number(targetCell.cellKey);
					const cell = cellLookup.get(getSheetGridCellCoordKey(rowIndex, columnIndex));
					const optimisticKey = getSheetCellKey(targetCell.rowId, targetCell.cellKey);

					return {
						cell: {
							rowIndex,
							columnIndex,
							rawInput: getSheetCellDraftValue(cell),
							regionId: cell?.regionId || undefined,
							style: JSON.stringify(nextStylesByKey[optimisticKey] || stylePatch),
						},
						clear: false,
					};
				}),
			},
		}).then(() => {
			refetch();
		});
	}, [cellLookup, editSheetCells, organizationId, refetch, sheetId]);

	const { closeSheetContextMenu, openSheetContextMenu } = useSheetContextMenu({
		onEditCell: handleSheetContextMenuEditCell,
		onFormatCells: handleSheetContextMenuFormatCells,
	});

	const startColumnResize = useCallback((columnKey: string, clientX: number) => {
		const startWidth = columnWidths[columnKey] || SHEET_COLUMN_WIDTH;

		columnResizeStateRef.current = {
			key: columnKey,
			startClientPosition: clientX,
			startSize: startWidth,
		};

		const onPointerMove = (event: PointerEvent) => {
			const state = columnResizeStateRef.current;
			if (!state) {
				return;
			}

			const latestWidth = clampSheetColumnWidth(state.startSize + event.clientX - state.startClientPosition);
			state.latestSize = latestWidth;
			setColumnWidthDrafts((currentDrafts) => ({
				...currentDrafts,
				[state.key]: latestWidth,
			}));
			const metric = displayColumnMetrics.find((item) => item.column.key === state.key);
			if (metric) {
				setResizeGuide({
					columnKey: state.key,
					height: canvasHeight,
					left: SHEET_ROW_NUMBER_WIDTH + metric.left + latestWidth,
				});
			}
		};

		const onPointerUp = () => {
			const state = columnResizeStateRef.current;
			columnResizeStateRef.current = null;
			setResizeGuide(null);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);

			if (state?.latestSize) {
				void saveSheetDesign(getSheetColumnWidthDesignPatch(columnsDesign, state.key, state.latestSize));
			}
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerUp);
	}, [canvasHeight, columnWidths, columnsDesign, displayColumnMetrics, saveSheetDesign]);

	const startRowResize = useCallback((rowKey: string, clientY: number) => {
		const startHeight = rowHeights[rowKey] || SHEET_ROW_HEIGHT;

		rowResizeStateRef.current = {
			key: rowKey,
			startClientPosition: clientY,
			startSize: startHeight,
		};

		const onPointerMove = (event: PointerEvent) => {
			const state = rowResizeStateRef.current;
			if (!state) {
				return;
			}

			const latestHeight = clampSheetRowHeight(state.startSize + event.clientY - state.startClientPosition);
			state.latestSize = latestHeight;
			setRowHeightDrafts((currentDrafts) => ({
				...currentDrafts,
				[state.key]: latestHeight,
			}));
			const metric = rowMetricsState.metrics.find((item) => item.rowKey === state.key);
			if (metric) {
				setRowResizeGuide({
					rowKey: state.key,
					top: stickyHeaderHeight + metric.top + latestHeight,
					width: canvasWidth,
				});
			}
		};

		const onPointerUp = () => {
			const state = rowResizeStateRef.current;
			rowResizeStateRef.current = null;
			setRowResizeGuide(null);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);

			if (state?.latestSize) {
				void saveSheetDesign(getSheetRowHeightDesignPatch(rowsDesign, state.key, state.latestSize));
			}
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerUp);
	}, [canvasWidth, rowHeights, rowMetricsState.metrics, rowsDesign, saveSheetDesign, stickyHeaderHeight]);

	useEffect(() => {
		if (!scrollNode) {
			return;
		}

		const syncScrollState = () => {
			setScrollState((currentState) => {
				const nextScrollLeft = scrollNode.scrollLeft;
				const nextScrollTop = scrollNode.scrollTop;
				if (currentState.scrollLeft === nextScrollLeft && currentState.scrollTop === nextScrollTop) {
					return currentState;
				}

				return {
					scrollLeft: nextScrollLeft,
					scrollTop: nextScrollTop,
				};
			});
		};
		const onScroll = () => {
			closeSheetContextMenu();
			syncScrollState();
		};

		scrollNode.addEventListener('scroll', onScroll);
		syncScrollState();

		return () => {
			scrollNode.removeEventListener('scroll', onScroll);
		};
	}, [closeSheetContextMenu, scrollNode]);

	useEffect(() => {
		if (!sheetGrid?.cells) {
			return;
		}

		setOptimisticValues((currentValues) => hasObjectValues(currentValues) ? {} : currentValues);
		setOptimisticCellStyles((currentStyles) => hasObjectValues(currentStyles) ? {} : currentStyles);
	}, [sheetGrid?.cells]);

	useEffect(() => {
		if (!scrollNode) {
			return;
		}

		const onDoubleClick = (event: MouseEvent) => {
			if (disabled) {
				return;
			}

			const editorElement = getClosestSheetGridElement(event.target, SHEET_GRID_EDITOR_SELECTOR);
			const cellElement = getClosestSheetGridElement(event.target, '[data-sheet-cell="true"]');
			const cellState = getSheetGridCellSelectionFromElement(cellElement);

			if (editorElement || !cellState) {
				return;
			}

			openCellEditor(cellState.rowId, cellState.cellKey);
		};

		const onFocusOut = (event: FocusEvent) => {
			const editorElement = getClosestSheetGridElement(event.target, SHEET_GRID_EDITOR_SELECTOR);
			if (editorElement) {
				void saveEditState(getSheetEditorValue(editorElement));
			}
		};

		const onKeyDown = (event: KeyboardEvent) => {
			const { editorElement } = getSheetGridKeyboardElements(event, {
				editorSelector: SHEET_GRID_EDITOR_SELECTOR,
			});

			handleSheetGridKeyboardEvent(event, {
				editorElement,
			}, {
				blocked: isSheetGridShortcutBlockedByActiveInput(SHEET_GRID_EDITOR_SELECTOR),
				hasActiveCell: !!columnMetricsState.metrics.length && !!rowMetricsState.metrics.length,
				isTextInputKey: isSheetGridTextInputKey(event),
				onArrow: handleSheetArrowKeyNavigation,
				onDismissEditor: () => {
					setEditState(null);
					editStateRef.current = null;
				},
				onEditorCommitValue: (activeEditorElement) => saveEditState(getSheetEditorValue(activeEditorElement)),
				onEnter: () => {
					if (!disabled && selectedCellState) {
						openCellEditor(selectedCellState.rowId, selectedCellState.cellKey);
					}
				},
				onEscapeSelection: () => {
					setSelectedCellKeyMap(null);
					setEditState(null);
					editStateRef.current = null;
				},
				onSelectAll: selectAllSheetCells,
				onTab: handleSheetTabKeyNavigation,
				onTextInput: (pressed) => {
					if (!disabled && selectedCellState) {
						openCellEditor(selectedCellState.rowId, selectedCellState.cellKey, pressed);
					}
				},
			});
		};

		const onPointerDown = (event: PointerEvent) => {
			dismissSheetGridContextMenuOnPointerDown(event, closeSheetContextMenu);

			const editorElement = getClosestSheetGridElement(event.target, SHEET_GRID_EDITOR_SELECTOR);
			const columnHandle = getClosestSheetGridElement(event.target, '[data-sheet-column-resize-handle]');
			const rowHandle = getClosestSheetGridElement(event.target, '[data-sheet-row-resize-handle]');
			const cellElement = getClosestSheetGridElement(event.target, '[data-sheet-cell="true"]');
			const anchorCell = getSheetGridCellSelectionFromElement(cellElement);

			if (columnHandle && !disabled && event.button === 0) {
				event.preventDefault();
				startColumnResize(columnHandle.getAttribute('data-sheet-column-resize-handle') || '', event.clientX);
				return;
			}

			if (rowHandle && !disabled && event.button === 0) {
				event.preventDefault();
				startRowResize(rowHandle.dataset.rowId || rowHandle.getAttribute('data-sheet-row-resize-handle') || '', event.clientY);
				return;
			}

			if (editorElement || event.button !== 0 || !anchorCell) {
				return;
			}

			event.preventDefault();
			scrollNode.focus();
			selectCellRange(anchorCell, anchorCell, false);
			cellDragSelectionStateRef.current = {
				anchorCell,
				latestCell: anchorCell,
				pointerId: event.pointerId,
				started: false,
			};

			const onPointerMove = (moveEvent: PointerEvent) => {
				const dragState = cellDragSelectionStateRef.current;

				if (!dragState || dragState.pointerId !== moveEvent.pointerId) {
					return;
				}

				const targetElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
				const targetCellElement = getClosestSheetGridElement(targetElement, '[data-sheet-cell="true"]');
				const latestCell = getSheetGridCellSelectionFromElement(targetCellElement);

				if (!latestCell) {
					return;
				}

				const started = dragState.started ||
					dragState.anchorCell.rowId !== latestCell.rowId ||
					dragState.anchorCell.cellKey !== latestCell.cellKey;

				dragState.latestCell = latestCell;
				dragState.started = started;
				moveEvent.preventDefault();
				selectCellRange(dragState.anchorCell, latestCell, started);
			};
			const onPointerUp = (upEvent: PointerEvent) => {
				const dragState = cellDragSelectionStateRef.current;

				if (dragState?.pointerId === upEvent.pointerId) {
					cellDragSelectionStateRef.current = null;
				}

				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				window.removeEventListener('pointercancel', onPointerUp);
			};

			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', onPointerUp);
			window.addEventListener('pointercancel', onPointerUp);
		};

		const onContextMenu = (event: MouseEvent) => {
			const editorElement = getClosestSheetGridElement(event.target, SHEET_GRID_EDITOR_SELECTOR);
			const cellElement = getClosestSheetGridElement(event.target, '[data-sheet-cell="true"]');
			const cellState = getSheetGridCellSelectionFromElement(cellElement);

			if (editorElement || !cellState) {
				return;
			}

			const rowIndex = Number(cellState.rowId);
			const columnIndex = Number(cellState.cellKey);
			const cell = cellLookup.get(getSheetGridCellCoordKey(rowIndex, columnIndex));
			const optimisticKey = getSheetCellKey(cellState.rowId, cellState.cellKey);
			const cellStyle = getSheetUICellStyle(cell, optimisticCellStyles[optimisticKey]);
			const targetCells = getSheetContextMenuTargetCells({
				clickedCell: cellState,
				selectedCellKeyMap,
			});

			event.preventDefault();
			if (!selectedCellKeyMap?.[optimisticKey]) {
				selectCellRange(cellState, cellState, false);
			}
			openSheetContextMenu(event, {
				canEdit: !disabled,
				cells: targetCells,
				cellKey: cellState.cellKey,
				displayValue: getSheetCellDisplayValue(cell, optimisticValues[optimisticKey]),
				fillColor: cellStyle?.backgroundColor || null,
				rowId: cellState.rowId,
				textColor: cellStyle?.color || null,
			});
		};

		scrollNode.addEventListener('dblclick', onDoubleClick);
		scrollNode.addEventListener('focusout', onFocusOut);
		scrollNode.addEventListener('pointerdown', onPointerDown);
		scrollNode.addEventListener('contextmenu', onContextMenu);
		const removeSheetGridKeyboardEventListener = addSheetGridKeyboardEventListener(onKeyDown);

		return () => {
			scrollNode.removeEventListener('dblclick', onDoubleClick);
			scrollNode.removeEventListener('focusout', onFocusOut);
			scrollNode.removeEventListener('pointerdown', onPointerDown);
			scrollNode.removeEventListener('contextmenu', onContextMenu);
			removeSheetGridKeyboardEventListener();
		};
	}, [
		cellLookup,
		closeSheetContextMenu,
		columnMetricsState.metrics,
		disabled,
		handleSheetArrowKeyNavigation,
		openCellEditor,
		openSheetContextMenu,
		optimisticCellStyles,
		optimisticValues,
		rowMetricsState.metrics,
		saveEditState,
		scrollNode,
		selectAllSheetCells,
		selectCellRange,
		selectedCellKeyMap,
		selectedCellState,
		startColumnResize,
		startRowResize,
		handleSheetTabKeyNavigation,
	]);

	const visibleRows = useMemo<SheetUIRowSlot[]>(() => {
		const gridRows = getSheetRenderedGridRows({
			bufferRows: visibleRangeBufferRows,
			renderedRowCount,
			totalRowCount: loadedVisualRowCount,
			visibleRowCount: visibleViewportRowCount,
			visibleRange,
		});
		const activeRenderKeys = new Set<string>();
		const rowWidth = Math.max(canvasWidth, viewportWidth);

		const visibleRowSlots = gridRows.map((row: SheetGridRowGQL) => {
			const rowIndex = Number(row.rowIndex || 0);
			const rowKey = String(rowIndex);
			const rowMetric = rowMetricsState.metrics[rowIndex - 1];
			const cellsByKey = visibleColumns.reduce<Record<string, SheetUICell>>((acc, columnMetric) => {
				const columnIndex = Number(columnMetric.column.key);
				const cell = cellLookup.get(getSheetGridCellCoordKey(rowIndex, columnIndex));
				const optimisticKey = getSheetCellKey(rowKey, columnMetric.column.key);
				const cellStyle = getSheetUICellStyle(cell, optimisticCellStyles[optimisticKey]);
				const displayValue = getSheetCellDisplayValue(cell, optimisticValues[optimisticKey]);
				const draftValue = getSheetCellDraftValue(cell);
				const canEdit = !disabled;
				const signature = getSheetUICellSignature({
					canEdit,
					cellStyle,
					displayValue,
					draftValue,
				});
				const cachedCell = cellUICacheRef.current.get(optimisticKey);
				const uiCell = cachedCell?.signature === signature
					? cachedCell.cell
					: {
						cellKey: columnMetric.column.key,
						canEdit,
						cellStyle,
						displayValue,
						draftValue,
					};

				if (cachedCell?.cell !== uiCell) {
					cellUICacheRef.current.set(optimisticKey, {
						cell: uiCell,
						signature,
					});
				}

				acc[columnMetric.column.key] = uiCell;
				activeRenderKeys.add(optimisticKey);
				cellRenderStoreRef.current.setSnapshot(rowKey, columnMetric.column.key, getSheetUICellRenderSnapshot({
					cell: uiCell,
					cellKey: columnMetric.column.key,
					editState,
					rowId: rowKey,
					selectedCellKeyMap,
					selectedCellState,
				}));

				return acc;
			}, {});

			const rowSlot = {
				cellsByKey,
				rowId: rowKey,
				rowIndex: Math.max(0, rowIndex - 1),
				rowKey,
				rowNumber: rowIndex,
				rowHeight: rowMetric?.height || SHEET_ROW_HEIGHT,
				rowTop: stickyHeaderHeight + (rowMetric?.top || 0),
				rowWidth,
			};

			return rowSlot;
		});

		cellRenderStoreRef.current.deleteMissing(activeRenderKeys);
		return visibleRowSlots;
	}, [canvasWidth, cellLookup, disabled, editState, loadedVisualRowCount, renderedRowCount, optimisticCellStyles, optimisticValues, rowMetricsState.metrics, selectedCellKeyMap, selectedCellState, stickyHeaderHeight, viewportWidth, visibleColumns, visibleRange, visibleRangeBufferRows, visibleViewportRowCount]);

	const sheetSurfaceWidth = Math.max(canvasWidth, viewportWidth);

	return <div className='v_stretch h_f w_f rel bg'>
		<div
			ref={containerElement.ref}
			className='f h_0 rel'
			data-sheet-grid-container='true'
		>
				<SheetUI
					canvasHeight={canvasHeight}
					canvasWidth={sheetSurfaceWidth}
				cellStore={cellRenderStoreRef.current}
				cellCount={visibleRows.length * visibleColumns.length}
				className={className}
				columnCount={uiColumns.length}
					columns={visibleColumns}
					editState={editState}
					headerContent={children}
					headerSpacerWidth={sheetSurfaceWidth}
					headerWidth={canvasWidth}
				overlayContent={sheetOverlayContent}
				resizeGuide={resizeGuide}
				rowResizeEnabled={!disabled}
				rowResizeGuide={rowResizeGuide}
				rows={visibleRows}
				scrollLeft={scrollState.scrollLeft}
				scrollRef={setScrollRef}
				selectedCellKeyMap={selectedCellKeyMap}
				selectedCellState={selectedCellState}
				sheetSurfaceHeight={canvasHeight}
				sheetSurfaceTop={0}
				stickyColumnEndLeft={stickyColumnEndLeft}
				stickyColumnCount={frozenColumnCount}
			/>
		</div>
	</div>;
}

export default Sheet;
