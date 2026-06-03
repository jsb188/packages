import { cn } from '@jsb188/app/utils/string.ts';
import type {
  SheetCellGQL,
  SheetDesignObj,
  SheetRangeGQL,
} from '@jsb188/mday/types/sheet.d.ts';
import {
  clampSheetColumnWidth,
  clampSheetRowHeight,
  getSheetCellKey,
  getSheetColumnIndexAtOffset,
  getSheetColumnMetrics,
  getSheetRowIndexAtOffset,
  getSheetRowMetrics,
  getSheetVisibleRange,
  SHEET_HEADER_HEIGHT,
  SHEET_ROW_HEIGHT,
  SHEET_ROW_NUMBER_WIDTH,
  SHEET_STICKY_SPACER_SIZE,
  type SheetColumnMetric,
  type SheetRowMetric,
  type SheetUIEditState,
  type SheetUIResizeGuide,
  type SheetUIRowResizeGuide,
  type SheetUISelectedCellKeyMap,
  type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useKeyDown } from '@jsb188/react/states';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, type FocusEvent, type FormEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { SheetCanvasSurface } from '../ui/SheetCanvasSurface.tsx';
import { SheetEditorOverlay, type SheetEditorOverlayPosition } from '../ui/SheetEditorOverlay.tsx';
import { useSheetContextMenu, type SheetContextMenuFormat, type SheetContextMenuTarget } from './SheetContextMenu.tsx';
import { parseGridClipboardText } from './grid-clipboard.ts';
import {
  dismissGridContextMenuOnPointerDown,
} from './grid-context-menu.ts';
import {
  addGridKeyboardEventListener,
  handleGridKeyboardEvent,
  type GridArrowDirection,
} from './grid-keyboard.ts';
import {
  getGridKeyboardElements,
  isGridShortcutBlockedByActiveInput,
  isGridTextInputKey,
  useGridElementSize,
} from './grid-runtime.ts';
import {
  getSheetCanvasColumnDisplayLeft,
  getSheetCanvasColumnDisplayRight,
  getSheetCanvasRowDisplayBottom,
  getSheetCanvasRowDisplayTop,
} from './sheet-canvas-geometry.ts';
import {
  gridSelectedCellKeyMapHasMultipleCells,
  getGridArrowNavigationSelection,
  getGridRangeSelection,
  getGridResolvedSelectedCellKeyMap,
  getGridSelectedCellsFromKeyMap,
  getGridSelectedCellKeyMapFromCells,
  getGridSelectionAnchorCell,
  getNextActiveGridSelectedCell,
  getOrderedGridSelectedCells,
} from './grid-selection.ts';
import {
  getSheetCanvasCell,
  getSheetCanvasCellDisplayValue,
  getSheetCanvasCellDraftValue,
  getSheetCanvasColumnBufferCount,
  getSheetCanvasColumnIndexFromKey,
  getSheetCanvasColumns,
  getSheetCanvasColumnWidths,
  getSheetCanvasCoordKey,
  getSheetCanvasInitialRowCount,
  getSheetCanvasRowBufferCount,
  getSheetCanvasRowHeights,
  getSheetCanvasRowIndexFromId,
  getSheetCanvasRowKeys,
  getSheetCanvasStyleColor,
  isSheetCanvasFormattedEmptyCell,
  parseSheetJSONObject,
  SHEET_CANVAS_FETCH_BUFFER_ROWS,
  SHEET_CANVAS_INITIAL_ROW_COUNT,
  type SheetCanvasCell,
  type SheetCanvasColumn,
} from './sheet-utils.ts';
import {
	type SheetStateAtoms,
} from '../states/sheet-state.ts';

const SHEET_CANVAS_ROW_RIGHT_PADDING = 64;
const SHEET_CANVAS_COLUMN_RESIZE_HANDLE_WIDTH = 7;
const SHEET_CANVAS_ROW_RESIZE_HANDLE_HEIGHT = 6;
const SHEET_CANVAS_GRID_EDITOR_SELECTOR = '[data-sheet-editor="true"]';

export type SheetCellEditInput = {
	cell: {
		columnIndex: number;
		format?: string | null;
		note?: string | null;
		rawInput?: string | null;
		regionId?: string | number | bigint | null;
		rowIndex: number;
		style?: string | null;
		value?: string | null;
	};
	clear?: boolean | null;
};

export type SheetDesignPatchInput = {
	columns?: string | null;
	rows?: string | null;
};

type SheetViewportRequest = {
	columnCount: number;
	startColumnIndex: number;
};

/*
 * Return whether two viewport requests ask for the same column window.
 */
function sheetViewportRequestsAreEqual(a?: SheetViewportRequest | null, b?: SheetViewportRequest | null) {
	return a?.columnCount === b?.columnCount &&
		a?.startColumnIndex === b?.startColumnIndex;
}

type SheetControllerProps = {
	bufferColumns?: number;
	bufferRows?: number;
	canFetchMoreRows: boolean;
	cellsByCoord: Map<string, SheetCellGQL>;
	children?: ReactNode;
	className?: string;
	design: SheetDesignObj;
	disabled?: boolean;
	hasMoreRows: boolean;
	loadedRowCount: number;
	onFetchMoreRows: () => Promise<void> | void;
	onSaveCells: (cells: SheetCellEditInput[]) => Promise<unknown> | unknown;
	onUpdateSheetDesign: (design: SheetDesignPatchInput) => Promise<unknown> | unknown;
	onViewportRequest: (viewport: SheetViewportRequest) => void;
	ranges: SheetRangeGQL[];
	stateAtoms: SheetStateAtoms;
};

type SheetCanvasHitCell = {
	cellKey: string;
	columnMetric: SheetColumnMetric;
	rowId: string;
	rowMetric: SheetRowMetric;
};

type SheetCanvasPointerHit = {
	cell?: SheetCanvasHitCell | null;
	columnHeader?: {
		columnMetric: SheetColumnMetric;
	} | null;
	columnResize?: {
		columnMetric: SheetColumnMetric;
	} | null;
	rowHeader?: {
		rowMetric: SheetRowMetric;
	} | null;
	rowResize?: {
		rowMetric: SheetRowMetric;
	} | null;
};

export type SheetCanvasResizeState = {
	columnKey: string;
	latestWidth: number;
	startClientX: number;
	startWidth: number;
};

export type SheetCanvasRowResizeState = {
	latestHeight: number;
	rowKey: string;
	startClientY: number;
	startHeight: number;
};

type SheetCanvasDragSelectionState =
	| {
			anchorCell: SheetUISelectedCellState;
			latestCell: SheetUISelectedCellState;
			pointerId: number;
			started: boolean;
			type: 'CELL';
		}
	| {
			anchorColumnMetric: SheetColumnMetric;
			latestColumnMetric: SheetColumnMetric;
			pointerId: number;
			started: boolean;
			type: 'COLUMN_HEADER';
		}
	| {
			anchorRowMetric: SheetRowMetric;
			latestRowMetric: SheetRowMetric;
			pointerId: number;
			started: boolean;
			type: 'ROW_HEADER';
		};

/*
 * Return the value currently stored in one DOM sheet editor.
 */
function getSheetEditorElementValue(editorElement: HTMLElement) {
	if (editorElement instanceof HTMLInputElement || editorElement instanceof HTMLTextAreaElement || editorElement instanceof HTMLSelectElement) {
		return editorElement.value;
	}

	return editorElement.textContent || '';
}

/*
 * Read clipboard text with a fallback for browsers that block async clipboard access.
 */
async function readSheetClipboardText() {
	try {
		return await globalThis.navigator?.clipboard?.readText?.() || '';
	} catch {
		return '';
	}
}

/*
 * Return the DOM scroll position needed to keep one cell visible.
 */
function getSheetCanvasScrollStateForCell(params: {
	columnMetric: SheetColumnMetric;
	rowMetric: SheetRowMetric;
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	totalHeight: number;
	totalWidth: number;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const sticky = params.columnMetric.columnIndex < params.stickyColumnCount;
	const cellTop = SHEET_HEADER_HEIGHT + params.rowMetric.top;
	const cellBottom = cellTop + params.rowMetric.height;
	const visibleTop = params.scrollTop + SHEET_HEADER_HEIGHT;
	const visibleBottom = params.scrollTop + params.viewportHeight;
	let nextScrollLeft = params.scrollLeft;
	let nextScrollTop = params.scrollTop;

	if (cellTop < visibleTop) {
		nextScrollTop = cellTop - SHEET_HEADER_HEIGHT;
	} else if (cellBottom > visibleBottom) {
		nextScrollTop = cellBottom - params.viewportHeight;
	}

	if (!sticky) {
		const cellLeft = SHEET_ROW_NUMBER_WIDTH + params.columnMetric.left + (params.stickyColumnCount ? SHEET_STICKY_SPACER_SIZE : 0);
		const cellRight = cellLeft + params.columnMetric.width;
		const visibleLeft = params.scrollLeft + SHEET_ROW_NUMBER_WIDTH;
		const visibleRight = params.scrollLeft + params.viewportWidth;

		if (cellLeft < visibleLeft) {
			nextScrollLeft = cellLeft - SHEET_ROW_NUMBER_WIDTH;
		} else if (cellRight > visibleRight) {
			nextScrollLeft = cellRight - params.viewportWidth;
		}
	}

	return {
		scrollLeft: Math.min(Math.max(0, nextScrollLeft), Math.max(0, params.totalWidth - params.viewportWidth)),
		scrollTop: Math.min(Math.max(0, nextScrollTop), Math.max(0, params.totalHeight - params.viewportHeight)),
	};
}

/*
 * Return whether one cell has value or visible formatting for select-all bounds.
 */
function sheetCanvasCellHasSelectableContent(params: {
	cell?: SheetCellGQL | null;
	columnIndex: number;
	design: SheetDesignObj;
	ranges: SheetRangeGQL[];
	rowIndex: number;
}) {
	return Boolean(
		getSheetCanvasCellDisplayValue(params.cell) ||
		isSheetCanvasFormattedEmptyCell(params),
	);
}

/*
 * Return the bounded used range for select-all, including formatted empty cells.
 */
function getSheetCanvasUsedRange(params: {
	cellsByCoord: Map<string, SheetCellGQL>;
	columns: SheetColumnMetric[];
	design: SheetDesignObj;
	loadedRowCount: number;
	ranges: SheetRangeGQL[];
}) {
	let maxRowIndex = 0;
	let maxColumnIndex = 0;

	params.cellsByCoord.forEach((cell) => {
		const rowIndex = Number(cell.rowIndex || 0);
		const columnIndex = Number(cell.columnIndex || 0);

		if (rowIndex <= params.loadedRowCount && sheetCanvasCellHasSelectableContent({
			cell,
			columnIndex,
			design: params.design,
			ranges: params.ranges,
			rowIndex,
		})) {
			maxRowIndex = Math.max(maxRowIndex, rowIndex);
			maxColumnIndex = Math.max(maxColumnIndex, columnIndex);
		}
	});

	params.ranges.forEach((range) => {
		const style = parseSheetJSONObject(range.style, {});
		const hasStyle = Boolean(getSheetCanvasStyleColor(style, ['backgroundColor', 'fillColor', 'color', 'textColor']));

		if (!hasStyle) {
			return;
		}

		maxRowIndex = Math.max(maxRowIndex, Math.min(params.loadedRowCount, Number(range.endRowIndex || 0)));
		maxColumnIndex = Math.max(maxColumnIndex, Number(range.endColumnIndex || 0));
	});

	const lastColumnIndex = (params.columns.at(-1)?.column as SheetCanvasColumn | undefined)?.sheetColumnIndex || 0;

	if (getSheetCanvasStyleColor(params.design.defaultCellStyle || {}, ['backgroundColor', 'fillColor', 'color', 'textColor'])) {
		maxRowIndex = Math.max(maxRowIndex, params.loadedRowCount);
		maxColumnIndex = Math.max(maxColumnIndex, lastColumnIndex);
	}

	params.columns.forEach((metric) => {
		const canvasColumn = metric.column as SheetCanvasColumn;
		const columnStyle = parseSheetJSONObject(params.design.columns?.[String(canvasColumn.sheetColumnIndex)]?.style, {});

		if (getSheetCanvasStyleColor(columnStyle, ['backgroundColor', 'fillColor', 'color', 'textColor'])) {
			maxRowIndex = Math.max(maxRowIndex, params.loadedRowCount);
			maxColumnIndex = Math.max(maxColumnIndex, canvasColumn.sheetColumnIndex);
		}
	});

	Object.entries(params.design.rows || {}).forEach(([rowKey, rowDesign]) => {
		const rowIndex = Math.max(0, Math.floor(Number(rowKey)));
		const rowStyle = parseSheetJSONObject(rowDesign?.style, {});

		if (rowIndex > 0 && rowIndex <= params.loadedRowCount && getSheetCanvasStyleColor(rowStyle, ['backgroundColor', 'fillColor', 'color', 'textColor'])) {
			maxRowIndex = Math.max(maxRowIndex, rowIndex);
			maxColumnIndex = Math.max(maxColumnIndex, lastColumnIndex);
		}
	});

	return {
		maxColumnIndex,
		maxRowIndex,
	};
}

/*
 * Build selected cells from a one-based rectangular coordinate range.
 */
function getSheetCanvasSelectedCellsForRange(params: {
	columns: SheetColumnMetric[];
	maxColumnIndex: number;
	maxRowIndex: number;
}) {
	const cells: SheetUISelectedCellState[] = [];

	for (let rowIndex = 1; rowIndex <= params.maxRowIndex; rowIndex += 1) {
		params.columns.forEach((metric) => {
			const canvasColumn = metric.column as SheetCanvasColumn;

			if (canvasColumn.sheetColumnIndex <= params.maxColumnIndex) {
				cells.push({
					cellKey: String(canvasColumn.sheetColumnIndex),
					rowId: String(rowIndex),
				});
			}
		});
	}

	return cells;
}

/*
 * Return the Sheet cell key represented by one visual column metric.
 */
function getSheetCanvasCellKeyForColumnMetric(metric: SheetColumnMetric) {
	const canvasColumn = metric.column as SheetCanvasColumn;

	return String(canvasColumn.sheetColumnIndex);
}

/*
 * Return all metrics between two visible metrics, preserving visual order.
 */
function getSheetCanvasMetricRange<TMetric>(params: {
	endMetric: TMetric;
	getKey: (metric: TMetric) => string;
	metrics: TMetric[];
	startMetric: TMetric;
}) {
	const startKey = params.getKey(params.startMetric);
	const endKey = params.getKey(params.endMetric);
	const startIndex = params.metrics.findIndex((metric) => params.getKey(metric) === startKey);
	const endIndex = params.metrics.findIndex((metric) => params.getKey(metric) === endKey);

	if (startIndex === -1 || endIndex === -1) {
		return [];
	}

	const firstIndex = Math.min(startIndex, endIndex);
	const lastIndex = Math.max(startIndex, endIndex);

	return params.metrics.slice(firstIndex, lastIndex + 1);
}

/*
 * Build selected cells for multiple full visual Sheet rows.
 */
function getSheetCanvasSelectedCellsForRows(params: {
	columns: SheetColumnMetric[];
	rowIds: string[];
}) {
	return params.rowIds.flatMap((rowId) => params.columns.map((metric) => ({
		cellKey: getSheetCanvasCellKeyForColumnMetric(metric),
		rowId,
	})));
}

/*
 * Build selected cells for multiple full visual Sheet columns.
 */
function getSheetCanvasSelectedCellsForColumns(params: {
	cellKeys: string[];
	rowIds: string[];
}) {
	return params.rowIds.flatMap((rowId) => params.cellKeys.map((cellKey) => ({
		cellKey,
		rowId,
	})));
}

/*
 * Return a sparse cell input for a text value edit.
 */
function getSheetValueEditInput(rowIndex: number, columnIndex: number, value: string | null): SheetCellEditInput {
	return {
		cell: {
			columnIndex,
			rawInput: value,
			rowIndex,
			value,
		},
	};
}

/*
 * Return a sparse cell input that clears one coordinate.
 */
function getSheetClearEditInput(rowIndex: number, columnIndex: number): SheetCellEditInput {
	return {
		cell: {
			columnIndex,
			rowIndex,
		},
		clear: true,
	};
}

/*
 * Return the current editor overlay position for the active canvas cell.
 */
function getSheetCanvasEditorPosition(params: {
	columnMetricsByKey: Map<string, SheetColumnMetric>;
	editState?: SheetUIEditState | null;
	rowMetricsByKey: Map<string, SheetRowMetric>;
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
}) {
	if (!params.editState) {
		return null;
	}

	const columnMetric = params.columnMetricsByKey.get(params.editState.cellKey);
	const rowMetric = params.rowMetricsByKey.get(params.editState.rowId);

	if (!columnMetric || !rowMetric) {
		return null;
	}

	return {
		height: rowMetric.height,
		left: getSheetCanvasColumnDisplayLeft(columnMetric, params.scrollLeft, params.stickyColumnCount),
		top: getSheetCanvasRowDisplayTop(rowMetric, params.scrollTop),
		width: columnMetric.width,
	} satisfies SheetEditorOverlayPosition;
}

/*
 * Return a hit-tested sheet cell, header resize, or row resize target for a pointer event.
 */
function getSheetCanvasPointerHit(params: {
	clientX: number;
	clientY: number;
	columnMetrics: SheetColumnMetric[];
	columnOffsets: number[];
	rowMetrics: SheetRowMetric[];
	rowOffsets: number[];
	scrollLeft: number;
	scrollNode: HTMLDivElement | null;
	scrollTop: number;
	stickyColumnCount: number;
}): SheetCanvasPointerHit {
	const rect = params.scrollNode?.getBoundingClientRect();
	if (!rect) {
		return {};
	}

	const x = params.clientX - rect.left;
	const y = params.clientY - rect.top;
	const columnResize = y <= SHEET_HEADER_HEIGHT
		? params.columnMetrics.find((metric) => {
			return Math.abs(x - getSheetCanvasColumnDisplayRight(metric, params.scrollLeft, params.stickyColumnCount)) <= SHEET_CANVAS_COLUMN_RESIZE_HANDLE_WIDTH;
		})
		: null;
	const rowResize = x <= SHEET_ROW_NUMBER_WIDTH
		? params.rowMetrics.find((metric) => {
			return Math.abs(y - getSheetCanvasRowDisplayBottom(metric, params.scrollTop)) <= SHEET_CANVAS_ROW_RESIZE_HANDLE_HEIGHT;
		})
		: null;

	if (columnResize) {
		return {
			columnResize: {
				columnMetric: columnResize,
			},
		};
	}

	if (rowResize) {
		return {
			rowResize: {
				rowMetric: rowResize,
			},
		};
	}

	if (y <= SHEET_HEADER_HEIGHT && x > SHEET_ROW_NUMBER_WIDTH) {
		const stickyWidth = params.stickyColumnCount > 0
			? params.columnOffsets[Math.min(params.stickyColumnCount, params.columnOffsets.length - 1)] || 0
			: 0;
		const headerX = x - SHEET_ROW_NUMBER_WIDTH;
		const columnOffset = params.stickyColumnCount > 0 && headerX <= stickyWidth
			? headerX
			: headerX + params.scrollLeft - (params.stickyColumnCount > 0 ? SHEET_STICKY_SPACER_SIZE : 0);
		const columnIndex = getSheetColumnIndexAtOffset(params.columnOffsets, Math.max(0, columnOffset));
		const columnMetric = params.columnMetrics[columnIndex];

		return columnMetric
			? {
					columnHeader: {
						columnMetric,
					},
				}
			: {};
	}

	if (x <= SHEET_ROW_NUMBER_WIDTH && y > SHEET_HEADER_HEIGHT) {
		const bodyY = y - SHEET_HEADER_HEIGHT + params.scrollTop;
		const rowIndex = getSheetRowIndexAtOffset(params.rowOffsets, bodyY);
		const rowMetric = params.rowMetrics[rowIndex];

		return rowMetric
			? {
					rowHeader: {
						rowMetric,
					},
				}
			: {};
	}

	if (x < SHEET_ROW_NUMBER_WIDTH || y < SHEET_HEADER_HEIGHT) {
		return {};
	}

	const bodyY = y - SHEET_HEADER_HEIGHT + params.scrollTop;
	const rowIndex = getSheetRowIndexAtOffset(params.rowOffsets, bodyY);
	const stickyWidth = params.stickyColumnCount > 0
		? params.columnOffsets[Math.min(params.stickyColumnCount, params.columnOffsets.length - 1)] || 0
		: 0;
	const bodyX = x - SHEET_ROW_NUMBER_WIDTH;
	const columnOffset = params.stickyColumnCount > 0 && bodyX <= stickyWidth
		? bodyX
		: bodyX + params.scrollLeft - (params.stickyColumnCount > 0 ? SHEET_STICKY_SPACER_SIZE : 0);
	const columnIndex = getSheetColumnIndexAtOffset(params.columnOffsets, Math.max(0, columnOffset));
	const rowMetric = params.rowMetrics[rowIndex];
	const columnMetric = params.columnMetrics[columnIndex];
	const canvasColumn = columnMetric?.column as SheetCanvasColumn | undefined;

	if (!rowMetric || !columnMetric || !canvasColumn) {
		return {};
	}

	return {
		cell: {
			cellKey: String(canvasColumn.sheetColumnIndex),
			columnMetric,
			rowId: rowMetric.rowKey,
			rowMetric,
		},
	};
}

/*
 * Return the cell target used by the Sheet context menu.
 */
function getSheetCanvasContextMenuTarget(params: {
	cell: SheetCanvasHitCell;
	cellLookup: Map<string, SheetCanvasCell>;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const renderKey = getSheetCellKey(params.cell.rowId, params.cell.cellKey);
	const targetCell = params.cellLookup.get(renderKey);
	const selectedCells = params.selectedCellKeyMap && params.selectedCellKeyMap[renderKey]
		? getGridSelectedCellsFromKeyMap(params.selectedCellKeyMap)
		: [{
			cellKey: params.cell.cellKey,
			rowId: params.cell.rowId,
		}];

	return {
		canEdit: true,
		cells: selectedCells,
		cellKey: params.cell.cellKey,
		displayValue: targetCell?.displayValue || '',
		fillColor: targetCell?.style ? getSheetCanvasStyleColor(targetCell.style, ['backgroundColor', 'fillColor']) : null,
		rowId: params.cell.rowId,
		textColor: targetCell?.style ? getSheetCanvasStyleColor(targetCell.style, ['color', 'textColor']) : null,
	} satisfies SheetContextMenuTarget;
}

/*
 * Render the stateful canvas Sheet controller.
 */
export function SheetController(p: SheetControllerProps) {
	const [keyDown] = useKeyDown();
	const scrollElement = useGridElementSize<HTMLDivElement>();
	const [scrollState, setScrollState] = useAtom(p.stateAtoms.scrollStateAtom);
	const [selectedCellState, setSelectedCellState] = useAtom(p.stateAtoms.selectedCellStateAtom);
	const [selectedCellKeyMap, setSelectedCellKeyMap] = useAtom(p.stateAtoms.selectedCellKeyMapAtom);
	const [headerSelection, setHeaderSelection] = useAtom(p.stateAtoms.headerSelectionAtom);
	const [editState, setEditState] = useAtom(p.stateAtoms.editStateAtom);
	const [optimisticCellsByCoord, setOptimisticCellsByCoord] = useAtom(p.stateAtoms.optimisticCellsByCoordAtom);
	const [localColumnWidths, setLocalColumnWidths] = useAtom(p.stateAtoms.localColumnWidthsAtom);
	const [localRowHeights, setLocalRowHeights] = useAtom(p.stateAtoms.localRowHeightsAtom);
	const [resizeState, setResizeState] = useAtom(p.stateAtoms.resizeStateAtom);
	const [rowResizeState, setRowResizeState] = useAtom(p.stateAtoms.rowResizeStateAtom);
	const dragSelectionRef = useRef<SheetCanvasDragSelectionState | null>(null);
	const fetchingMoreRef = useRef(false);
	const designRef = useRef(p.design);
	const onUpdateSheetDesignRef = useRef(p.onUpdateSheetDesign);
	const resizeStateRef = useRef<SheetCanvasResizeState | null>(null);
	const rowResizeStateRef = useRef<SheetCanvasRowResizeState | null>(null);
	const viewportRequestRef = useRef<SheetViewportRequest | null>(null);
	const runtimeRef = useRef<{
		cellLookup: Map<string, SheetCanvasCell>;
		columnMetrics: SheetColumnMetric[];
		columnMetricsByKey: Map<string, SheetColumnMetric>;
		columnOffsets: number[];
		effectiveCellsByCoord: Map<string, SheetCellGQL>;
		rowMetrics: SheetRowMetric[];
		rowMetricsByKey: Map<string, SheetRowMetric>;
		rowOffsets: number[];
		rowIds: string[];
		scrollLeft: number;
		scrollNode: HTMLDivElement | null;
		scrollTop: number;
		totalHeight: number;
		totalWidth: number;
		viewportHeight: number;
		viewportWidth: number;
	} | null>(null);
	const stickyColumnCount = Math.max(0, p.design.grid.frozenColumns || 0);
	const rowCount = Math.max(
		SHEET_CANVAS_INITIAL_ROW_COUNT,
		Math.min(p.design.grid.rowCount, p.loadedRowCount || getSheetCanvasInitialRowCount(scrollElement.size.height, p.design.grid.rowCount)),
	);
	const rowKeys = useMemo(() => {
		return getSheetCanvasRowKeys(rowCount);
	}, [rowCount]);
	const uiColumns = useMemo(() => {
		return getSheetCanvasColumns(p.design);
	}, [p.design]);
	const columnWidths = useMemo(() => {
		return {
			...getSheetCanvasColumnWidths(p.design),
			...localColumnWidths,
		};
	}, [localColumnWidths, p.design]);
	const rowHeights = useMemo(() => {
		return {
			...getSheetCanvasRowHeights(p.design, rowCount),
			...localRowHeights,
		};
	}, [localRowHeights, p.design, rowCount]);
	const columnMetricsData = useMemo(() => {
		return getSheetColumnMetrics(uiColumns, columnWidths);
	}, [columnWidths, uiColumns]);
	const rowMetricsData = useMemo(() => {
		return getSheetRowMetrics(rowKeys, rowHeights);
	}, [rowHeights, rowKeys]);
	const viewportWidth = scrollElement.size.width || 0;
	const viewportHeight = scrollElement.size.height || 0;
	const totalWidth = SHEET_ROW_NUMBER_WIDTH + columnMetricsData.totalWidth + (stickyColumnCount ? SHEET_STICKY_SPACER_SIZE : 0) + SHEET_CANVAS_ROW_RIGHT_PADDING;
	const totalHeight = SHEET_HEADER_HEIGHT + rowMetricsData.totalHeight;
	const bufferRows = p.bufferRows ?? getSheetCanvasRowBufferCount(viewportHeight);
	const bufferColumns = p.bufferColumns ?? getSheetCanvasColumnBufferCount(viewportWidth);
	const visibleRange = useMemo(() => {
		return getSheetVisibleRange({
			bufferColumns,
			bufferRows,
			columnCount: columnMetricsData.metrics.length,
			columnOffsets: columnMetricsData.offsets,
			containerHeight: viewportHeight,
			containerWidth: viewportWidth,
			headerHeight: SHEET_HEADER_HEIGHT,
			rowCount: rowMetricsData.metrics.length,
			rowOffsets: rowMetricsData.offsets,
			rowRangeMultiplier: 1,
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
		});
	}, [bufferColumns, bufferRows, columnMetricsData.metrics.length, columnMetricsData.offsets, rowMetricsData.metrics.length, rowMetricsData.offsets, scrollState.scrollLeft, scrollState.scrollTop, viewportHeight, viewportWidth]);
	const effectiveCellsByCoord = useMemo(() => {
		const next = new Map(p.cellsByCoord);

		optimisticCellsByCoord.forEach((cell, key) => {
			next.set(key, cell);
		});

		return next;
	}, [optimisticCellsByCoord, p.cellsByCoord]);
	const cellLookup = useMemo(() => {
		const cells = new Map<string, SheetCanvasCell>();
		const visibleRows = rowMetricsData.metrics.slice(visibleRange.rowStart, visibleRange.rowEnd);
		const visibleColumns = columnMetricsData.metrics.slice(visibleRange.columnStart, visibleRange.columnEnd);

		visibleRows.forEach((rowMetric) => {
			const rowIndex = getSheetCanvasRowIndexFromId(rowMetric.rowKey);

			if (!rowIndex) {
				return;
			}

			visibleColumns.forEach((columnMetric) => {
				const canvasColumn = columnMetric.column as SheetCanvasColumn;
				const columnIndex = canvasColumn.sheetColumnIndex;
				const cell = effectiveCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex)) || null;
				const hasCell = Boolean(cell);
				const hasFormatting = isSheetCanvasFormattedEmptyCell({
					cell,
					columnIndex,
					design: p.design,
					ranges: p.ranges,
					rowIndex,
				});

				if (!hasCell && !hasFormatting) {
					return;
				}

				cells.set(getSheetCellKey(rowMetric.rowKey, String(columnIndex)), getSheetCanvasCell({
					cell,
					cellKey: String(columnIndex),
					columnIndex,
					design: p.design,
					ranges: p.ranges,
					rowId: rowMetric.rowKey,
					rowIndex,
				}));
			});
		});

		return cells;
	}, [columnMetricsData.metrics, effectiveCellsByCoord, p.design, p.ranges, rowMetricsData.metrics, visibleRange.columnEnd, visibleRange.columnStart, visibleRange.rowEnd, visibleRange.rowStart]);
	const columnMetricsByKey = useMemo(() => {
		return new Map(columnMetricsData.metrics.map((metric) => {
			const canvasColumn = metric.column as SheetCanvasColumn;

			return [String(canvasColumn.sheetColumnIndex), metric];
		}));
	}, [columnMetricsData.metrics]);
	const rowMetricsByKey = useMemo(() => {
		return new Map(rowMetricsData.metrics.map((metric) => [metric.rowKey, metric]));
	}, [rowMetricsData.metrics]);
	const editorPosition = useMemo(() => {
		return getSheetCanvasEditorPosition({
			columnMetricsByKey,
			editState,
			rowMetricsByKey,
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyColumnCount,
		});
	}, [columnMetricsByKey, editState, rowMetricsByKey, scrollState.scrollLeft, scrollState.scrollTop, stickyColumnCount]);
	const activeEditorColumn = editState ? columnMetricsByKey.get(editState.cellKey)?.column || null : null;
	const resizeGuide = useMemo<SheetUIResizeGuide | null>(() => {
		if (!resizeState) {
			return null;
		}

		const metric = columnMetricsByKey.get(resizeState.columnKey);
		if (!metric) {
			return null;
		}

		return {
			columnKey: resizeState.columnKey,
			height: Math.max(totalHeight, viewportHeight),
			left: getSheetCanvasColumnDisplayRight({
				...metric,
				width: resizeState.latestWidth,
			}, scrollState.scrollLeft, stickyColumnCount),
		};
	}, [columnMetricsByKey, resizeState, scrollState.scrollLeft, stickyColumnCount, totalHeight, viewportHeight]);
	const rowResizeGuide = useMemo<SheetUIRowResizeGuide | null>(() => {
		if (!rowResizeState) {
			return null;
		}

		const metric = rowMetricsByKey.get(rowResizeState.rowKey);
		if (!metric) {
			return null;
		}

		return {
			rowKey: rowResizeState.rowKey,
			top: getSheetCanvasRowDisplayBottom({
				...metric,
				height: rowResizeState.latestHeight,
			}, scrollState.scrollTop),
			width: Math.max(totalWidth, viewportWidth),
		};
	}, [rowMetricsByKey, rowResizeState, scrollState.scrollTop, totalWidth, viewportWidth]);

	useEffect(() => {
		designRef.current = p.design;
		onUpdateSheetDesignRef.current = p.onUpdateSheetDesign;
		resizeStateRef.current = resizeState;
		rowResizeStateRef.current = rowResizeState;
	});

	useEffect(() => {
		runtimeRef.current = {
			cellLookup,
			columnMetrics: columnMetricsData.metrics,
			columnMetricsByKey,
			columnOffsets: columnMetricsData.offsets,
			effectiveCellsByCoord,
			rowMetrics: rowMetricsData.metrics,
			rowMetricsByKey,
			rowOffsets: rowMetricsData.offsets,
			rowIds: rowKeys,
			scrollLeft: scrollState.scrollLeft,
			scrollNode: scrollElement.node,
			scrollTop: scrollState.scrollTop,
			totalHeight,
			totalWidth,
			viewportHeight,
			viewportWidth,
		};
	});

	useEffect(() => {
		const scrollNode = scrollElement.node;

		if (!scrollNode) {
			return;
		}

		const updateScrollState = () => {
			setScrollState((currentState) => {
				const nextState = {
					scrollLeft: scrollNode.scrollLeft,
					scrollTop: scrollNode.scrollTop,
				};

				if (currentState.scrollLeft === nextState.scrollLeft && currentState.scrollTop === nextState.scrollTop) {
					return currentState;
				}

				return nextState;
			});
		};

		updateScrollState();
		scrollNode.addEventListener('scroll', updateScrollState, {
			passive: true,
		});

		return () => {
			scrollNode.removeEventListener('scroll', updateScrollState);
		};
	}, [scrollElement.node]);

	useEffect(() => {
		if (!viewportWidth || !viewportHeight) {
			return;
		}

		const visibleColumns = columnMetricsData.metrics.slice(visibleRange.columnStart, visibleRange.columnEnd);
		const firstColumn = visibleColumns[0]?.column as SheetCanvasColumn | undefined;
		const lastColumn = visibleColumns.at(-1)?.column as SheetCanvasColumn | undefined;

		if (!firstColumn || !lastColumn) {
			return;
		}

		const nextViewportRequest = {
			columnCount: Math.max(1, lastColumn.sheetColumnIndex - firstColumn.sheetColumnIndex + 1),
			startColumnIndex: firstColumn.sheetColumnIndex,
		};

		if (sheetViewportRequestsAreEqual(viewportRequestRef.current, nextViewportRequest)) {
			return;
		}

		viewportRequestRef.current = nextViewportRequest;
		p.onViewportRequest(nextViewportRequest);
	}, [columnMetricsData.metrics, p.onViewportRequest, visibleRange.columnEnd, visibleRange.columnStart, viewportHeight, viewportWidth]);

	useEffect(() => {
		const nearBottom = scrollState.scrollTop + viewportHeight >= totalHeight - SHEET_CANVAS_FETCH_BUFFER_ROWS * SHEET_ROW_HEIGHT;

		if (!nearBottom || !p.canFetchMoreRows || !p.hasMoreRows || fetchingMoreRef.current) {
			return;
		}

		fetchingMoreRef.current = true;
		Promise.resolve(p.onFetchMoreRows()).finally(() => {
			fetchingMoreRef.current = false;
		});
	}, [p.canFetchMoreRows, p.hasMoreRows, p.onFetchMoreRows, scrollState.scrollTop, totalHeight, viewportHeight]);

	const scrollCellIntoView = useCallback((cell: SheetUISelectedCellState) => {
		const runtime = runtimeRef.current;
		const columnMetric = runtime?.columnMetricsByKey.get(cell.cellKey);
		const rowMetric = runtime?.rowMetricsByKey.get(cell.rowId);

		if (!runtime?.scrollNode || !columnMetric || !rowMetric) {
			return;
		}

		const nextScrollState = getSheetCanvasScrollStateForCell({
			columnMetric,
			rowMetric,
			scrollLeft: runtime.scrollLeft,
			scrollTop: runtime.scrollTop,
			stickyColumnCount,
			totalHeight: runtime.totalHeight,
			totalWidth: runtime.totalWidth,
			viewportHeight: runtime.viewportHeight,
			viewportWidth: runtime.viewportWidth,
		});

		runtime.scrollNode.scrollLeft = nextScrollState.scrollLeft;
		runtime.scrollNode.scrollTop = nextScrollState.scrollTop;
	}, [stickyColumnCount]);

	const selectSheetCell = useCallback((cell: SheetUISelectedCellState, selectedMap?: SheetUISelectedCellKeyMap | null) => {
		setEditState(null);
		setHeaderSelection(null);
		setSelectedCellState(cell);
		setSelectedCellKeyMap(selectedMap || getGridSelectedCellKeyMapFromCells([cell]));
		scrollCellIntoView(cell);
	}, [scrollCellIntoView, setHeaderSelection]);

	/*
	 * Select a rectangular cell range from the active cell to one target cell.
	 */
	const selectSheetCellRangeToTarget = useCallback((targetCell: SheetUISelectedCellState) => {
		const runtime = runtimeRef.current;
		const anchorCell = selectedCellState || targetCell;

		if (!runtime) {
			selectSheetCell(targetCell);
			return;
		}

		const selection = getGridRangeSelection({
			activeCell: targetCell,
			anchorCell,
			columnMetrics: runtime.columnMetrics,
			rowIds: runtime.rowIds,
			selectedActiveCell: anchorCell,
		});

		setEditState(null);
		setHeaderSelection(null);
		setSelectedCellState(selection.activeCell);
		setSelectedCellKeyMap(selection.selectedCellKeyMap);
		scrollCellIntoView(targetCell);
	}, [scrollCellIntoView, selectSheetCell, selectedCellState, setHeaderSelection]);

	const openSheetCellEditor = useCallback((cell?: SheetUISelectedCellState | null, initialValue?: string) => {
		const runtime = runtimeRef.current;
		const targetCell = cell || selectedCellState;
		const rowIndex = getSheetCanvasRowIndexFromId(targetCell?.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(targetCell?.cellKey);

		if (!runtime || !targetCell || !rowIndex || !columnIndex || p.disabled) {
			return;
		}

		const sourceCell = runtime.effectiveCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex));

		setSelectedCellState(targetCell);
		setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells([targetCell]));
		setHeaderSelection(null);
		setEditState({
			cellKey: targetCell.cellKey,
			draftValue: initialValue ?? getSheetCanvasCellDraftValue(sourceCell),
			rowId: targetCell.rowId,
		});
		scrollCellIntoView(targetCell);
	}, [p.disabled, scrollCellIntoView, selectedCellState, setHeaderSelection]);

	const saveSheetCellValue = useCallback(async (cell: SheetUISelectedCellState, value: string | null) => {
		const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

		if (!rowIndex || !columnIndex) {
			return;
		}

		const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);

		setOptimisticCellsByCoord((current) => {
			const next = new Map(current);
			const currentCell = runtimeRef.current?.effectiveCellsByCoord.get(coordKey) || {};

			next.set(coordKey, {
				...currentCell,
				columnIndex,
				rawInput: value,
				rowIndex,
				value,
			} as SheetCellGQL);

			return next;
		});

		await p.onSaveCells([getSheetValueEditInput(rowIndex, columnIndex, value)]);
	}, [p.onSaveCells]);

	const commitEditorElement = useCallback(async (editorElement: HTMLElement) => {
		const cellKey = editorElement.dataset.cellKey;
		const rowId = editorElement.dataset.rowId;

		if (!cellKey || !rowId) {
			setEditState(null);
			return;
		}

		const nextCell = {
			cellKey,
			rowId,
		};

		await saveSheetCellValue(nextCell, getSheetEditorElementValue(editorElement));
		setEditState(null);
		selectSheetCell(nextCell);
	}, [saveSheetCellValue, selectSheetCell]);

	const clearSelectedSheetCells = useCallback(async () => {
		const runtime = runtimeRef.current;
		const selectedMap = getGridResolvedSelectedCellKeyMap({
			selectedCellKeyMap,
			selectedCellState,
		});

		if (!runtime || !selectedMap) {
			return;
		}

		const selectedCells = getOrderedGridSelectedCells({
			columnMetrics: runtime.columnMetrics,
			rowIds: runtime.rowIds,
			selectedCellKeyMap: selectedMap,
		});
		const inputs: SheetCellEditInput[] = [];

		selectedCells.forEach((cell) => {
			const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
			const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

			if (rowIndex && columnIndex) {
				inputs.push(getSheetClearEditInput(rowIndex, columnIndex));
			}
		});

		if (!inputs.length) {
			return;
		}

		setOptimisticCellsByCoord((current) => {
			const next = new Map(current);

			inputs.forEach((input) => {
				next.delete(getSheetCanvasCoordKey(input.cell.rowIndex, input.cell.columnIndex));
			});

			return next;
		});

		await p.onSaveCells(inputs);
	}, [p.onSaveCells, selectedCellKeyMap, selectedCellState]);

	const copySelectedSheetCells = useCallback(() => {
		const runtime = runtimeRef.current;
		const selectedMap = getGridResolvedSelectedCellKeyMap({
			selectedCellKeyMap,
			selectedCellState,
		});

		if (!runtime || !selectedMap) {
			return;
		}

		const selectedCells = getOrderedGridSelectedCells({
			columnMetrics: runtime.columnMetrics,
			rowIds: runtime.rowIds,
			selectedCellKeyMap: selectedMap,
		});
		const rows = new Map<string, string[]>();

		selectedCells.forEach((cell) => {
			const rowValues = rows.get(cell.rowId) || [];
			const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
			const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);
			const sourceCell = rowIndex && columnIndex
				? runtime.effectiveCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex))
				: null;

			rowValues.push(getSheetCanvasCellDisplayValue(sourceCell));
			rows.set(cell.rowId, rowValues);
		});

		void copyTextToClipboard(Array.from(rows.values()).map((row) => row.join('\t')).join('\n'));
	}, [selectedCellKeyMap, selectedCellState]);

	const pasteSelectedSheetCells = useCallback(async (clipboardText: string) => {
		const runtime = runtimeRef.current;
		const activeCell = selectedCellState;

		if (!runtime || !activeCell) {
			return;
		}

		const clipboardGrid = parseGridClipboardText(clipboardText);
		const startRowIndex = runtime.rowIds.indexOf(activeCell.rowId);
		const startColumnIndex = runtime.columnMetrics.findIndex((metric) => {
			const canvasColumn = metric.column as SheetCanvasColumn;

			return String(canvasColumn.sheetColumnIndex) === activeCell.cellKey;
		});
		const inputs: SheetCellEditInput[] = [];

		if (startRowIndex < 0 || startColumnIndex < 0) {
			return;
		}

		clipboardGrid.forEach((rowValues, rowOffset) => {
			const rowId = runtime.rowIds[startRowIndex + rowOffset];
			const rowIndex = getSheetCanvasRowIndexFromId(rowId);

			if (!rowIndex) {
				return;
			}

			rowValues.forEach((value, columnOffset) => {
				const metric = runtime.columnMetrics[startColumnIndex + columnOffset];
				const canvasColumn = metric?.column as SheetCanvasColumn | undefined;

				if (canvasColumn) {
					inputs.push(getSheetValueEditInput(rowIndex, canvasColumn.sheetColumnIndex, value));
				}
			});
		});

		if (!inputs.length) {
			return;
		}

		setOptimisticCellsByCoord((current) => {
			const next = new Map(current);

			inputs.forEach((input) => {
				const key = getSheetCanvasCoordKey(input.cell.rowIndex, input.cell.columnIndex);
				const currentCell = runtime.effectiveCellsByCoord.get(key) || {};

				next.set(key, {
					...currentCell,
					columnIndex: input.cell.columnIndex,
					rawInput: input.cell.rawInput,
					rowIndex: input.cell.rowIndex,
					value: input.cell.value,
				} as SheetCellGQL);
			});

			return next;
		});

		await p.onSaveCells(inputs);
	}, [p.onSaveCells, selectedCellState]);

	const selectAllSheetCells = useCallback(() => {
		const runtime = runtimeRef.current;

		if (!runtime) {
			return;
		}

		const usedRange = getSheetCanvasUsedRange({
			cellsByCoord: runtime.effectiveCellsByCoord,
			columns: runtime.columnMetrics,
			design: p.design,
			loadedRowCount: rowCount,
			ranges: p.ranges,
		});
		const activeCell = selectedCellState || {
			cellKey: String((runtime.columnMetrics[0]?.column as SheetCanvasColumn | undefined)?.sheetColumnIndex || 1),
			rowId: '1',
		};

		if (!usedRange.maxRowIndex || !usedRange.maxColumnIndex) {
			selectSheetCell(activeCell);
			return;
		}

		const selectedCells = getSheetCanvasSelectedCellsForRange({
			columns: runtime.columnMetrics,
			maxColumnIndex: usedRange.maxColumnIndex,
			maxRowIndex: Math.min(rowCount, usedRange.maxRowIndex),
		});

		setEditState(null);
		setHeaderSelection(null);
		setSelectedCellState(activeCell);
		setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells(selectedCells));
	}, [p.design, p.ranges, rowCount, selectSheetCell, selectedCellState, setHeaderSelection]);

	const selectSheetRowRange = useCallback((startRowMetric: SheetRowMetric, endRowMetric: SheetRowMetric) => {
		const runtime = runtimeRef.current;
		const firstColumn = runtime?.columnMetrics[0]?.column as SheetCanvasColumn | undefined;

		if (!runtime || !firstColumn) {
			return;
		}

		const rowMetrics = getSheetCanvasMetricRange({
			endMetric: endRowMetric,
			getKey: (metric) => metric.rowKey,
			metrics: runtime.rowMetrics,
			startMetric: startRowMetric,
		});
		const rowIds = rowMetrics.map((metric) => metric.rowKey);

		if (!rowIds.length) {
			return;
		}

		const activeCell = {
			cellKey: String(firstColumn.sheetColumnIndex),
			rowId: rowIds[0],
		};
		const selectedCells = getSheetCanvasSelectedCellsForRows({
			columns: runtime.columnMetrics,
			rowIds,
		});

		setEditState(null);
		setHeaderSelection({
			rowIds,
			type: 'ROW',
		});
		setSelectedCellState(activeCell);
		setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells(selectedCells));
	}, [setEditState, setHeaderSelection, setSelectedCellKeyMap, setSelectedCellState]);

	const selectSheetRow = useCallback((rowMetric: SheetRowMetric) => {
		selectSheetRowRange(rowMetric, rowMetric);
	}, [selectSheetRowRange]);

	const selectSheetColumnRange = useCallback((startColumnMetric: SheetColumnMetric, endColumnMetric: SheetColumnMetric) => {
		const runtime = runtimeRef.current;
		const firstRowId = runtime?.rowIds[0];

		if (!runtime || !firstRowId) {
			return;
		}

		const columnMetrics = getSheetCanvasMetricRange({
			endMetric: endColumnMetric,
			getKey: getSheetCanvasCellKeyForColumnMetric,
			metrics: runtime.columnMetrics,
			startMetric: startColumnMetric,
		});
		const cellKeys = columnMetrics.map(getSheetCanvasCellKeyForColumnMetric);

		if (!cellKeys.length) {
			return;
		}

		const activeCell = {
			cellKey: cellKeys[0],
			rowId: firstRowId,
		};
		const selectedCells = getSheetCanvasSelectedCellsForColumns({
			cellKeys,
			rowIds: runtime.rowIds,
		});

		setEditState(null);
		setHeaderSelection({
			cellKeys,
			type: 'COLUMN',
		});
		setSelectedCellState(activeCell);
		setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells(selectedCells));
	}, [setEditState, setHeaderSelection, setSelectedCellKeyMap, setSelectedCellState]);

	const selectSheetColumn = useCallback((columnMetric: SheetColumnMetric) => {
		selectSheetColumnRange(columnMetric, columnMetric);
	}, [selectSheetColumnRange]);

	const navigateSheetArrow = useCallback((direction: GridArrowDirection, extendSelection: boolean) => {
		const runtime = runtimeRef.current;
		const nextCell = runtime ? getGridArrowNavigationSelection({
			columnMetrics: runtime.columnMetrics,
			direction,
			rowIds: runtime.rowIds,
			selectedCellState,
		}) : null;

		if (!runtime || !nextCell) {
			return;
		}

		if (extendSelection) {
			const anchorCell = getGridSelectionAnchorCell({
				activeCell: selectedCellState,
				columnMetrics: runtime.columnMetrics,
				rowIds: runtime.rowIds,
				selectedCellKeyMap,
			}) || selectedCellState || nextCell;
			const selection = getGridRangeSelection({
				activeCell: nextCell,
				anchorCell,
				columnMetrics: runtime.columnMetrics,
				rowIds: runtime.rowIds,
				selectedActiveCell: nextCell,
			});

			setEditState(null);
			setHeaderSelection(null);
			setSelectedCellState(selection.activeCell);
			setSelectedCellKeyMap(selection.selectedCellKeyMap);
			scrollCellIntoView(selection.activeCell);
			return;
		}

		selectSheetCell(nextCell);
	}, [scrollCellIntoView, selectSheetCell, selectedCellKeyMap, selectedCellState, setHeaderSelection]);

	const navigateSheetTab = useCallback((direction: 'forward' | 'backward') => {
		const runtime = runtimeRef.current;
		const selectedMap = getGridResolvedSelectedCellKeyMap({
			selectedCellKeyMap,
			selectedCellState,
		});
		const selectedNextCell = runtime && selectedMap ? getNextActiveGridSelectedCell({
			activeCell: selectedCellState,
			columnMetrics: runtime.columnMetrics,
			direction,
			rowIds: runtime.rowIds,
			selectedCellKeyMap: selectedMap,
		}) : null;

		if (selectedNextCell && gridSelectedCellKeyMapHasMultipleCells(selectedMap)) {
			setSelectedCellState(selectedNextCell);
			scrollCellIntoView(selectedNextCell);
			return;
		}

		navigateSheetArrow(direction === 'forward' ? 'right' : 'left', false);
	}, [navigateSheetArrow, scrollCellIntoView, selectedCellKeyMap, selectedCellState, setHeaderSelection]);

	const handleSheetContextMenuEditCell = useCallback((target: SheetContextMenuTarget) => {
		openSheetCellEditor({
			cellKey: target.cellKey,
			rowId: target.rowId,
		});
	}, [openSheetCellEditor]);

	const handleSheetContextMenuFormatCells = useCallback(async (target: SheetContextMenuTarget, format: SheetContextMenuFormat) => {
		const runtime = runtimeRef.current;
		const inputs: SheetCellEditInput[] = [];

		if (!runtime) {
			return;
		}

		target.cells.forEach((cellTarget) => {
			const rowIndex = getSheetCanvasRowIndexFromId(cellTarget.rowId);
			const columnIndex = getSheetCanvasColumnIndexFromKey(cellTarget.cellKey);

			if (!rowIndex || !columnIndex) {
				return;
			}

			const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
			const currentCell = runtime.effectiveCellsByCoord.get(coordKey);
			const currentStyle = parseSheetJSONObject(currentCell?.style, {});
			const nextStyle = {
				...currentStyle,
				[format.name]: format.value,
			};

			inputs.push({
				cell: {
					columnIndex,
					rowIndex,
					style: JSON.stringify(nextStyle),
				},
			});
		});

		if (!inputs.length) {
			return;
		}

		setOptimisticCellsByCoord((current) => {
			const next = new Map(current);

			inputs.forEach((input) => {
				const key = getSheetCanvasCoordKey(input.cell.rowIndex, input.cell.columnIndex);
				const currentCell = runtime.effectiveCellsByCoord.get(key) || {};

				next.set(key, {
					...currentCell,
					columnIndex: input.cell.columnIndex,
					rowIndex: input.cell.rowIndex,
					style: input.cell.style || null,
				} as SheetCellGQL);
			});

			return next;
		});

		await p.onSaveCells(inputs);
	}, [p.onSaveCells]);
	const {
		closeSheetContextMenu,
		openSheetContextMenu,
	} = useSheetContextMenu({
		onEditCell: handleSheetContextMenuEditCell,
		onFormatCells: handleSheetContextMenuFormatCells,
	});

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const elements = getGridKeyboardElements(event, {
				editorSelector: SHEET_CANVAS_GRID_EDITOR_SELECTOR,
			});

			handleGridKeyboardEvent(event, elements, {
				blocked: keyDown.alert || keyDown.modal || isGridShortcutBlockedByActiveInput(SHEET_CANVAS_GRID_EDITOR_SELECTOR),
				hasActiveCell: Boolean(selectedCellState || runtimeRef.current?.rowIds.length),
				hasActiveEditState: Boolean(editState),
				isTextInputKey: isGridTextInputKey(event),
				onArrow: navigateSheetArrow,
				onClear: clearSelectedSheetCells,
				onCopy: copySelectedSheetCells,
				onDismissActiveEditor: () => {
					setEditState(null);
				},
				onDismissEditor: () => {
					setEditState(null);
				},
				onEditorCommit: commitEditorElement,
				onEnter: () => {
					openSheetCellEditor();
				},
				onEscapeSelection: () => {
					setSelectedCellKeyMap(getGridResolvedSelectedCellKeyMap({
						selectedCellState,
					}));
				},
				onPaste: pasteSelectedSheetCells,
				onSelectAll: selectAllSheetCells,
				onTab: navigateSheetTab,
				onTextInput: (pressed) => {
					openSheetCellEditor(selectedCellState, pressed);
				},
				readClipboardText: readSheetClipboardText,
				stopImmediatePropagation: true,
			});
		};

		const removeGridKeyboardEventListener = addGridKeyboardEventListener(onKeyDown);

		return () => {
			removeGridKeyboardEventListener();
		};
	}, [
		clearSelectedSheetCells,
		commitEditorElement,
		copySelectedSheetCells,
		editState,
		keyDown.alert,
		keyDown.modal,
		navigateSheetArrow,
		navigateSheetTab,
		openSheetCellEditor,
		pasteSelectedSheetCells,
		selectAllSheetCells,
		selectedCellState,
	]);

	const startColumnResize = useCallback((metric: SheetColumnMetric, clientX: number) => {
		const canvasColumn = metric.column as SheetCanvasColumn;
		const columnKey = String(canvasColumn.sheetColumnIndex);

		setResizeState({
			columnKey,
			latestWidth: metric.width,
			startClientX: clientX,
			startWidth: metric.width,
		});
	}, []);

	const startRowResize = useCallback((metric: SheetRowMetric, clientY: number) => {
		setRowResizeState({
			latestHeight: metric.height,
			rowKey: metric.rowKey,
			startClientY: clientY,
			startHeight: metric.height,
		});
	}, []);

	useEffect(() => {
		if (!resizeState?.columnKey) {
			return;
		}

		const activeColumnKey = resizeState.columnKey;
		const onPointerMove = (event: globalThis.PointerEvent) => {
			setResizeState((current) => {
				if (!current || current.columnKey !== activeColumnKey) {
					return current;
				}

				return {
					...current,
					latestWidth: clampSheetColumnWidth(current.startWidth + event.clientX - current.startClientX),
				};
			});
		};
		const onPointerUp = async () => {
			const state = resizeStateRef.current;
			const current = runtimeRef.current;
			const metric = state ? current?.columnMetricsByKey.get(state.columnKey) : null;
			const canvasColumn = metric?.column as SheetCanvasColumn | undefined;

			setResizeState(null);

			if (!state || !canvasColumn) {
				return;
			}

			const design = designRef.current;
			const columns = {
				...(design.columns || {}),
				[String(canvasColumn.sheetColumnIndex)]: {
					...(design.columns?.[String(canvasColumn.sheetColumnIndex)] || {}),
					width: state.latestWidth,
				},
			};

			setLocalColumnWidths((currentWidths) => ({
				...currentWidths,
				[state.columnKey]: state.latestWidth,
			}));
			await onUpdateSheetDesignRef.current({
				columns: JSON.stringify(columns),
			});
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp, {
			once: true,
		});
		window.addEventListener('pointercancel', onPointerUp, {
			once: true,
		});

		return () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
		};
	}, [resizeState?.columnKey]);

	useEffect(() => {
		if (!rowResizeState?.rowKey) {
			return;
		}

		const activeRowKey = rowResizeState.rowKey;
		const onPointerMove = (event: globalThis.PointerEvent) => {
			setRowResizeState((current) => {
				if (!current || current.rowKey !== activeRowKey) {
					return current;
				}

				return {
					...current,
					latestHeight: clampSheetRowHeight(current.startHeight + event.clientY - current.startClientY),
				};
			});
		};
		const onPointerUp = async () => {
			const state = rowResizeStateRef.current;
			const design = designRef.current;

			if (!state) {
				setRowResizeState(null);
				return;
			}

			const rows = {
				...(design.rows || {}),
				[state.rowKey]: {
					...(design.rows?.[state.rowKey] || {}),
					height: state.latestHeight,
				},
			};

			setRowResizeState(null);
			setLocalRowHeights((currentHeights) => ({
				...currentHeights,
				[state.rowKey]: state.latestHeight,
			}));
			await onUpdateSheetDesignRef.current({
				rows: JSON.stringify(rows),
			});
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp, {
			once: true,
		});
		window.addEventListener('pointercancel', onPointerUp, {
			once: true,
		});

		return () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
		};
	}, [rowResizeState?.rowKey]);

	const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
		dismissGridContextMenuOnPointerDown(event.nativeEvent, closeSheetContextMenu);

		if (p.disabled || event.button !== 0 || event.target instanceof Element && event.target.closest(SHEET_CANVAS_GRID_EDITOR_SELECTOR)) {
			return;
		}

		const runtime = runtimeRef.current;
		const hit = runtime ? getSheetCanvasPointerHit({
			clientX: event.clientX,
			clientY: event.clientY,
			columnMetrics: runtime.columnMetrics,
			columnOffsets: runtime.columnOffsets,
			rowMetrics: runtime.rowMetrics,
			rowOffsets: runtime.rowOffsets,
			scrollLeft: runtime.scrollLeft,
			scrollNode: runtime.scrollNode,
			scrollTop: runtime.scrollTop,
			stickyColumnCount,
		}) : {};

		if (hit.columnResize) {
			event.preventDefault();
			startColumnResize(hit.columnResize.columnMetric, event.clientX);
			return;
		}

		if (hit.rowResize) {
			event.preventDefault();
			startRowResize(hit.rowResize.rowMetric, event.clientY);
			return;
		}

		if (hit.columnHeader) {
			event.preventDefault();
			selectSheetColumn(hit.columnHeader.columnMetric);
			dragSelectionRef.current = {
				anchorColumnMetric: hit.columnHeader.columnMetric,
				latestColumnMetric: hit.columnHeader.columnMetric,
				pointerId: event.pointerId,
				started: false,
				type: 'COLUMN_HEADER',
			};

			const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
				const dragState = dragSelectionRef.current;
				const currentRuntime = runtimeRef.current;

				if (!dragState || dragState.type !== 'COLUMN_HEADER' || dragState.pointerId !== moveEvent.pointerId || !currentRuntime) {
					return;
				}

				const nextHit = getSheetCanvasPointerHit({
					clientX: moveEvent.clientX,
					clientY: moveEvent.clientY,
					columnMetrics: currentRuntime.columnMetrics,
					columnOffsets: currentRuntime.columnOffsets,
					rowMetrics: currentRuntime.rowMetrics,
					rowOffsets: currentRuntime.rowOffsets,
					scrollLeft: currentRuntime.scrollLeft,
					scrollNode: currentRuntime.scrollNode,
					scrollTop: currentRuntime.scrollTop,
					stickyColumnCount,
				});

				const nextColumnMetric = nextHit.columnHeader?.columnMetric || nextHit.cell?.columnMetric;

				if (!nextColumnMetric) {
					return;
				}

				moveEvent.preventDefault();
				dragSelectionRef.current = {
					...dragState,
					latestColumnMetric: nextColumnMetric,
					started: true,
				};
				selectSheetColumnRange(dragState.anchorColumnMetric, nextColumnMetric);
			};
			const onPointerUp = (upEvent: globalThis.PointerEvent) => {
				if (dragSelectionRef.current?.pointerId === upEvent.pointerId) {
					dragSelectionRef.current = null;
				}

				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				window.removeEventListener('pointercancel', onPointerUp);
			};

			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', onPointerUp);
			window.addEventListener('pointercancel', onPointerUp);
			return;
		}

		if (hit.rowHeader) {
			event.preventDefault();
			selectSheetRow(hit.rowHeader.rowMetric);
			dragSelectionRef.current = {
				anchorRowMetric: hit.rowHeader.rowMetric,
				latestRowMetric: hit.rowHeader.rowMetric,
				pointerId: event.pointerId,
				started: false,
				type: 'ROW_HEADER',
			};

			const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
				const dragState = dragSelectionRef.current;
				const currentRuntime = runtimeRef.current;

				if (!dragState || dragState.type !== 'ROW_HEADER' || dragState.pointerId !== moveEvent.pointerId || !currentRuntime) {
					return;
				}

				const nextHit = getSheetCanvasPointerHit({
					clientX: moveEvent.clientX,
					clientY: moveEvent.clientY,
					columnMetrics: currentRuntime.columnMetrics,
					columnOffsets: currentRuntime.columnOffsets,
					rowMetrics: currentRuntime.rowMetrics,
					rowOffsets: currentRuntime.rowOffsets,
					scrollLeft: currentRuntime.scrollLeft,
					scrollNode: currentRuntime.scrollNode,
					scrollTop: currentRuntime.scrollTop,
					stickyColumnCount,
				});

				const nextRowMetric = nextHit.rowHeader?.rowMetric || nextHit.cell?.rowMetric;

				if (!nextRowMetric) {
					return;
				}

				moveEvent.preventDefault();
				dragSelectionRef.current = {
					...dragState,
					latestRowMetric: nextRowMetric,
					started: true,
				};
				selectSheetRowRange(dragState.anchorRowMetric, nextRowMetric);
			};
			const onPointerUp = (upEvent: globalThis.PointerEvent) => {
				if (dragSelectionRef.current?.pointerId === upEvent.pointerId) {
					dragSelectionRef.current = null;
				}

				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
				window.removeEventListener('pointercancel', onPointerUp);
			};

			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', onPointerUp);
			window.addEventListener('pointercancel', onPointerUp);
			return;
		}

		if (!runtime || !hit.cell) {
			return;
		}

		const anchorCell = {
			cellKey: hit.cell.cellKey,
			rowId: hit.cell.rowId,
		};

		if (event.shiftKey && selectedCellState) {
			event.preventDefault();
			selectSheetCellRangeToTarget(anchorCell);
			return;
		}

		selectSheetCell(anchorCell);
		dragSelectionRef.current = {
			anchorCell,
			latestCell: anchorCell,
			pointerId: event.pointerId,
			started: false,
			type: 'CELL',
		};

		const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
			const dragState = dragSelectionRef.current;
			const currentRuntime = runtimeRef.current;

			if (!dragState || dragState.type !== 'CELL' || dragState.pointerId !== moveEvent.pointerId || !currentRuntime) {
				return;
			}

			const nextHit = getSheetCanvasPointerHit({
				clientX: moveEvent.clientX,
				clientY: moveEvent.clientY,
				columnMetrics: currentRuntime.columnMetrics,
				columnOffsets: currentRuntime.columnOffsets,
				rowMetrics: currentRuntime.rowMetrics,
				rowOffsets: currentRuntime.rowOffsets,
				scrollLeft: currentRuntime.scrollLeft,
				scrollNode: currentRuntime.scrollNode,
				scrollTop: currentRuntime.scrollTop,
				stickyColumnCount,
			});

			if (!nextHit.cell) {
				return;
			}

			const nextCell = {
				cellKey: nextHit.cell.cellKey,
				rowId: nextHit.cell.rowId,
			};

			moveEvent.preventDefault();
			dragSelectionRef.current = {
				...dragState,
				latestCell: nextCell,
				started: true,
			};

			const selection = getGridRangeSelection({
				activeCell: nextCell,
				anchorCell: dragState.anchorCell,
				columnMetrics: currentRuntime.columnMetrics,
				rowIds: currentRuntime.rowIds,
				selectedActiveCell: dragState.anchorCell,
			});

			setEditState(null);
			setHeaderSelection(null);
			setSelectedCellState(selection.activeCell);
			setSelectedCellKeyMap(selection.selectedCellKeyMap);
		};
		const onPointerUp = (upEvent: globalThis.PointerEvent) => {
			if (dragSelectionRef.current?.pointerId === upEvent.pointerId) {
				dragSelectionRef.current = null;
			}

			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerUp);
	}, [closeSheetContextMenu, p.disabled, selectSheetCell, selectSheetCellRangeToTarget, selectSheetColumn, selectSheetColumnRange, selectedCellState, selectSheetRow, selectSheetRowRange, setHeaderSelection, startColumnResize, startRowResize, stickyColumnCount]);

	const handleDoubleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
		const runtime = runtimeRef.current;
		const hit = runtime ? getSheetCanvasPointerHit({
			clientX: event.clientX,
			clientY: event.clientY,
			columnMetrics: runtime.columnMetrics,
			columnOffsets: runtime.columnOffsets,
			rowMetrics: runtime.rowMetrics,
			rowOffsets: runtime.rowOffsets,
			scrollLeft: runtime.scrollLeft,
			scrollNode: runtime.scrollNode,
			scrollTop: runtime.scrollTop,
			stickyColumnCount,
		}) : {};

		if (hit.cell) {
			openSheetCellEditor({
				cellKey: hit.cell.cellKey,
				rowId: hit.cell.rowId,
			});
		}
	}, [openSheetCellEditor, stickyColumnCount]);

	const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
		const runtime = runtimeRef.current;
		const hit = runtime ? getSheetCanvasPointerHit({
			clientX: event.clientX,
			clientY: event.clientY,
			columnMetrics: runtime.columnMetrics,
			columnOffsets: runtime.columnOffsets,
			rowMetrics: runtime.rowMetrics,
			rowOffsets: runtime.rowOffsets,
			scrollLeft: runtime.scrollLeft,
			scrollNode: runtime.scrollNode,
			scrollTop: runtime.scrollTop,
			stickyColumnCount,
		}) : {};

		if (!hit.cell) {
			return;
		}

		const nextCell = {
			cellKey: hit.cell.cellKey,
			rowId: hit.cell.rowId,
		};
		const renderKey = getSheetCellKey(nextCell.rowId, nextCell.cellKey);
		const nextSelectedCellKeyMap = selectedCellKeyMap?.[renderKey]
			? selectedCellKeyMap
			: getGridSelectedCellKeyMapFromCells([nextCell]);

		event.preventDefault();
		selectSheetCell(nextCell, nextSelectedCellKeyMap);
		openSheetContextMenu(event.nativeEvent, getSheetCanvasContextMenuTarget({
			cell: hit.cell,
			cellLookup,
			selectedCellKeyMap: nextSelectedCellKeyMap,
			selectedCellState: nextCell,
		}));
	}, [cellLookup, openSheetContextMenu, selectSheetCell, selectedCellKeyMap, selectedCellState, stickyColumnCount]);

	const handleFocusOut = useCallback((event: FocusEvent<HTMLDivElement>) => {
		const editorElement = event.target instanceof HTMLElement && event.target.closest(SHEET_CANVAS_GRID_EDITOR_SELECTOR) as HTMLElement | null;

		if (editorElement) {
			void commitEditorElement(editorElement);
		}
	}, [commitEditorElement]);

	const handleInput = useCallback((event: FormEvent<HTMLDivElement>) => {
		const editorElement = event.target instanceof HTMLElement && event.target.closest(SHEET_CANVAS_GRID_EDITOR_SELECTOR) as HTMLElement | null;

		if (!editorElement || !editState?.error) {
			return;
		}

		setEditState({
			cellKey: editorElement.dataset.cellKey || editState.cellKey,
			draftValue: getSheetEditorElementValue(editorElement),
			rowId: editorElement.dataset.rowId || editState.rowId,
		});
	}, [editState]);

	const overlayContent = <>
		{activeEditorColumn && editState && editorPosition
			? <SheetEditorOverlay
				column={activeEditorColumn}
				editState={editState}
				position={editorPosition}
				scrollLeft={scrollState.scrollLeft}
				scrollTop={scrollState.scrollTop}
			/>
			: null}
	</>;

	return <SheetCanvasSurface
		canvasHeight={Math.max(totalHeight, viewportHeight)}
		canvasWidth={Math.max(totalWidth, viewportWidth)}
		cellLookup={cellLookup}
		className={cn(p.className)}
		columns={columnMetricsData.metrics}
		editState={editState}
		headerContent={p.children}
		headerSelection={headerSelection}
		onContextMenu={handleContextMenu}
		onDoubleClick={handleDoubleClick}
		onFocusOut={handleFocusOut}
		onInput={handleInput}
		onPointerDown={handlePointerDown}
		overlayContent={overlayContent}
		resizeGuide={resizeGuide}
		rowMetrics={rowMetricsData.metrics}
		rowResizeGuide={rowResizeGuide}
		scrollLeft={scrollState.scrollLeft}
		scrollRef={scrollElement.ref}
		scrollTop={scrollState.scrollTop}
		selectedCellKeyMap={selectedCellKeyMap}
		selectedCellState={selectedCellState}
		stickyColumnCount={stickyColumnCount}
		stickyRowCount={Math.max(0, p.design.grid.frozenRows || 0)}
		viewportHeight={viewportHeight}
		viewportWidth={viewportWidth}
	/>;
}

export default SheetController;
