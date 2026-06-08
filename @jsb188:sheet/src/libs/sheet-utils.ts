import { normalizeSheetDesign, mergeSheetJSONObjects, getSheetColumnDesignKey, getSheetRowDesignKey, isSheetCellInRange } from '@jsb188/mday/utils/sheet.ts';
import { SHEET_DEFAULT_COLUMN_COUNT } from '@jsb188/mday/constants/sheet.ts';
import type {
	SheetAxisDesignObj,
	SheetCellGQL,
	SheetDesignGQL,
	SheetDesignObj,
	SheetGridPageInfoGQL,
	SheetGridViewportObj,
	SheetRangeGQL,
} from '@jsb188/mday/types/sheet.d.ts';
import {
	clampSheetColumnWidth,
	clampSheetRowHeight,
	getSheetMinimumRowCount,
	SHEET_COLUMN_WIDTH,
	SHEET_ROW_HEIGHT,
	type SheetColumnWidths,
	type SheetRowHeights,
	type SheetUIColumn,
} from '@jsb188/react-web/ui/SheetUI';
import type { DataTableCellDisplayModel } from './dataTable-cell-editing.tsx';

export const SHEET_CANVAS_INITIAL_ROW_COUNT = 200;
export const SHEET_CANVAS_MAX_ROW_COUNT = 1000;
export const SHEET_CANVAS_FETCH_ROW_COUNT = 250;
export const SHEET_CANVAS_FETCH_BUFFER_ROWS = 25;
export const SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT = 700;
export const SHEET_CANVAS_DEFAULT_VIEWPORT_WIDTH = 1000;
export const SHEET_CANVAS_ROW_BUFFER_SCREEN_RATIO = 0.7;
export const SHEET_CANVAS_COLUMN_BUFFER_SCREEN_RATIO = 1;

export type SheetCanvasColumn = SheetUIColumn & {
	sheetColumnIndex: number;
};

export type SheetCanvasCellStyle = {
	backgroundColor?: string | null;
	color?: string | null;
	fillColor?: string | null;
	textColor?: string | null;
};

export type SheetCanvasCell = {
	cell?: SheetCellGQL | null;
	cellKey: string;
	columnIndex: number;
	dataTableDisplay?: DataTableCellDisplayModel | null;
	displayValue: string;
	draftValue: string;
	formulaLoading: boolean;
	rowId: string;
	rowIndex: number;
	style: SheetCanvasCellStyle;
};

export type SheetLoadedGridState = {
	cellsByCoord: Map<string, SheetCellGQL>;
	hasMoreRows: boolean;
	lastContentRowIndex: number | null;
	loadedRowCount: number;
};

/*
 * Return parsed JSON object data from either GraphQL strings or already-parsed objects.
 */
export function parseSheetJSONObject<T extends Record<string, any>>(value: unknown, fallback: T): T {
	if (value === null || value === undefined || value === '') {
		return fallback;
	}

	if (typeof value === 'object' && !Array.isArray(value)) {
		return value as T;
	}

	if (typeof value !== 'string') {
		return fallback;
	}

	try {
		const parsed = JSON.parse(value);

		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : fallback;
	} catch {
		return fallback;
	}
}

/*
 * Return one GraphQL sheet design as a normalized domain design object.
 */
export function getSheetCanvasDesign(design?: SheetDesignGQL | null): SheetDesignObj {
	const grid = design?.grid
		? {
			columnCount: Math.max(1, Math.floor(Number(design.grid.columnCount || SHEET_DEFAULT_COLUMN_COUNT))),
			frozenColumns: Math.max(0, Math.floor(Number(design.grid.frozenColumns || 0))),
			frozenRows: Math.max(0, Math.floor(Number(design.grid.frozenRows || 0))),
			rowCount: Math.max(1, Math.floor(Number(design.grid.rowCount || SHEET_CANVAS_MAX_ROW_COUNT))),
		}
		: undefined;
	const normalized = normalizeSheetDesign({
		defaultCellFormat: parseSheetJSONObject(design?.defaultCellFormat, {}),
		defaultCellStyle: parseSheetJSONObject(design?.defaultCellStyle, {}),
		grid,
		metadata: parseSheetJSONObject(design?.metadata, {}),
		namedRanges: design?.namedRanges || [],
		rows: parseSheetJSONObject(design?.rows, {}),
		columns: parseSheetJSONObject(design?.columns, {}),
		version: Number(design?.version || 1),
	});

	return {
		...normalized,
		grid: {
			...normalized.grid,
			rowCount: Math.min(SHEET_CANVAS_MAX_ROW_COUNT, Math.max(1, normalized.grid.rowCount || SHEET_CANVAS_MAX_ROW_COUNT)),
		},
	};
}

/*
 * Return spreadsheet-style column label text for a one-based column index.
 */
export function getSheetCanvasColumnLabel(columnIndex: number) {
	let index = Math.max(1, Math.floor(columnIndex));
	let label = '';

	while (index > 0) {
		const remainder = (index - 1) % 26;
		label = String.fromCharCode(65 + remainder) + label;
		index = Math.floor((index - 1) / 26);
	}

	return label;
}

/*
 * Return the column design saved for one one-based sheet column.
 */
export function getSheetCanvasColumnDesign(design: SheetDesignObj, columnIndex: number): SheetAxisDesignObj {
	return design.columns?.[getSheetColumnDesignKey(columnIndex)] || {};
}

/*
 * Return the row design saved for one one-based sheet row.
 */
export function getSheetCanvasRowDesign(design: SheetDesignObj, rowIndex: number): SheetAxisDesignObj {
	return design.rows?.[getSheetRowDesignKey(rowIndex)] || {};
}

/*
 * Return canvas-ready columns with a preserved one-based sheet column index.
 */
export function getSheetCanvasColumns(design: SheetDesignObj): SheetCanvasColumn[] {
	const columns: SheetCanvasColumn[] = [];

	for (let columnIndex = 1; columnIndex <= design.grid.columnCount; columnIndex += 1) {
		const columnDesign = getSheetCanvasColumnDesign(design, columnIndex);

		if (columnDesign.hidden) {
			continue;
		}

		columns.push({
			fieldType: 'TEXT',
			id: String(columnIndex),
			key: String(columnIndex),
			label: String(columnDesign.metadata?.label || getSheetCanvasColumnLabel(columnIndex)),
			sheetColumnIndex: columnIndex,
		});
	}

	return columns;
}

/*
 * Return saved column widths keyed by the canvas column identity.
 */
export function getSheetCanvasColumnWidths(design: SheetDesignObj): SheetColumnWidths {
	const widths: SheetColumnWidths = {};

	for (let columnIndex = 1; columnIndex <= design.grid.columnCount; columnIndex += 1) {
		const columnDesign = getSheetCanvasColumnDesign(design, columnIndex);

		if (columnDesign.width) {
			widths[String(columnIndex)] = clampSheetColumnWidth(columnDesign.width);
		}
	}

	return widths;
}

/*
 * Return visible row keys for the current canvas row window.
 */
export function getSheetCanvasRowKeys(rowCount: number) {
	const rowKeys: string[] = [];

	for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
		rowKeys.push(String(rowIndex));
	}

	return rowKeys;
}

/*
 * Return saved row heights keyed by the one-based row id.
 */
export function getSheetCanvasRowHeights(design: SheetDesignObj, rowCount: number): SheetRowHeights {
	const heights: SheetRowHeights = {};

	for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
		const rowDesign = getSheetCanvasRowDesign(design, rowIndex);

		if (rowDesign.height) {
			heights[String(rowIndex)] = clampSheetRowHeight(rowDesign.height);
		}
	}

	return heights;
}

/*
 * Return a stable coordinate key for one one-based sheet cell.
 */
export function getSheetCanvasCoordKey(rowIndex: number, columnIndex: number) {
	return `${rowIndex}:${columnIndex}`;
}

/*
 * Return the one-based row index encoded in a canvas row id.
 */
export function getSheetCanvasRowIndexFromId(rowId?: string | null) {
	const rowIndex = Math.floor(Number(rowId || 0));

	return Number.isFinite(rowIndex) && rowIndex > 0 ? rowIndex : null;
}

/*
 * Return the one-based column index encoded in a canvas cell key.
 */
export function getSheetCanvasColumnIndexFromKey(cellKey?: string | null) {
	const columnIndex = Math.floor(Number(cellKey || 0));

	return Number.isFinite(columnIndex) && columnIndex > 0 ? columnIndex : null;
}

/*
 * Return true when a parsed style object contains visible formatting.
 */
export function sheetCanvasStyleHasContent(style?: SheetCanvasCellStyle | null) {
	return Boolean(style?.backgroundColor || style?.fillColor || style?.color || style?.textColor);
}

/*
 * Return the display color saved for one style property.
 */
export function getSheetCanvasStyleColor(style: SheetCanvasCellStyle, names: string[]) {
	for (const name of names) {
		const value = style[name as keyof SheetCanvasCellStyle];

		if (typeof value === 'string' && value.trim()) {
			return value;
		}
	}

	return null;
}

/*
 * Return the ranges that apply to one one-based sheet coordinate.
 */
export function getSheetCanvasMatchingRanges(
	ranges: SheetRangeGQL[],
	rowIndex: number,
	columnIndex: number,
) {
	return ranges.filter((range) => {
		return isSheetCellInRange(rowIndex, columnIndex, {
			endColumnIndex: Number(range.endColumnIndex || 0),
			endRowIndex: Number(range.endRowIndex || 0),
			startColumnIndex: Number(range.startColumnIndex || 0),
			startRowIndex: Number(range.startRowIndex || 0),
		});
	});
}

/*
 * Return the merged presentation style for one sparse or empty sheet cell.
 */
export function getSheetCanvasResolvedStyle(params: {
	cell?: SheetCellGQL | null;
	columnIndex: number;
	design: SheetDesignObj;
	ranges: SheetRangeGQL[];
	rowIndex: number;
}) {
	const rowDesign = getSheetCanvasRowDesign(params.design, params.rowIndex);
	const columnDesign = getSheetCanvasColumnDesign(params.design, params.columnIndex);
	const matchingRanges = getSheetCanvasMatchingRanges(params.ranges, params.rowIndex, params.columnIndex);

	return mergeSheetJSONObjects(
		params.design.defaultCellStyle,
		columnDesign.style,
		rowDesign.style,
		...matchingRanges.map((range) => parseSheetJSONObject(range.style, {})),
		parseSheetJSONObject(params.cell?.style, {}),
	) as SheetCanvasCellStyle;
}

/*
 * Return whether one empty coordinate should still be treated as a formatted cell.
 */
export function isSheetCanvasFormattedEmptyCell(params: {
	cell?: SheetCellGQL | null;
	columnIndex: number;
	design: SheetDesignObj;
	ranges: SheetRangeGQL[];
	rowIndex: number;
}) {
	return sheetCanvasStyleHasContent(getSheetCanvasResolvedStyle(params));
}

/*
 * Return a user-facing display string for a sparse sheet cell.
 */
export function getSheetCanvasCellDisplayValue(cell?: SheetCellGQL | null) {
	if (!cell) {
		return '';
	}

	if (!cell.formula && cell.rawInput !== null && cell.rawInput !== undefined) {
		return String(cell.rawInput);
	}

	if (cell.textValue !== null && cell.textValue !== undefined) {
		return String(cell.textValue);
	}

	if (cell.numberValue !== null && cell.numberValue !== undefined) {
		return String(cell.numberValue);
	}

	if (cell.booleanValue !== null && cell.booleanValue !== undefined) {
		return cell.booleanValue ? 'TRUE' : 'FALSE';
	}

	if (cell.dateValue) {
		return String(cell.dateValue);
	}

	if (cell.datetimeValue) {
		return String(cell.datetimeValue);
	}

	if (cell.value !== null && cell.value !== undefined) {
		return typeof cell.value === 'string' ? cell.value : JSON.stringify(cell.value);
	}

	return '';
}

/*
 * Return the editable draft string for one sheet cell.
 */
export function getSheetCanvasCellDraftValue(cell?: SheetCellGQL | null) {
	if (cell?.formula?.text) {
		return cell.formula.text;
	}

	return getSheetCanvasCellDisplayValue(cell);
}

/*
 * Return a canvas-ready cell object for one coordinate.
 */
export function getSheetCanvasCell(params: {
	cell?: SheetCellGQL | null;
	cellKey: string;
	columnIndex: number;
	design: SheetDesignObj;
	ranges: SheetRangeGQL[];
	rowId: string;
	rowIndex: number;
}): SheetCanvasCell {
	return {
		cell: params.cell || null,
		cellKey: params.cellKey,
		columnIndex: params.columnIndex,
		displayValue: getSheetCanvasCellDisplayValue(params.cell),
		draftValue: getSheetCanvasCellDraftValue(params.cell),
		formulaLoading: Boolean((params.cell as SheetCellGQL & { __formulaLoading?: boolean } | null | undefined)?.__formulaLoading),
		rowId: params.rowId,
		rowIndex: params.rowIndex,
		style: getSheetCanvasResolvedStyle(params),
	};
}

/*
 * Return a cell lookup map with sparse cells keyed by one-based row and column coordinates.
 */
export function getSheetCanvasCellsByCoord(cells?: SheetCellGQL[] | null) {
	const cellsByCoord = new Map<string, SheetCellGQL>();

	(cells || []).forEach((cell) => {
		const rowIndex = Number(cell.rowIndex || 0);
		const columnIndex = Number(cell.columnIndex || 0);

		if (rowIndex > 0 && columnIndex > 0) {
			cellsByCoord.set(getSheetCanvasCoordKey(rowIndex, columnIndex), cell);
		}
	});

	return cellsByCoord;
}

/*
 * Merge newly fetched sparse sheet cells into the current coordinate map.
 */
export function mergeSheetCanvasCellsByCoord(current: Map<string, SheetCellGQL>, nextCells?: SheetCellGQL[] | null) {
	let changed = false;
	const next = new Map(current);

	(nextCells || []).forEach((cell) => {
		const rowIndex = Number(cell.rowIndex || 0);
		const columnIndex = Number(cell.columnIndex || 0);

		if (rowIndex > 0 && columnIndex > 0) {
			const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);

			if (current.get(coordKey) !== cell) {
				changed = true;
				next.set(coordKey, cell);
			}
		}
	});

	return changed ? next : current;
}

/*
 * Replace cached cells inside one fetched viewport while preserving cached cells outside it.
 */
export function replaceSheetCanvasCellsInViewport(
	current: Map<string, SheetCellGQL>,
	nextCells: SheetCellGQL[] | null | undefined,
	viewport: Partial<SheetGridViewportObj> | null | undefined,
) {
	if (!viewport) {
		return mergeSheetCanvasCellsByCoord(current, nextCells);
	}

	const startRowIndex = Math.max(1, Number(viewport.startRowIndex || 1));
	const startColumnIndex = Math.max(1, Number(viewport.startColumnIndex || 1));
	const endRowIndex = startRowIndex + Math.max(1, Number(viewport.rowCount || 1)) - 1;
	const endColumnIndex = startColumnIndex + Math.max(1, Number(viewport.columnCount || 1)) - 1;
	const next = new Map<string, SheetCellGQL>();

	current.forEach((cell, coordKey) => {
		const [rowIndexString, columnIndexString] = coordKey.split(':');
		const rowIndex = Number(rowIndexString || 0);
		const columnIndex = Number(columnIndexString || 0);
		const isInsideViewport = rowIndex >= startRowIndex &&
			rowIndex <= endRowIndex &&
			columnIndex >= startColumnIndex &&
			columnIndex <= endColumnIndex;

		if (isInsideViewport) {
			return;
		}

		next.set(coordKey, cell);
	});

	(nextCells || []).forEach((cell) => {
		const rowIndex = Number(cell.rowIndex || 0);
		const columnIndex = Number(cell.columnIndex || 0);

		if (rowIndex > 0 && columnIndex > 0) {
			const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);

			next.set(coordKey, cell);
		}
	});

	if (next.size === current.size) {
		let changed = false;

		next.forEach((cell, coordKey) => {
			if (current.get(coordKey) !== cell) {
				changed = true;
			}
		});

		if (!changed) {
			return current;
		}
	}

	return next;
}

/*
 * Return the number of body rows that should be requested for the initial viewport.
 */
export function getSheetCanvasInitialRowCount(containerHeight: number, designRowCount: number) {
	const visibleRows = getSheetMinimumRowCount(containerHeight || SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT);

	return Math.min(
		designRowCount,
		Math.max(SHEET_CANVAS_INITIAL_ROW_COUNT, visibleRows),
	);
}

/*
 * Return a loaded row count from GraphQL rows and pageInfo without scrolling past the real loaded window.
 */
export function getSheetCanvasLoadedRowCount(params: {
	currentLoadedRowCount: number;
	pageInfo?: SheetGridPageInfoGQL | null;
	requestedRowCount: number;
	returnedRowCount: number;
}) {
	const fallbackLoadedRowCount = Math.max(
		SHEET_CANVAS_INITIAL_ROW_COUNT,
		params.currentLoadedRowCount,
		params.requestedRowCount,
		params.returnedRowCount,
	);

	if (!params.pageInfo || params.pageInfo.hasMoreRows) {
		return fallbackLoadedRowCount;
	}

	return Math.max(
		SHEET_CANVAS_INITIAL_ROW_COUNT,
		params.currentLoadedRowCount,
		Number(params.pageInfo.lastContentRowIndex || 0),
	);
}

/*
 * Return the row buffer count as a percentage of currently visible rows.
 */
export function getSheetCanvasRowBufferCount(viewportHeight: number) {
	const visibleRows = Math.max(1, Math.ceil(Math.max(0, viewportHeight) / SHEET_ROW_HEIGHT));

	return Math.ceil(visibleRows * SHEET_CANVAS_ROW_BUFFER_SCREEN_RATIO);
}

/*
 * Return the column buffer count as a percentage of currently visible columns.
 */
export function getSheetCanvasColumnBufferCount(viewportWidth: number) {
	const visibleColumns = Math.max(1, Math.ceil(Math.max(0, viewportWidth) / SHEET_COLUMN_WIDTH));

	return Math.ceil(visibleColumns * SHEET_CANVAS_COLUMN_BUFFER_SCREEN_RATIO);
}

/*
 * Return the bounded page size for the next sheetGrid row fetch.
 */
export function getSheetCanvasFetchRowCount(loadedRowCount: number, designRowCount: number) {
	return Math.max(0, Math.min(SHEET_CANVAS_FETCH_ROW_COUNT, designRowCount - loadedRowCount));
}

/*
 * Return the viewport object for a sheetGrid query.
 */
export function getSheetCanvasGridViewport(params: {
	columnCount: number;
	rowCount: number;
	startColumnIndex?: number;
	startRowIndex?: number;
}): SheetGridViewportObj {
	return {
		columnCount: Math.max(1, params.columnCount),
		rowCount: Math.max(1, params.rowCount),
		startColumnIndex: Math.max(1, params.startColumnIndex || 1),
		startRowIndex: Math.max(1, params.startRowIndex || 1),
	};
}
