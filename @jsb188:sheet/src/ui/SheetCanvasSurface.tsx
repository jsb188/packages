import { cn } from '@jsb188/app/utils/string.ts';
import {
  getSheetCellKey,
  SHEET_HEADER_HEIGHT,
  SHEET_ROW_NUMBER_WIDTH,
  type SheetColumnMetric,
  type SheetRowMetric,
  type SheetUIEditState,
  type SheetUIResizeGuide,
  type SheetUIRowResizeGuide,
  type SheetUISelectedCellKeyMap,
  type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { memo, useEffect, useRef, type CSSProperties, type FocusEvent, type FormEvent, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from 'react';
import { getGridSelectionBoxPosition } from '../modules/grid-selection.ts';
import {
  getSheetCanvasColumnDisplayLeft,
  getSheetCanvasGridDisplayRight,
  getSheetCanvasRowDisplayTop,
  sheetCanvasRectIsVisible,
} from '../modules/sheet-canvas-geometry.ts';
import {
  getSheetCanvasStyleColor,
  type SheetCanvasCell,
  type SheetCanvasColumn,
} from '../modules/sheet-utils.ts';
import type { SheetHeaderSelectionState } from '../states/sheet-state.ts';

const SHEET_CANVAS_CELL_PADDING_X = 8;
const SHEET_CANVAS_GRID_LINE_WIDTH = 1;
const SHEET_CANVAS_SELECTION_ALPHA = 0.09;

type SheetCanvasTheme = {
	active: string;
	background: string;
	bodyText: string;
	fontFamily: string;
	fontFamilyMedium: string;
	fontFamilySemibold: string;
	fontSize: string;
	grid: string;
	headerBackground: string;
	headerSelectedDivider: string;
	headerSelectedText: string;
	headerText: string;
	resizeGuide: string;
	selectionFill: string;
};

type SheetCanvasRect = {
	height: number;
	left: number;
	top: number;
	width: number;
};

type SheetCanvasDividerRect = SheetCanvasRect;

type SheetCanvasColumnRect = SheetCanvasRect & {
	cellKey: string;
	metric: SheetColumnMetric;
};

type SheetCanvasRowRect = SheetCanvasRect & {
	metric: SheetRowMetric;
};

export type SheetCanvasSurfaceProps = {
	canvasHeight: number;
	canvasWidth: number;
	cellLookup: Map<string, SheetCanvasCell>;
	className?: string;
	columns: SheetColumnMetric[];
	editState?: SheetUIEditState | null;
	headerContent?: ReactNode;
	headerSelection?: SheetHeaderSelectionState | null;
	onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
	onDoubleClick?: (event: MouseEvent<HTMLDivElement>) => void;
	onFocusOut?: (event: FocusEvent<HTMLDivElement>) => void;
	onInput?: (event: FormEvent<HTMLDivElement>) => void;
	onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
	overlayContent?: ReactNode;
	resizeGuide?: SheetUIResizeGuide | null;
	rowResizeGuide?: SheetUIRowResizeGuide | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollRef?: Ref<HTMLDivElement>;
	scrollTop: number;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	stickyColumnCount?: number | null;
	stickyRowCount?: number | null;
	style?: CSSProperties;
	viewportHeight: number;
	viewportWidth: number;
};

/*
 * Convert a CSS variable or direct color into a canvas-safe color string.
 */
function getSheetCanvasCSSColor(styles: CSSStyleDeclaration, name: string, fallback: string) {
	const value = styles.getPropertyValue(name).trim();

	if (!value) {
		return fallback;
	}

	if (/^\d/.test(value)) {
		return `rgb(${value})`;
	}

	return value;
}

/*
 * Return a CSS variable value for canvas font declarations.
 */
function getSheetCanvasCSSValue(styles: CSSStyleDeclaration, name: string, fallback: string) {
	return styles.getPropertyValue(name).trim() || fallback;
}

/*
 * Return theme colors resolved from the current app CSS variables.
 */
function getSheetCanvasTheme(canvas: HTMLCanvasElement): SheetCanvasTheme {
	const styles = getComputedStyle(canvas);
	const active = getSheetCanvasCSSColor(styles, '--color-primary', '#2563eb');

	return {
		active,
		background: getSheetCanvasCSSColor(styles, '--color-bg', '#ffffff'),
		bodyText: getSheetCanvasCSSColor(styles, '--color-text', '#111827'),
		fontFamily: getSheetCanvasCSSValue(styles, '--font-sans', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'),
		fontFamilyMedium: getSheetCanvasCSSValue(styles, '--font-sans-medium', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'),
		fontFamilySemibold: getSheetCanvasCSSValue(styles, '--font-sans-semibold', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'),
		fontSize: getSheetCanvasCSSValue(styles, '--text-xsmall', '0.875rem'),
		grid: getSheetCanvasCSSColor(styles, '--color-darker-light', 'rgba(0,0,0,.08)'),
		headerBackground: getSheetCanvasCSSColor(styles, '--color-bg-fade', '#f8fafc'),
		headerSelectedDivider: getSheetCanvasCSSColor(styles, '--color-primary-hover', '#1d4ed8'),
		headerSelectedText: getSheetCanvasCSSColor(styles, '--color-solid', '#ffffff'),
		headerText: getSheetCanvasCSSColor(styles, '--color-text-medium', '#475569'),
		resizeGuide: getSheetCanvasCSSColor(styles, '--color-bg-active', '#e5e7eb'),
		selectionFill: active,
	};
}

/*
 * Draw a sheet cell fill rectangle without painting over divider lines.
 */
function drawSheetCanvasCellFillRect(params: {
	ctx: CanvasRenderingContext2D;
	color: string;
	height: number;
	left: number;
	top: number;
	width: number;
}) {
	const inset = SHEET_CANVAS_GRID_LINE_WIDTH;
	const left = Math.round(params.left) + inset;
	const top = Math.round(params.top) + inset;
	const width = Math.max(0, Math.round(params.width) - inset);
	const height = Math.max(0, Math.round(params.height) - inset);

	if (!width || !height) {
		return;
	}

	params.ctx.fillStyle = params.color;
	params.ctx.fillRect(left, top, width, height);
}

/*
 * Draw clipped cell text inside one canvas rectangle.
 */
function drawSheetCanvasText(params: {
	align?: CanvasTextAlign;
	color: string;
	ctx: CanvasRenderingContext2D;
	fontFamily?: string;
	height: number;
	text: string;
	theme: SheetCanvasTheme;
	width: number;
	x: number;
	y: number;
}) {
	if (!params.text) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.rect(params.x + 1, params.y + 1, Math.max(0, params.width - 1), Math.max(0, params.height - 1));
	params.ctx.clip();
	params.ctx.fillStyle = params.color;
	params.ctx.font = `${params.theme.fontSize} ${params.fontFamily || params.theme.fontFamily}`;
	params.ctx.textAlign = params.align || 'left';
	params.ctx.textBaseline = 'middle';

	const textX = params.align === 'center'
		? params.x + params.width / 2
		: params.x + SHEET_CANVAS_CELL_PADDING_X;

	params.ctx.fillText(
		params.text,
		textX,
		params.y + params.height / 2,
		Math.max(0, params.width - SHEET_CANVAS_CELL_PADDING_X * 2),
	);
	params.ctx.restore();
}

/*
 * Draw an active selection border that covers the grid divider plus one outside pixel.
 */
function drawSheetCanvasCellActiveBorder(params: {
	ctx: CanvasRenderingContext2D;
	height: number;
	left: number;
	top: number;
	theme: SheetCanvasTheme;
	width: number;
}) {
	const left = Math.round(params.left);
	const top = Math.round(params.top);
	const right = left + Math.max(0, Math.round(params.width));
	const bottom = top + Math.max(0, Math.round(params.height));

	params.ctx.fillStyle = params.theme.active;
	params.ctx.fillRect(left - 1, top - 1, right - left + 3, 2);
	params.ctx.fillRect(left - 1, bottom, right - left + 3, 2);
	params.ctx.fillRect(left - 1, top - 1, 2, bottom - top + 3);
	params.ctx.fillRect(right, top - 1, 2, bottom - top + 3);
}

/*
 * Return visible column rectangles with sheet coordinate metadata resolved once per paint.
 */
function getSheetCanvasVisibleColumnRects(params: {
	columns: SheetColumnMetric[];
	scrollLeft: number;
	stickyColumnCount: number;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const rects: SheetCanvasColumnRect[] = [];

	params.columns.forEach((metric) => {
		const canvasColumn = metric.column as SheetCanvasColumn;
		const columnIndex = canvasColumn.sheetColumnIndex || Number(metric.column.key || 0);
		const rect = {
			cellKey: String(columnIndex || metric.column.key),
			height: params.viewportHeight,
			left: getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount),
			metric,
			top: 0,
			width: metric.width,
		};

		if (sheetCanvasRectIsVisible(rect, params.viewportWidth, params.viewportHeight)) {
			rects.push(rect);
		}
	});

	return rects;
}

/*
 * Return visible row rectangles with sheet coordinate metadata resolved once per paint.
 */
function getSheetCanvasVisibleRowRects(params: {
	rowMetrics: SheetRowMetric[];
	scrollTop: number;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const rects: SheetCanvasRowRect[] = [];

	params.rowMetrics.forEach((metric) => {
		const rect = {
			height: metric.height,
			left: SHEET_ROW_NUMBER_WIDTH,
			metric,
			top: getSheetCanvasRowDisplayTop(metric, params.scrollTop),
			width: Math.max(0, params.viewportWidth - SHEET_ROW_NUMBER_WIDTH),
		};

		if (sheetCanvasRectIsVisible(rect, params.viewportWidth, params.viewportHeight)) {
			rects.push(rect);
		}
	});

	return rects;
}

/*
 * Draw a dashed border around the full multi-cell selection range.
 */
function drawSheetCanvasSelectionBorder(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const position = getGridSelectionBoxPosition({
		columnMetrics: params.columns,
		getColumnDisplayLeft: (metric) => {
			return getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount) - SHEET_ROW_NUMBER_WIDTH;
		},
		getRowDisplayTop: (metric) => {
			return metric.top - params.scrollTop;
		},
		rowMetrics: params.rowMetrics,
		selectedCellKeyMap: params.selectedCellKeyMap,
		stickyHeaderHeight: SHEET_HEADER_HEIGHT,
	});

	if (!position || !sheetCanvasRectIsVisible(position, params.viewportWidth, params.viewportHeight)) {
		return;
	}

	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.setLineDash([4, 3]);
	params.ctx.strokeStyle = params.theme.active;
	params.ctx.lineWidth = 1;
	params.ctx.strokeRect(
		Math.round(position.left) + 1.5,
		Math.round(position.top) + 1.5,
		Math.max(0, Math.round(position.width) - 1),
		Math.max(0, Math.round(position.height) - 1),
	);
	params.ctx.restore();
}

/*
 * Draw one visible sheet body cell.
 */
function drawSheetCanvasCell(params: {
	cell?: SheetCanvasCell;
	ctx: CanvasRenderingContext2D;
	height: number;
	isSelected: boolean;
	theme: SheetCanvasTheme;
	width: number;
	x: number;
	y: number;
}) {
	const backgroundColor = params.cell?.style
		? getSheetCanvasStyleColor(params.cell.style, ['backgroundColor', 'fillColor'])
		: null;
	const textColor = params.cell?.style
		? getSheetCanvasStyleColor(params.cell.style, ['color', 'textColor'])
		: null;

	if (backgroundColor) {
		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: backgroundColor,
			height: params.height,
			left: params.x,
			top: params.y,
			width: params.width,
		});
	}

	if (params.isSelected) {
		params.ctx.save();
		params.ctx.globalAlpha = SHEET_CANVAS_SELECTION_ALPHA;
		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: params.theme.selectionFill,
			height: params.height,
			left: params.x,
			top: params.y,
			width: params.width,
		});
		params.ctx.restore();
	}

	drawSheetCanvasText({
		color: textColor || params.theme.bodyText,
		ctx: params.ctx,
		height: params.height,
		text: params.cell?.displayValue || '',
		theme: params.theme,
		width: params.width,
		x: params.x,
		y: params.y,
	});
}

/*
 * Draw one visible body cell, optionally suppressing selection decoration for overlay panes.
 */
function drawSheetCanvasBodyCell(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRect: SheetCanvasColumnRect;
	ctx: CanvasRenderingContext2D;
	rowRect: SheetCanvasRowRect;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	suppressSelection?: boolean;
	theme: SheetCanvasTheme;
}) {
	const rect = {
		height: params.rowRect.height,
		left: params.columnRect.left,
		top: params.rowRect.top,
		width: params.columnRect.width,
	};
	const renderKey = getSheetCellKey(params.rowRect.metric.rowKey, params.columnRect.cellKey);
	const cell = params.cellLookup.get(renderKey);
	const isActive = params.selectedCellState?.rowId === params.rowRect.metric.rowKey &&
		params.selectedCellState.cellKey === params.columnRect.cellKey;

	if (params.suppressSelection) {
		params.ctx.fillStyle = params.theme.background;
		params.ctx.fillRect(
			Math.round(rect.left),
			Math.round(rect.top),
			Math.max(0, Math.round(rect.width)),
			Math.max(0, Math.round(rect.height)),
		);
	}

	drawSheetCanvasCell({
		cell,
		ctx: params.ctx,
		height: rect.height,
		isSelected: !params.suppressSelection && Boolean(params.selectedCellKeyMap?.[renderKey] || isActive),
		theme: params.theme,
		width: rect.width,
		x: rect.left,
		y: rect.top,
	});

	return {
		isActive,
		rect,
	};
}

/*
 * Draw the visible body cells and return the current active cell rectangle.
 */
function drawSheetCanvasBodyCells(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRects: SheetCanvasColumnRect[];
	ctx: CanvasRenderingContext2D;
	rowRects: SheetCanvasRowRect[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	theme: SheetCanvasTheme;
}): SheetCanvasRect | null {
	let activeCellRect: SheetCanvasRect | null = null;

	params.rowRects.forEach((rowRect) => {
		params.columnRects.forEach((columnRect) => {
			const result = drawSheetCanvasBodyCell({
				cellLookup: params.cellLookup,
				columnRect,
				ctx: params.ctx,
				rowRect,
				selectedCellKeyMap: params.selectedCellKeyMap,
				selectedCellState: params.selectedCellState,
				theme: params.theme,
			});

			if (result.isActive) {
				activeCellRect = result.rect;
			}
		});
	});

	return activeCellRect;
}

/*
 * Repaint sticky Sheet panes above selection overlays and active-cell outlines.
 */
function drawSheetCanvasStickyBodyCells(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnRects: SheetCanvasColumnRect[];
	ctx: CanvasRenderingContext2D;
	rowRects: SheetCanvasRowRect[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	stickyColumnCount: number;
	stickyRowCount: number;
	theme: SheetCanvasTheme;
}) {
	if (!params.stickyColumnCount && !params.stickyRowCount) {
		return;
	}

	params.rowRects.forEach((rowRect) => {
		const isStickyRow = rowRect.metric.rowIndex < params.stickyRowCount;

		params.columnRects.forEach((columnRect) => {
			const isStickyColumn = columnRect.metric.columnIndex < params.stickyColumnCount;

			if (!isStickyColumn && !isStickyRow) {
				return;
			}

			drawSheetCanvasBodyCell({
				cellLookup: params.cellLookup,
				columnRect,
				ctx: params.ctx,
				rowRect,
				selectedCellKeyMap: params.selectedCellKeyMap,
				selectedCellState: params.selectedCellState,
				suppressSelection: true,
				theme: params.theme,
			});
		});
	});
}

/*
 * Return whether one header selection contains the requested column header.
 */
function sheetCanvasHeaderSelectionHasColumn(selection: SheetHeaderSelectionState | null | undefined, cellKey: string) {
	return selection?.type === 'COLUMN' && selection.cellKeys.includes(cellKey);
}

/*
 * Return whether one header selection contains the requested row header.
 */
function sheetCanvasHeaderSelectionHasRow(selection: SheetHeaderSelectionState | null | undefined, rowId: string) {
	return selection?.type === 'ROW' && selection.rowIds.includes(rowId);
}

/*
 * Return quick row and column lookups represented by the active body-cell selection.
 */
function getSheetCanvasSelectedHeaderKeySets(params: {
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const columnKeys = new Set<string>();
	const rowIds = new Set<string>();

	if (params.selectedCellState) {
		columnKeys.add(params.selectedCellState.cellKey);
		rowIds.add(params.selectedCellState.rowId);
	}

	if (params.selectedCellKeyMap) {
		for (const key in params.selectedCellKeyMap) {
			if (!params.selectedCellKeyMap[key]) {
				continue;
			}

			const [rowId, cellKey] = key.split(':');

			if (rowId) {
				rowIds.add(rowId);
			}

			if (cellKey) {
				columnKeys.add(cellKey);
			}
		}
	}

	return {
		columnKeys,
		rowIds,
	};
}

/*
 * Return whether two ordered string lists contain the same values.
 */
function sheetCanvasStringArraysAreEqual(a?: string[] | null, b?: string[] | null) {
	if (a === b) {
		return true;
	}

	if (!a || !b || a.length !== b.length) {
		return false;
	}

	return a.every((value, index) => value === b[index]);
}

/*
 * Return whether two header selections describe the same highlighted headers.
 */
function sheetCanvasHeaderSelectionsAreEqual(a?: SheetHeaderSelectionState | null, b?: SheetHeaderSelectionState | null) {
	if (a === b) {
		return true;
	}

	if (!a || !b || a.type !== b.type) {
		return false;
	}

	if (a.type === 'COLUMN' && b.type === 'COLUMN') {
		return sheetCanvasStringArraysAreEqual(a.cellKeys, b.cellKeys);
	}

	if (a.type === 'ROW' && b.type === 'ROW') {
		return sheetCanvasStringArraysAreEqual(a.rowIds, b.rowIds);
	}

	return false;
}

/*
 * Draw sticky column and row headers for the canvas grid.
 */
function drawSheetCanvasHeaders(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	headerSelection?: SheetHeaderSelectionState | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const selectedHeaderKeys = params.headerSelection
		? {
			columnKeys: new Set<string>(),
			rowIds: new Set<string>(),
		}
		: getSheetCanvasSelectedHeaderKeySets({
			selectedCellKeyMap: params.selectedCellKeyMap,
			selectedCellState: params.selectedCellState,
		});

	drawSheetCanvasCellFillRect({
		ctx: params.ctx,
		color: params.theme.headerBackground,
		height: SHEET_HEADER_HEIGHT,
		left: 0,
		top: 0,
		width: params.viewportWidth,
	});
	drawSheetCanvasCellFillRect({
		ctx: params.ctx,
		color: params.theme.headerBackground,
		height: Math.max(0, params.viewportHeight - SHEET_HEADER_HEIGHT),
		left: 0,
		top: SHEET_HEADER_HEIGHT,
		width: SHEET_ROW_NUMBER_WIDTH,
	});

	params.columns.forEach((metric) => {
		const x = getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount);
		const rect = {
			height: SHEET_HEADER_HEIGHT,
			left: x,
			top: 0,
			width: metric.width,
		};

		if (!sheetCanvasRectIsVisible(rect, params.viewportWidth, SHEET_HEADER_HEIGHT)) {
			return;
		}

		const cellKey = getSheetCanvasHeaderColumnCellKey(metric);
		const headerSelected = sheetCanvasHeaderSelectionHasColumn(params.headerSelection, cellKey);
		const bodySelected = selectedHeaderKeys.columnKeys.has(cellKey);

		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: headerSelected ? params.theme.active : params.theme.headerBackground,
			height: rect.height,
			left: rect.left,
			top: rect.top,
			width: rect.width,
		});
		if (bodySelected) {
			params.ctx.save();
			params.ctx.globalAlpha = SHEET_CANVAS_SELECTION_ALPHA;
			drawSheetCanvasCellFillRect({
				ctx: params.ctx,
				color: params.theme.selectionFill,
				height: rect.height,
				left: rect.left,
				top: rect.top,
				width: rect.width,
			});
			params.ctx.restore();
		}
		drawSheetCanvasText({
			align: 'center',
			color: headerSelected ? params.theme.headerSelectedText : params.theme.headerText,
			ctx: params.ctx,
			fontFamily: params.theme.fontFamilyMedium,
			height: rect.height,
			text: metric.column.label,
			theme: params.theme,
			width: rect.width,
			x: rect.left,
			y: rect.top,
		});
	});

	// Re-cover the top-left row number corner so horizontally scrolled column labels cannot show through.
	drawSheetCanvasCellFillRect({
		ctx: params.ctx,
		color: params.theme.headerBackground,
		height: SHEET_HEADER_HEIGHT,
		left: 0,
		top: 0,
		width: SHEET_ROW_NUMBER_WIDTH,
	});

	params.rowMetrics.forEach((metric) => {
		const y = getSheetCanvasRowDisplayTop(metric, params.scrollTop);
		const rect = {
			height: metric.height,
			left: 0,
			top: y,
			width: SHEET_ROW_NUMBER_WIDTH,
		};

		if (!sheetCanvasRectIsVisible(rect, SHEET_ROW_NUMBER_WIDTH, params.viewportHeight)) {
			return;
		}

		const headerSelected = sheetCanvasHeaderSelectionHasRow(params.headerSelection, metric.rowKey);
		const bodySelected = selectedHeaderKeys.rowIds.has(metric.rowKey);

		drawSheetCanvasCellFillRect({
			ctx: params.ctx,
			color: headerSelected ? params.theme.active : params.theme.headerBackground,
			height: rect.height,
			left: rect.left,
			top: rect.top,
			width: rect.width,
		});
		if (bodySelected) {
			params.ctx.save();
			params.ctx.globalAlpha = SHEET_CANVAS_SELECTION_ALPHA;
			drawSheetCanvasCellFillRect({
				ctx: params.ctx,
				color: params.theme.selectionFill,
				height: rect.height,
				left: rect.left,
				top: rect.top,
				width: rect.width,
			});
			params.ctx.restore();
		}
		drawSheetCanvasText({
			align: 'center',
			color: headerSelected ? params.theme.headerSelectedText : params.theme.headerText,
			ctx: params.ctx,
			fontFamily: params.theme.fontFamilyMedium,
			height: rect.height,
			text: String(metric.rowKey),
			theme: params.theme,
			width: rect.width,
			x: rect.left,
			y: rect.top,
		});
	});
}

/*
 * Add one crisp vertical canvas line to a batched grid path.
 */
function addSheetCanvasVerticalGridLine(params: {
	bottom: number;
	ctx: CanvasRenderingContext2D;
	seen: Set<number>;
	top: number;
	x: number;
}) {
	const key = Math.round(params.x);
	const x = key + 0.5;
	const top = Math.round(params.top) + 0.5;
	const bottom = Math.round(params.bottom) + 0.5;

	if (params.seen.has(key) || bottom <= top) {
		return;
	}

	params.seen.add(key);
	params.ctx.moveTo(x, top);
	params.ctx.lineTo(x, bottom);
}

/*
 * Add one crisp horizontal canvas line to a batched grid path.
 */
function addSheetCanvasHorizontalGridLine(params: {
	ctx: CanvasRenderingContext2D;
	left: number;
	right: number;
	seen: Set<number>;
	y: number;
}) {
	const key = Math.round(params.y);
	const y = key + 0.5;
	const left = Math.round(params.left) + 0.5;
	const right = Math.round(params.right) + 0.5;

	if (params.seen.has(key) || right <= left) {
		return;
	}

	params.seen.add(key);
	params.ctx.moveTo(left, y);
	params.ctx.lineTo(right, y);
}

/*
 * Return the Sheet cell key represented by one rendered column metric.
 */
function getSheetCanvasHeaderColumnCellKey(metric?: SheetColumnMetric | null) {
	if (!metric) {
		return '';
	}

	const canvasColumn = metric.column as SheetCanvasColumn;
	return String(canvasColumn.sheetColumnIndex || metric.column.key);
}

/*
 * Fill a list of selected-header divider rectangles with one canvas-safe color.
 */
function fillSheetCanvasDividerRects(ctx: CanvasRenderingContext2D, color: string, rects: SheetCanvasDividerRect[]) {
	if (!rects.length) {
		return;
	}

	ctx.fillStyle = color;
	rects.forEach((rect) => {
		ctx.fillRect(
			Math.round(rect.left),
			Math.round(rect.top),
			Math.max(0, Math.round(rect.width)),
			Math.max(0, Math.round(rect.height)),
		);
	});
}

/*
 * Draw selected-header dividers with hover lines inside the selection and primary lines on outer edges.
 */
function drawSheetCanvasSelectedHeaderGridLines(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	headerSelection?: SheetHeaderSelectionState | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	if (!params.headerSelection) {
		return;
	}

	const primaryRects: SheetCanvasDividerRect[] = [];
	params.ctx.save();
	params.ctx.beginPath();
	params.ctx.strokeStyle = params.theme.headerSelectedDivider;
	params.ctx.lineWidth = SHEET_CANVAS_GRID_LINE_WIDTH;

	if (params.headerSelection.type === 'COLUMN') {
		const selectedCellKeys = new Set(params.headerSelection.cellKeys);
		const selectedColumnVerticalLines = new Set<number>();

		params.columns.forEach((metric, index) => {
			const cellKey = getSheetCanvasHeaderColumnCellKey(metric);

			if (!selectedCellKeys.has(cellKey)) {
				return;
			}

			const left = getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount);
			const right = left + metric.width;
			const rect = {
				height: SHEET_HEADER_HEIGHT,
				left,
				top: 0,
				width: metric.width,
			};

			if (!sheetCanvasRectIsVisible(rect, params.viewportWidth, SHEET_HEADER_HEIGHT)) {
				return;
			}

			[left, right].forEach((x) => {
				addSheetCanvasVerticalGridLine({
					bottom: SHEET_HEADER_HEIGHT,
					ctx: params.ctx,
					seen: selectedColumnVerticalLines,
					top: 0,
					x,
				});
			});
			const horizontalLines = new Set<number>();

			[0, SHEET_HEADER_HEIGHT].forEach((y) => {
				addSheetCanvasHorizontalGridLine({
					ctx: params.ctx,
					left,
					right,
					seen: horizontalLines,
					y,
				});
			});

			if (!selectedCellKeys.has(getSheetCanvasHeaderColumnCellKey(params.columns[index - 1]))) {
				primaryRects.push({
					height: SHEET_HEADER_HEIGHT,
					left,
					top: 0,
					width: SHEET_CANVAS_GRID_LINE_WIDTH,
				});
			}

			if (!selectedCellKeys.has(getSheetCanvasHeaderColumnCellKey(params.columns[index + 1]))) {
				primaryRects.push({
					height: SHEET_HEADER_HEIGHT,
					left: right,
					top: 0,
					width: SHEET_CANVAS_GRID_LINE_WIDTH,
				});
			}

			primaryRects.push(
				{ height: SHEET_CANVAS_GRID_LINE_WIDTH, left, top: 0, width: right - left },
				{ height: SHEET_CANVAS_GRID_LINE_WIDTH, left, top: SHEET_HEADER_HEIGHT, width: right - left },
			);
		});
	}

	if (params.headerSelection.type === 'ROW') {
		const selectedRowIds = new Set(params.headerSelection.rowIds);
		const selectedRowHorizontalLines = new Set<number>();

		params.rowMetrics.forEach((metric, index) => {
			if (!selectedRowIds.has(metric.rowKey)) {
				return;
			}

			const top = getSheetCanvasRowDisplayTop(metric, params.scrollTop);
			const bottom = top + metric.height;
			const rect = {
				height: metric.height,
				left: 0,
				top,
				width: SHEET_ROW_NUMBER_WIDTH,
			};

			if (!sheetCanvasRectIsVisible(rect, SHEET_ROW_NUMBER_WIDTH, params.viewportHeight)) {
				return;
			}

			const verticalLines = new Set<number>();

			[0, SHEET_ROW_NUMBER_WIDTH].forEach((x) => {
				addSheetCanvasVerticalGridLine({
					bottom,
					ctx: params.ctx,
					seen: verticalLines,
					top,
					x,
				});
			});
			[top, bottom].forEach((y) => {
				addSheetCanvasHorizontalGridLine({
					ctx: params.ctx,
					left: 0,
					right: SHEET_ROW_NUMBER_WIDTH,
					seen: selectedRowHorizontalLines,
					y,
				});
			});

			primaryRects.push(
				{ height: bottom - top, left: 0, top, width: SHEET_CANVAS_GRID_LINE_WIDTH },
				{ height: bottom - top, left: SHEET_ROW_NUMBER_WIDTH, top, width: SHEET_CANVAS_GRID_LINE_WIDTH },
			);

			if (!selectedRowIds.has(params.rowMetrics[index - 1]?.rowKey || '')) {
				primaryRects.push({
					height: SHEET_CANVAS_GRID_LINE_WIDTH,
					left: 0,
					top,
					width: SHEET_ROW_NUMBER_WIDTH,
				});
			}

			if (!selectedRowIds.has(params.rowMetrics[index + 1]?.rowKey || '')) {
				primaryRects.push({
					height: SHEET_CANVAS_GRID_LINE_WIDTH,
					left: 0,
					top: bottom,
					width: SHEET_ROW_NUMBER_WIDTH,
				});
			}
		});
	}

	params.ctx.stroke();
	fillSheetCanvasDividerRects(params.ctx, params.theme.active, primaryRects);
	params.ctx.restore();
}

/*
 * Draw shared 1px grid dividers once for the visible Sheet viewport.
 */
function drawSheetCanvasGridLines(params: {
	columns: SheetColumnMetric[];
	ctx: CanvasRenderingContext2D;
	gridRight: number;
	headerSelection?: SheetHeaderSelectionState | null;
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const bodyHorizontalLines = new Set<number>();
	const bodyVerticalLines = new Set<number>();
	const fullHeightVerticalLines = new Set<number>();
	const fullWidthHorizontalLines = new Set<number>();
	const headerVerticalLines = new Set<number>();
	const rowHeaderHorizontalLines = new Set<number>();
	const bodyTop = SHEET_HEADER_HEIGHT;
	const bodyBottom = params.viewportHeight;
	const bodyLeft = SHEET_ROW_NUMBER_WIDTH;
	const bodyRight = Math.max(bodyLeft, Math.min(params.viewportWidth, params.gridRight));
	const headerDividerRight = bodyRight;

	params.ctx.beginPath();
	params.ctx.strokeStyle = params.theme.grid;
	params.ctx.lineWidth = SHEET_CANVAS_GRID_LINE_WIDTH;

	addSheetCanvasVerticalGridLine({
		bottom: params.viewportHeight,
		ctx: params.ctx,
		seen: fullHeightVerticalLines,
		top: 0,
		x: 0,
	});
	addSheetCanvasVerticalGridLine({
		bottom: params.viewportHeight,
		ctx: params.ctx,
		seen: fullHeightVerticalLines,
		top: 0,
		x: SHEET_ROW_NUMBER_WIDTH,
	});
	addSheetCanvasHorizontalGridLine({
		ctx: params.ctx,
		left: 0,
		right: params.viewportWidth,
		seen: fullWidthHorizontalLines,
		y: 0,
	});
	addSheetCanvasHorizontalGridLine({
		ctx: params.ctx,
		left: 0,
		right: headerDividerRight,
		seen: fullWidthHorizontalLines,
		y: SHEET_HEADER_HEIGHT,
	});

	params.columns.forEach((metric) => {
		const left = getSheetCanvasColumnDisplayLeft(metric, params.scrollLeft, params.stickyColumnCount);
		const right = left + metric.width;
		const visible = right >= bodyLeft && left <= params.viewportWidth;

		if (!visible) {
			return;
		}

		[left, right].forEach((x) => {
			if (x <= bodyLeft || x > params.viewportWidth) {
				return;
			}

			addSheetCanvasVerticalGridLine({
				bottom: SHEET_HEADER_HEIGHT,
				ctx: params.ctx,
				seen: headerVerticalLines,
				top: 0,
				x,
			});
			addSheetCanvasVerticalGridLine({
				bottom: bodyBottom,
				ctx: params.ctx,
				seen: bodyVerticalLines,
				top: bodyTop,
				x,
			});
		});
	});

	params.rowMetrics.forEach((metric) => {
		const top = getSheetCanvasRowDisplayTop(metric, params.scrollTop);
		const bottom = top + metric.height;
		const visible = bottom >= SHEET_HEADER_HEIGHT && top <= params.viewportHeight;

		if (!visible) {
			return;
		}

		[top, bottom].forEach((y) => {
			if (y <= SHEET_HEADER_HEIGHT || y > params.viewportHeight) {
				return;
			}

			addSheetCanvasHorizontalGridLine({
				ctx: params.ctx,
				left: 0,
				right: SHEET_ROW_NUMBER_WIDTH,
				seen: rowHeaderHorizontalLines,
				y,
			});
			addSheetCanvasHorizontalGridLine({
				ctx: params.ctx,
				left: bodyLeft,
				right: bodyRight,
				seen: bodyHorizontalLines,
				y,
			});
		});
	});

	params.ctx.stroke();

	drawSheetCanvasSelectedHeaderGridLines({
		columns: params.columns,
		ctx: params.ctx,
		headerSelection: params.headerSelection,
		rowMetrics: params.rowMetrics,
		scrollLeft: params.scrollLeft,
		scrollTop: params.scrollTop,
		stickyColumnCount: params.stickyColumnCount,
		theme: params.theme,
		viewportHeight: params.viewportHeight,
		viewportWidth: params.viewportWidth,
	});
}

/*
 * Fill the non-selectable area to the right of the Sheet grid.
 */
function drawSheetCanvasRightPaddingArea(params: {
	ctx: CanvasRenderingContext2D;
	gridRight: number;
	theme: SheetCanvasTheme;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const left = Math.max(SHEET_ROW_NUMBER_WIDTH, Math.min(params.viewportWidth, Math.round(params.gridRight) + 1));
	const width = Math.max(0, params.viewportWidth - left);

	if (!width) {
		return;
	}

	params.ctx.fillStyle = params.theme.headerBackground;
	params.ctx.fillRect(left, 0, width, params.viewportHeight);
}

/*
 * Draw the canvas sheet body, headers, and interaction guides.
 */
function drawSheetCanvasSurface(canvas: HTMLCanvasElement, p: SheetCanvasSurfaceProps) {
	const dpr = Math.max(1, globalThis.window?.devicePixelRatio || 1);
	const viewportWidth = Math.max(1, Math.floor(p.viewportWidth || canvas.clientWidth || 1));
	const viewportHeight = Math.max(1, Math.floor(p.viewportHeight || canvas.clientHeight || 1));
	const nextWidth = Math.max(1, Math.floor(viewportWidth * dpr));
	const nextHeight = Math.max(1, Math.floor(viewportHeight * dpr));

	if (canvas.width !== nextWidth) {
		canvas.width = nextWidth;
	}

	if (canvas.height !== nextHeight) {
		canvas.height = nextHeight;
	}

	canvas.style.width = `${viewportWidth}px`;
	canvas.style.height = `${viewportHeight}px`;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return;
	}

	const theme = getSheetCanvasTheme(canvas);
	const stickyColumnCount = Math.max(0, p.stickyColumnCount || 0);
	const stickyRowCount = Math.max(0, p.stickyRowCount || 0);
	const gridRight = getSheetCanvasGridDisplayRight(p.columns, p.scrollLeft, stickyColumnCount);
	const visibleColumnRects = getSheetCanvasVisibleColumnRects({
		columns: p.columns,
		scrollLeft: p.scrollLeft,
		stickyColumnCount,
		viewportHeight,
		viewportWidth,
	});
	const visibleRowRects = getSheetCanvasVisibleRowRects({
		rowMetrics: p.rowMetrics,
		scrollTop: p.scrollTop,
		viewportHeight,
		viewportWidth,
	});
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, viewportWidth, viewportHeight);
	ctx.fillStyle = theme.background;
	ctx.fillRect(0, 0, viewportWidth, viewportHeight);

	ctx.save();
	ctx.beginPath();
	ctx.rect(SHEET_ROW_NUMBER_WIDTH, SHEET_HEADER_HEIGHT, Math.max(0, viewportWidth - SHEET_ROW_NUMBER_WIDTH), Math.max(0, viewportHeight - SHEET_HEADER_HEIGHT));
	ctx.clip();

	const activeCellRect = drawSheetCanvasBodyCells({
		cellLookup: p.cellLookup,
		columnRects: visibleColumnRects,
		ctx,
		rowRects: visibleRowRects,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		theme,
	});

	ctx.restore();

	drawSheetCanvasRightPaddingArea({
		ctx,
		gridRight,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasSelectionBorder({
		columns: p.columns,
		ctx,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		selectedCellKeyMap: p.selectedCellKeyMap,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});

	if (activeCellRect) {
		drawSheetCanvasCellActiveBorder({
			ctx,
			height: activeCellRect.height,
			left: activeCellRect.left,
			top: activeCellRect.top,
			theme,
			width: activeCellRect.width,
		});
	}

	drawSheetCanvasStickyBodyCells({
		cellLookup: p.cellLookup,
		columnRects: visibleColumnRects,
		ctx,
		rowRects: visibleRowRects,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		stickyColumnCount,
		stickyRowCount,
		theme,
	});
	drawSheetCanvasHeaders({
		columns: p.columns,
		ctx,
		headerSelection: p.headerSelection,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		selectedCellKeyMap: p.selectedCellKeyMap,
		selectedCellState: p.selectedCellState,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});
	drawSheetCanvasGridLines({
		columns: p.columns,
		ctx,
		gridRight,
		headerSelection: p.headerSelection,
		rowMetrics: p.rowMetrics,
		scrollLeft: p.scrollLeft,
		scrollTop: p.scrollTop,
		stickyColumnCount,
		theme,
		viewportHeight,
		viewportWidth,
	});

	if (p.resizeGuide) {
		ctx.strokeStyle = theme.resizeGuide;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(p.resizeGuide.left + 0.5, 0);
		ctx.lineTo(p.resizeGuide.left + 0.5, Math.max(SHEET_HEADER_HEIGHT, p.resizeGuide.height));
		ctx.stroke();
	}

	if (p.rowResizeGuide) {
		ctx.strokeStyle = theme.resizeGuide;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(0, p.rowResizeGuide.top + 0.5);
		ctx.lineTo(Math.max(SHEET_ROW_NUMBER_WIDTH, p.rowResizeGuide.width), p.rowResizeGuide.top + 0.5);
		ctx.stroke();
	}
}

/*
 * Render the pure canvas Sheet surface and overlay slot.
 */
export const SheetCanvasSurface = memo((p: SheetCanvasSurfaceProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;

		if (!canvas) {
			return;
		}

		drawSheetCanvasSurface(canvas, p);
	});

	return <div
		className={cn('v_stretch h_f w_f rel bg', p.className)}
		style={p.style}
	>
		{p.headerContent
			? <div
				className='no_shrink bd_b_1 bd_lt'
				data-sheet-header-content='true'
			>
				{p.headerContent}
			</div>
			: null}

		<div
			ref={p.scrollRef}
			className='sheet_ui_scroll app_scr of_x f w_f rel bg_fade ft_xs'
			data-sheet-scroll-viewport='true'
			onContextMenu={p.onContextMenu}
			onDoubleClick={p.onDoubleClick}
			onBlur={p.onFocusOut}
			onInput={p.onInput}
			onPointerDown={p.onPointerDown}
			style={{
				overflowAnchor: 'none',
			}}
		>
			<div
				className='sticky top_0 left_0 noclick'
				data-sheet-canvas-viewport='true'
				style={{
					height: 0,
					pointerEvents: 'none',
					position: 'sticky',
					left: 0,
					top: 0,
					width: 0,
					zIndex: 1,
				}}
			>
				<canvas
					ref={canvasRef}
					className='bl noclick'
					data-sheet-canvas='true'
					style={{
						pointerEvents: 'none',
					}}
				/>
			</div>
			<div
				className='sheet_ui_canvas rel bg_fade'
				data-cell-count={p.rowMetrics.length * p.columns.length}
				style={{
					height: p.canvasHeight,
					width: p.canvasWidth,
				}}
			/>
			{p.overlayContent}
		</div>
	</div>;
}, (prev, next) => (
	prev.canvasHeight === next.canvasHeight &&
	prev.canvasWidth === next.canvasWidth &&
	prev.cellLookup === next.cellLookup &&
	prev.className === next.className &&
	prev.columns === next.columns &&
	prev.editState?.cellKey === next.editState?.cellKey &&
	prev.editState?.rowId === next.editState?.rowId &&
	prev.editState?.draftValue === next.editState?.draftValue &&
	prev.headerContent === next.headerContent &&
	sheetCanvasHeaderSelectionsAreEqual(prev.headerSelection, next.headerSelection) &&
	prev.onContextMenu === next.onContextMenu &&
	prev.onDoubleClick === next.onDoubleClick &&
	prev.onFocusOut === next.onFocusOut &&
	prev.onInput === next.onInput &&
	prev.onPointerDown === next.onPointerDown &&
	prev.overlayContent === next.overlayContent &&
	prev.resizeGuide?.columnKey === next.resizeGuide?.columnKey &&
	prev.resizeGuide?.height === next.resizeGuide?.height &&
	prev.resizeGuide?.left === next.resizeGuide?.left &&
	prev.rowMetrics === next.rowMetrics &&
	prev.rowResizeGuide?.rowKey === next.rowResizeGuide?.rowKey &&
	prev.rowResizeGuide?.top === next.rowResizeGuide?.top &&
	prev.rowResizeGuide?.width === next.rowResizeGuide?.width &&
	prev.scrollLeft === next.scrollLeft &&
	prev.scrollRef === next.scrollRef &&
	prev.scrollTop === next.scrollTop &&
	prev.selectedCellKeyMap === next.selectedCellKeyMap &&
	prev.selectedCellState?.cellKey === next.selectedCellState?.cellKey &&
	prev.selectedCellState?.rowId === next.selectedCellState?.rowId &&
	prev.stickyColumnCount === next.stickyColumnCount &&
	prev.stickyRowCount === next.stickyRowCount &&
	prev.style === next.style &&
	prev.viewportHeight === next.viewportHeight &&
	prev.viewportWidth === next.viewportWidth
));

SheetCanvasSurface.displayName = 'SheetCanvasSurface';

export default SheetCanvasSurface;
