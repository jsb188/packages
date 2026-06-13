import { evaluateSheetDisplayRules, normalizeSheetCellFormat, normalizeSheetCellStyle, normalizeSheetDesign, mergeSheetCellFormats, mergeSheetJSONObjects, getSheetColumnDesignKey, getSheetRowDesignKey, isSheetCellInRange, isSheetGeneratedRegionSource } from '@jsb188/mday/utils/sheet.ts';
import { SHEET_DATA_TABLE_REGION_MAX_ROWS, SHEET_DEFAULT_COLUMN_COUNT } from '@jsb188/mday/constants/sheet.ts';
import type {
	SheetAxisDesignObj,
	SheetCellFormatObj,
	SheetCellGQL,
	SheetCellStyleObj,
	SheetDesignGQL,
	SheetDesignObj,
	SheetGridPageInfoGQL,
	SheetGridViewportObj,
	SheetRangeGQL,
	SheetRegionGQL,
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
import { parseLabelMarkdownText } from '@jsb188/react-web/utils/markdown';
import { DateTime } from 'luxon';
import type { DataTableCellDisplayModel } from './dataTable-cell-editing.tsx';

export const SHEET_CANVAS_INITIAL_ROW_COUNT = 200;
export const SHEET_CANVAS_MAX_ROW_COUNT = 1000;
export const SHEET_CANVAS_DEFAULT_VIEWPORT_HEIGHT = 700;
export const SHEET_CANVAS_DEFAULT_VIEWPORT_WIDTH = 1000;
export const SHEET_CANVAS_ROW_BUFFER_SCREEN_RATIO = 0.7;
export const SHEET_CANVAS_COLUMN_BUFFER_SCREEN_RATIO = 1;

export type SheetCanvasColumn = SheetUIColumn & {
	sheetColumnIndex: number;
};

export type SheetCanvasCellStyle = SheetCellStyleObj;

export type SheetRegionGridRect = {
	endColumnIndex: number;
	endRowIndex: number;
	startColumnIndex: number;
	startRowIndex: number;
};

export type SheetCanvasCell = {
	cell?: SheetCellGQL | null;
	cellKey: string;
	columnIndex: number;
	dataTableDisplay?: DataTableCellDisplayModel | null;
	displayValue: string;
	draftValue: string;
	format: SheetCellFormatObj;
	formulaLoading: boolean;
	rowId: string;
	rowIndex: number;
	style: SheetCanvasCellStyle;
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
		defaultCellStyle: normalizeSheetCellStyle(design?.defaultCellStyle),
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
 * Return the one-based grid rectangle one Sheet region covers, or null when
 * the region definition is incomplete.
 */
export function getSheetRegionGridRect(region?: SheetRegionGQL | null) {
	const startRowIndex = Math.floor(Number(region?.startRowIndex || 0));
	const startColumnIndex = Math.floor(Number(region?.startColumnIndex || 0));
	const columnCount = region?.columns?.length || 0;
	if (!region || !startRowIndex || !startColumnIndex || !columnCount) {
		return null;
	}

	const configuredEndRowIndex = Math.floor(Number(region.options?.endRowIndex || 0));

	return {
		startRowIndex,
		startColumnIndex,
		endRowIndex: configuredEndRowIndex >= startRowIndex
			? configuredEndRowIndex
			: startRowIndex + SHEET_DATA_TABLE_REGION_MAX_ROWS - 1,
		endColumnIndex: startColumnIndex + columnCount - 1,
	} satisfies SheetRegionGridRect;
}

/*
 * Return whether one materialized cell contributes to a rendered region footprint.
 */
function isSheetRenderedRegionCell(cell: SheetCellGQL) {
	if (cell.sourceType === 'REGION_GENERATED') {
		return true;
	}

	return Boolean(
		cell.sourceType === 'REGION_OVERRIDE' &&
			(cell.region?.sourceRowId || cell.region?.sourceCellKey || cell.sourceDataTableRowId || cell.sourceCellKey)
	);
}

/*
 * Return one generated region's stable grid frame without row-count assumptions.
 */
function getSheetRenderedRegionFrame(region: SheetRegionGQL) {
	const startRowIndex = Math.floor(Number(region.startRowIndex || 0));
	const startColumnIndex = Math.floor(Number(region.startColumnIndex || 0));
	const columnCount = region.columns?.length || 0;
	if (!startRowIndex || !startColumnIndex || !columnCount) {
		return null;
	}

	return {
		endColumnIndex: startColumnIndex + columnCount - 1,
		startColumnIndex,
		startRowIndex,
	};
}

/*
 * Return the configured row cap for one generated region when users set a limit.
 */
function getSheetRenderedRegionConfiguredEndRowIndex(region: SheetRegionGQL) {
	const startRowIndex = Math.floor(Number(region.startRowIndex || 0));
	const endRowIndex = Math.floor(Number(region.options?.endRowIndex || 0));

	return startRowIndex && endRowIndex >= startRowIndex ? endRowIndex : null;
}

/*
 * Return the exact rendered end row implied by a source include list.
 */
function getSheetRenderedRegionIncludedEndRowIndex(region: SheetRegionGQL) {
	const startRowIndex = Math.floor(Number(region.startRowIndex || 0));
	const includeRowCount = Array.isArray(region.source?.includeRowIds)
		? region.source.includeRowIds.filter((rowId) => rowId !== null && rowId !== undefined && String(rowId)).length
		: 0;
	if (!startRowIndex || !includeRowCount) {
		return null;
	}

	const dataStartRowIndex = startRowIndex + (region.options?.includeHeaderRow ? 1 : 0);
	const headerEndRowIndex = region.options?.includeHeaderRow ? startRowIndex : 0;
	const sourceEndRowIndex = dataStartRowIndex + includeRowCount - 1;

	return Math.max(headerEndRowIndex, sourceEndRowIndex);
}

/*
 * Return rendered generated-region bounds keyed by region id from materialized cells.
 */
export function getSheetRenderedRegionBoundsById(
	cellsByCoord: Map<string, SheetCellGQL>,
	regions?: SheetRegionGQL[] | null,
) {
	const regionsById = new Map(
		(regions || [])
			.filter((region) => (
				region?.id &&
				region.type === 'DATA_TABLE' &&
				isSheetGeneratedRegionSource(region.source) &&
				region.columns?.length
			))
			.map((region) => [String(region.id), region]),
	);
	const boundsById = new Map<string, SheetRegionGridRect>();
	const materializedEndRowIndexById = new Map<string, number>();

	cellsByCoord.forEach((cell) => {
		const regionId = String(cell.region?.regionId || cell.regionId || '');
		const region = regionsById.get(regionId);
		const rowIndex = Math.floor(Number(cell.rowIndex || 0));

		if (!region || !rowIndex || !isSheetRenderedRegionCell(cell)) {
			return;
		}

		materializedEndRowIndexById.set(
			regionId,
			Math.max(materializedEndRowIndexById.get(regionId) || 0, rowIndex),
		);
	});

	regionsById.forEach((region, regionId) => {
		const frame = getSheetRenderedRegionFrame(region);
		if (!frame) {
			return;
		}

		const configuredEndRowIndex = getSheetRenderedRegionConfiguredEndRowIndex(region);
		const includedEndRowIndex = getSheetRenderedRegionIncludedEndRowIndex(region);
		const materializedEndRowIndex = materializedEndRowIndexById.get(regionId) || 0;
		let endRowIndex = includedEndRowIndex || materializedEndRowIndex || configuredEndRowIndex || 0;
		if (configuredEndRowIndex) {
			endRowIndex = Math.min(endRowIndex, configuredEndRowIndex);
		}

		if (endRowIndex >= frame.startRowIndex) {
			boundsById.set(regionId, {
				...frame,
				endRowIndex,
			});
		}
	});

	return boundsById;
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
	return Boolean(
		style?.fontSize ||
		style?.fillColor ||
		style?.textColor ||
		style?.disableMarkdown !== undefined ||
		style?.bold !== undefined ||
		style?.italic !== undefined ||
		style?.underline !== undefined ||
		style?.strikethrough !== undefined ||
		style?.borderTopWidth ||
		style?.borderRightWidth ||
		style?.borderBottomWidth ||
		style?.borderLeftWidth,
	);
}

/*
 * Return the display color saved for one style property.
 */
export function getSheetCanvasStyleColor(style: SheetCanvasCellStyle, name: keyof Pick<SheetCanvasCellStyle, 'fillColor' | 'textColor'>) {
	const value = style[name];

	if (typeof value === 'string' && value.trim()) {
		return value;
	}

	return null;
}

/*
 * Return the positive font size saved on a resolved Sheet style object.
 */
export function getSheetCanvasStyleFontSize(style?: SheetCanvasCellStyle | null) {
	const fontSize = Number(style?.fontSize);

	return Number.isFinite(fontSize) && fontSize > 0 ? fontSize : null;
}

/*
 * Return whether one cell value can use spreadsheet-style horizontal overflow.
 */
export function canSheetCanvasCellTextOverflow(cell?: SheetCanvasCell | null) {
	const text = cell?.displayValue || '';

	if (!text || cell?.dataTableDisplay || /\r?\n/.test(text)) {
		return false;
	}

	if (cell?.style?.disableMarkdown === true) {
		return true;
	}

	const parts = parseLabelMarkdownText(text);
	const onlyPart = parts[0];

	return parts.length === 1 &&
		onlyPart?.text === text &&
		!onlyPart.italic &&
		!onlyPart.medium &&
		!onlyPart.semibold &&
		!onlyPart.strikethrough &&
		!onlyPart.underline;
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
		normalizeSheetCellStyle(params.design.defaultCellStyle),
		normalizeSheetCellStyle(columnDesign.style),
		normalizeSheetCellStyle(rowDesign.style),
		...matchingRanges.map((range) => normalizeSheetCellStyle(range.style)),
		normalizeSheetCellStyle(params.cell?.style),
	) as SheetCanvasCellStyle;
}

/*
 * Return the merged presentation format for one sparse or empty sheet cell,
 * following the same cascade order as styles. Display rules merge per
 * value-type key: the most specific layer that defines one CELL_* key wins
 * that key whole.
 */
export function getSheetCanvasResolvedFormat(params: {
	cell?: SheetCellGQL | null;
	columnIndex: number;
	design: SheetDesignObj;
	ranges: SheetRangeGQL[];
	rowIndex: number;
}): SheetCellFormatObj {
	const rowDesign = getSheetCanvasRowDesign(params.design, params.rowIndex);
	const columnDesign = getSheetCanvasColumnDesign(params.design, params.columnIndex);
	const matchingRanges = getSheetCanvasMatchingRanges(params.ranges, params.rowIndex, params.columnIndex);

	return mergeSheetCellFormats(
		normalizeSheetCellFormat(params.design.defaultCellFormat),
		normalizeSheetCellFormat(columnDesign.format),
		normalizeSheetCellFormat(rowDesign.format),
		...matchingRanges.map((range) => normalizeSheetCellFormat(range.format)),
		normalizeSheetCellFormat(params.cell?.format),
	);
}

/*
 * Return whether one empty coordinate should still be treated as a formatted
 * cell. Display rules count as formatting so empty cells covered by line or
 * range rules stay in the canvas lookup and can render their else text.
 */
export function isSheetCanvasFormattedEmptyCell(params: {
	cell?: SheetCellGQL | null;
	columnIndex: number;
	design: SheetDesignObj;
	ranges: SheetRangeGQL[];
	rowIndex: number;
}) {
	return sheetCanvasStyleHasContent(getSheetCanvasResolvedStyle(params)) ||
		Boolean(getSheetCanvasResolvedFormat(params).displayRules);
}

/*
 * Return the raw user-facing display string for a sparse sheet cell, before
 * any display rules rewrite it.
 */
function getSheetCanvasCellRawDisplayValue(cell?: SheetCellGQL | null) {
	if (!cell) {
		return '';
	}

	if (!cell.formula && !cell.formulaText && cell.rawInput !== null && cell.rawInput !== undefined) {
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
 * Return one sparse Sheet date value formatted with the cell's Luxon format
 * string, or null when the cell has no date-like value or format.
 */
function getSheetCanvasCellFormattedDateValue(
	cell: SheetCellGQL | null | undefined,
	rawDisplayValue: string,
	resolvedFormat?: SheetCellFormatObj | null,
) {
	const format = typeof resolvedFormat?.format === 'string' ? resolvedFormat.format : '';
	const value = cell?.dateValue || cell?.datetimeValue || rawDisplayValue;

	if (!format || !value) {
		return null;
	}

	const dateTime = DateTime.fromISO(String(value));
	if (!dateTime.isValid) {
		return null;
	}

	try {
		return dateTime.toFormat(format);
	} catch {
		return null;
	}
}

/*
 * Return a user-facing display string for a sparse sheet cell. A resolved
 * format's display rules can rewrite the rendered text (including else text on
 * empty cells); raw and typed values stay untouched for editing, sorting, and
 * formulas. Callers without a resolved format always get the raw display.
 */
export function getSheetCanvasCellDisplayValue(cell?: SheetCellGQL | null, resolvedFormat?: SheetCellFormatObj | null) {
	const rawDisplayValue = getSheetCanvasCellRawDisplayValue(cell);

	if (resolvedFormat?.displayRules) {
		const ruledValue = evaluateSheetDisplayRules({
			cell,
			displayRules: resolvedFormat.displayRules,
			rawDisplayValue,
		});

		if (ruledValue !== null) {
			return ruledValue;
		}
	}

	const formattedDateValue = getSheetCanvasCellFormattedDateValue(cell, rawDisplayValue, resolvedFormat);
	if (formattedDateValue !== null) {
		return formattedDateValue;
	}

	return rawDisplayValue;
}

/*
 * Return the editable draft string for one sheet cell.
 */
export function getSheetCanvasCellDraftValue(cell?: SheetCellGQL | null) {
	if (cell?.formulaText) {
		return cell.formulaText;
	}

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
	const format = getSheetCanvasResolvedFormat(params);

	return {
		cell: params.cell || null,
		cellKey: params.cellKey,
		columnIndex: params.columnIndex,
		displayValue: getSheetCanvasCellDisplayValue(params.cell, format),
		draftValue: getSheetCanvasCellDraftValue(params.cell),
		format,
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
