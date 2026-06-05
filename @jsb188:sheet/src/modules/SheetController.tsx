import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { SHEET_DATA_TABLE_REGION_MAX_ROWS } from '@jsb188/mday/constants/sheet.ts';
import type {
  DataTableCellGQL,
  DataTableGQL,
  DataTableRowGQL,
} from '@jsb188/mday/types/dataTable.d.ts';
import type {
  SheetCellGQL,
  SheetDesignObj,
  SheetRangeGQL,
  SheetRegionGQL,
} from '@jsb188/mday/types/sheet.d.ts';
import {
  clampSheetColumnWidth,
  clampSheetRowHeight,
  getSheetCellKey,
  getSheetColumnIndexAtOffset,
  getSheetColumnMetrics,
  getSheetRowIndexAtOffset,
  getSheetRowMetrics,
  getSheetMultiSelectEditorValueSet,
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
  type SheetUIEditorClickSource,
  type SheetUIFieldType,
  type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { copyTextToClipboard } from '@jsb188/react-web/utils/dom';
import { useKeyDown, useOpenModalPopUp } from '@jsb188/react/states';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type FormEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { SheetCanvasSurface } from './SheetCanvasSurface.tsx';
import { SheetColorPicker } from './SheetColorPicker.tsx';
import { SheetEditorOverlay, type SheetEditorOverlayPosition } from './SheetEditorOverlay.tsx';
import { SheetFormulaInput } from './SheetFormulaInput.tsx';
import { useSheetContextMenu, type SheetContextMenuFormat, type SheetContextMenuFormatName, type SheetContextMenuTarget } from '../libs/SheetContextMenu.tsx';
import { parseGridClipboardText } from '../libs/grid-clipboard.ts';
import {
  dismissGridContextMenuOnPointerDown,
} from '../libs/grid-context-menu.ts';
import {
  addGridKeyboardEventListener,
  handleGridKeyboardEvent,
  type GridArrowDirection,
} from '../libs/grid-keyboard.ts';
import {
	getOptimisticSheetCellFromEditInput,
	getSheetCellSnapshotEditInput,
	getSheetClearEditInput,
	getSheetValueEditInput,
	sheetCellEditInputsAreEqual,
	useSheetUndoRedo,
	type SheetCellEditInput,
	type SheetCellHistoryChange,
	type SheetDataTableCellEditTarget,
	type SheetDataTableCellHistoryChange,
	type SheetDesignPatchInput,
	type SheetUndoRedoEntry,
} from '../libs/sheet-history.ts';
import {
  getGridKeyboardElements,
  isGridShortcutBlockedByActiveInput,
  isGridTextInputKey,
  useGridElementSize,
} from '../libs/grid-runtime.ts';
import {
  getSheetCanvasColumnDisplayLeft,
  getSheetCanvasColumnDisplayRight,
  getSheetCanvasRowDisplayBottom,
  getSheetCanvasRowDisplayTop,
} from '../libs/sheet-canvas-geometry.ts';
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
} from '../libs/grid-selection.ts';
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
} from '../libs/sheet-utils.ts';
import {
	type SheetStateAtoms,
} from '../libs/sheet-state.ts';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/Layout';
import { DataTableInboundContactEditor } from './DataTable-InboundContact.tsx';
import {
	DATA_TABLE_DATE_EDITOR_WIDTH,
	DATA_TABLE_INBOUND_CONTACT_EDITOR_MIN_WIDTH,
	DATA_TABLE_LOCAL_EDITOR_WIDTH_OFFSET,
	canEditDataTableRuntimeCell,
	getDataTableCellDisplayModel,
	getDataTableCellSerializedValue,
	getDataTableSheetUIColumn,
	getSheetCellDisplayValue,
	getSheetEditorDraftValue,
	getSheetEditorElementValue as getDataTableEditorElementValue,
	getSheetEditorFieldType,
	hasDataTableCellRelatedId,
	handleDataTableRelatedDocumentCellEdit,
	isDataTableDateEditorFieldType,
	isDataTableInboundContactIdLookup,
	isDataTableLocalEditorFieldType,
	isDataTableReferenceCell,
	isSheetSelectEditorFieldType,
	parseSheetEditorValue,
	type DataTableCellLookup,
	type DataTableLocalEditorPosition,
	type DataTableRuntimeDesignCell,
} from '../libs/dataTable-cell-editing.tsx';
import {
	DataTableDateEditor,
	DataTableLocalEditorContainer,
	DataTableSelectEditor,
} from './DataTableCellEditors.tsx';

export type { SheetCellEditInput, SheetDesignPatchInput } from '../libs/sheet-history.ts';

const SHEET_CANVAS_ROW_RIGHT_PADDING = 64;
const SHEET_CANVAS_COLUMN_RESIZE_HANDLE_WIDTH = 7;
const SHEET_CANVAS_ROW_RESIZE_HANDLE_HEIGHT = 6;
// This must match the .app_scr::-webkit-scrollbar width/height in packages/@jsb188:css/css/layout.css.
const SHEET_CANVAS_APP_SCROLLBAR_SIZE = 19;
const SHEET_CANVAS_TEXT_EDITOR_SELECTOR = '[data-sheet-editor="true"]';
const SHEET_CANVAS_GRID_EDITOR_SELECTOR = '[data-sheet-editor="true"], [data-sheet-select-editor="true"], [data-sheet-date-editor="true"], [data-sheet-inbound-contact-editor="true"]';
const SHEET_COLOR_PICKER_SELECTOR = '[data-sheet-color-picker="true"]';
const SHEET_DEV_PARAM = 'dev';

export type SheetInsertViewTableRequest = {
	boundedRows: boolean;
	maxColumns: number;
	maxRows: number;
	startColumnIndex: number;
	startRowIndex: number;
};

type SheetViewportRequest = {
	columnCount: number;
	startColumnIndex: number;
};

/*
 * Return whether the current browser URL is a local development URL.
 */
function isSheetDevURL() {
	const hostname = globalThis.location?.hostname;

	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/*
 * Return whether the dev-only URL flag should keep Sheet edit mode open across blur and selection changes.
 */
function shouldSheetKeepEditModeFromURL() {
	if (typeof globalThis.location === 'undefined' || !isSheetDevURL()) {
		return false;
	}

	const value = new URLSearchParams(globalThis.location.search).get(SHEET_DEV_PARAM);

	return value === '1' || value === 'true';
}

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
	dataTables?: DataTableGQL[] | null;
	design: SheetDesignObj;
	disabled?: boolean;
	hasMoreRows: boolean;
	loadedRowCount: number;
	onFetchMoreRows: () => Promise<void> | void;
	onPopulateFromDataTable?: (request: SheetInsertViewTableRequest) => void;
	onRemoveDataTableRegion?: (regionId: string) => Promise<unknown> | unknown;
	onSaveDataTableCells: (params: {
		cells: Array<{
			cellKey: string;
			dataTableRowId: string;
			value: string | null;
		}>;
		dataTableId: string;
	}) => Promise<unknown> | unknown;
	onSaveCells: (cells: SheetCellEditInput[]) => Promise<unknown> | unknown;
	onUpdateSheetDesign: (design: SheetDesignPatchInput) => Promise<unknown> | unknown;
	onViewportRequest: (viewport: SheetViewportRequest) => void;
	ranges: SheetRangeGQL[];
	regions?: SheetRegionGQL[] | null;
	setFloatingMessage?: SetFloatingMessage;
	sourceDataTableCells?: DataTableCellGQL[] | null;
	stateAtoms: SheetStateAtoms;
	timeZone?: string | null;
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

type SheetColorPickerState = {
	formatName: SheetContextMenuFormatName;
	target: SheetContextMenuTarget;
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
 * Return DataTables keyed by their GraphQL id.
 */
function getSheetDataTablesById(dataTables?: DataTableGQL[] | null) {
	return new Map((dataTables || [])
		.filter((dataTable) => dataTable?.id)
		.map((dataTable) => [String(dataTable.id), dataTable]));
}

/*
 * Return active Sheet regions keyed by their GraphQL id.
 */
function getSheetRegionsById(regions?: SheetRegionGQL[] | null) {
	return new Map((regions || [])
		.filter((region) => region?.id)
		.map((region) => [String(region.id), region]));
}

/*
 * Return the configured one-based end row for one Sheet DataTable region.
 */
function getSheetDataTableRegionEndRow(region: SheetRegionGQL) {
	const configuredEndRowIndex = Number(region.options?.endRowIndex || 0);
	const startRowIndex = Number(region.startRowIndex || 0);

	if (Number.isFinite(configuredEndRowIndex) && configuredEndRowIndex >= startRowIndex) {
		return configuredEndRowIndex;
	}

	return startRowIndex + SHEET_DATA_TABLE_REGION_MAX_ROWS - 1;
}

/*
 * Return the DataTable-backed Sheet region that owns one grid coordinate.
 */
function getSheetDataTableRegionAtCell(rowIndex: number, columnIndex: number, regions?: SheetRegionGQL[] | null) {
	return (regions || []).find((region) => {
		if (region.type !== 'DATA_TABLE' || !region.source?.dataTableId || !region.columns?.length) {
			return false;
		}

		const startColumnIndex = Number(region.startColumnIndex || 0);
		const endColumnIndex = startColumnIndex + region.columns.length - 1;
		const startRowIndex = Number(region.startRowIndex || 0);
		const endRowIndex = getSheetDataTableRegionEndRow(region);

		return rowIndex >= startRowIndex &&
			rowIndex <= endRowIndex &&
			columnIndex >= startColumnIndex &&
			columnIndex <= endColumnIndex;
	}) || null;
}

/*
 * Return a stable key for a DataTable source cell target.
 */
function getSheetDataTableSourceCellKey(dataTableId: string, dataTableRowId: string, cellKey: string) {
	return `${dataTableId}:${dataTableRowId}:${cellKey}`;
}

/*
 * Return hydrated source DataTable cells keyed by dataTable, row, and cell key.
 */
function getSourceDataTableCellsByTargetKey(cells?: DataTableCellGQL[] | null) {
	return new Map((cells || [])
		.filter((cell) => cell?.dataTableId && cell.dataTableRowId && cell.cellKey)
		.map((cell) => [
			getSheetDataTableSourceCellKey(String(cell.dataTableId), String(cell.dataTableRowId), String(cell.cellKey)),
			cell,
		]));
}

/*
 * Return DataTable design cells indexed by table id and source cell key for Sheet-region lookups.
 */
function getSheetDataTableDesignCellsByTableId(dataTables?: DataTableGQL[] | null) {
	return new Map((dataTables || []).map((dataTable) => {
		return [
			String(dataTable.id || ''),
			new Map((dataTable.design?.cells || []).map((cell) => {
				return [cell.key, cell as DataTableRuntimeDesignCell];
			})),
		];
	}));
}

/*
 * Build a minimal DataTable cell object from one generated Sheet cell.
 */
function getDataTableCellFromGeneratedSheetCell(
	cell: SheetCellGQL,
	dataTableId: string,
	sourceRowId: string,
	sourceCellKey: string,
): DataTableCellGQL {
	return {
		id: cell.id || `sheet:${cell.sheetId}:${cell.rowIndex}:${cell.columnIndex}`,
		dataTableId,
		dataTableRowId: sourceRowId,
		cellKey: sourceCellKey,
		value: cell.value ?? cell.rawInput ?? null,
		textValue: cell.textValue ?? null,
		numberValue: cell.numberValue ?? null,
		booleanValue: cell.booleanValue ?? null,
		dateValue: cell.dateValue ?? null,
		datetimeValue: cell.datetimeValue ?? null,
		relatedTable: null,
		relatedId: null,
		reference: null,
		referenceStatus: null,
		createdAt: cell.createdAt || '',
		updatedAt: cell.updatedAt || '',
	};
}

/*
 * Return the DataTable edit target represented by one Sheet grid coordinate.
 */
function getSheetDataTableCellEditTarget(params: {
	cellKey?: string | null;
	columnIndex?: number | null;
	dataTablesById: Map<string, DataTableGQL>;
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>;
	effectiveCellsByCoord: Map<string, SheetCellGQL>;
	regionsById: Map<string, SheetRegionGQL>;
	rowId?: string | null;
	rowIndex?: number | null;
	sourceCellsByTargetKey: Map<string, DataTableCellGQL>;
}) {
	const rowIndex = params.rowIndex || getSheetCanvasRowIndexFromId(params.rowId);
	const columnIndex = params.columnIndex || getSheetCanvasColumnIndexFromKey(params.cellKey);

	if (!rowIndex || !columnIndex) {
		return null;
	}

	const sheetCell = params.effectiveCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex));
	if (sheetCell?.sourceType !== 'REGION_GENERATED' || !sheetCell.region?.sourceRowId || !sheetCell.region?.sourceCellKey) {
		return null;
	}

	const regionId = String(sheetCell.region.regionId || sheetCell.regionId || '');
	const region = params.regionsById.get(regionId);
	const dataTableId = String(region?.source?.dataTableId || '');
	const dataTable = dataTableId ? params.dataTablesById.get(dataTableId) : null;
	const sourceRowId = String(sheetCell.region.sourceRowId);
	const sourceCellKey = String(sheetCell.region.sourceCellKey);
	const designCell = params.designCellsByDataTableId.get(dataTableId)?.get(sourceCellKey) || null;

	if (!region || !dataTable || !designCell) {
		return null;
	}

	const sourceCell = params.sourceCellsByTargetKey.get(getSheetDataTableSourceCellKey(dataTableId, sourceRowId, sourceCellKey)) ||
		getDataTableCellFromGeneratedSheetCell(sheetCell, dataTableId, sourceRowId, sourceCellKey);
	const row = {
		id: sourceRowId,
		organizationId: dataTable.organizationId || sheetCell.organizationId || '',
		dataTableId,
		cells: [sourceCell],
	} as DataTableRowGQL;

	return {
		cellKey: String(columnIndex),
		columnIndex,
		dataTable,
		lookup: {
			cell: sourceCell,
			designCell,
			row,
		},
		region,
		rowId: String(rowIndex),
		rowIndex,
		sourceCellKey,
		sourceRowId,
	} satisfies SheetDataTableCellEditTarget;
}

/*
 * Return whether a DataTable-backed Sheet cell can enter edit mode.
 */
function canEditSheetDataTableCellTarget(target: SheetDataTableCellEditTarget, disabled?: boolean) {
	if (!target.dataTable.design) {
		return false;
	}

	return Boolean(
		!disabled &&
		canEditDataTableRuntimeCell({
			design: target.dataTable.design,
			designCell: target.lookup.designCell,
			disabled,
		}) &&
		!isDataTableReferenceCell(target.lookup.cell),
	);
}

/*
 * Return whether a DataTable-backed Sheet cell should be blocked from formula-input editing as a related-document cell.
 */
function isSheetDataTableRelatedDocumentFormulaEditBlocked(target: SheetDataTableCellEditTarget) {
	const fieldType = target.lookup.designCell.humanFieldType || target.lookup.designCell.fieldType;

	return fieldType === 'ID' &&
		Boolean(target.lookup.cell?.relatedTable) &&
		hasDataTableCellRelatedId(target.lookup.cell);
}

/*
 * Return whether one Sheet edit target can start direct text editing from the formula input.
 */
function canStartSheetFormulaInputEditTarget(target: SheetDataTableCellEditTarget | null, disabled?: boolean) {
	if (!target) {
		return !disabled;
	}

	const fieldType = getSheetEditorFieldType(target.lookup.designCell);

	return canEditSheetDataTableCellTarget(target, disabled) &&
		!isDataTableLocalEditorFieldType(fieldType) &&
		!isDataTableInboundContactIdLookup(target.lookup) &&
		!isSheetDataTableRelatedDocumentFormulaEditBlocked(target);
}

/*
 * Return a Sheet edit state for a DataTable-backed Sheet cell.
 */
function getSheetDataTableEditState(target: SheetDataTableCellEditTarget, optimisticValue?: string | null, clickSource?: SheetUIEditorClickSource) {
	return {
		cellKey: target.cellKey,
		clickSource,
		draftValue: getSheetEditorDraftValue(target.lookup.cell, target.lookup.designCell, optimisticValue),
		rowId: target.rowId,
	};
}

/*
 * Return the overlay position used by DataTable local editors inside Sheet.
 */
function getSheetDataTableLocalEditorPosition(params: {
	editorPosition: SheetEditorOverlayPosition | null;
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
	columnMetric?: SheetColumnMetric | null;
	rowWidth: number;
	width?: number;
}) {
	if (!params.editorPosition || !params.columnMetric) {
		return null;
	}

	const isStickyLeft = params.columnMetric.columnIndex < params.stickyColumnCount;
	const width = params.width ?? Math.min(Math.max(400, params.editorPosition.width), Math.max(140, params.editorPosition.width));

	return {
		isStickyLeft,
		left: params.scrollLeft + params.editorPosition.left,
		rowWidth: params.rowWidth,
		top: params.scrollTop + params.editorPosition.top + params.editorPosition.height + 1,
		width: width + DATA_TABLE_LOCAL_EDITOR_WIDTH_OFFSET - 2,
	} satisfies DataTableLocalEditorPosition;
}

/*
 * Return the display label for one Sheet color picker format.
 */
function getSheetColorPickerFormatLabel(formatName: SheetContextMenuFormatName) {
	return i18n.t(formatName === 'textColor' ? 'sheet.text_color' : 'sheet.fill_color');
}

/*
 * Return the read-only tag position used by DataTable-backed Sheet cells.
 */
function getSheetDataTableReadOnlyTagPosition(params: {
	columnMetric?: SheetColumnMetric | null;
	rowMetric?: SheetRowMetric | null;
	rowWidth: number;
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
}) {
	if (!params.columnMetric || !params.rowMetric) {
		return null;
	}

	const isStickyLeft = params.columnMetric.columnIndex < params.stickyColumnCount;
	const left = params.scrollLeft + getSheetCanvasColumnDisplayLeft(params.columnMetric, params.scrollLeft, params.stickyColumnCount);
	const top = params.scrollTop + getSheetCanvasRowDisplayTop(params.rowMetric, params.scrollTop) - 22;

	return {
		isStickyLeft,
		left: left + 1,
		rowWidth: params.rowWidth,
		top: top + 1.5,
		width: params.columnMetric.width,
	} satisfies DataTableLocalEditorPosition;
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
 * Return the cursor style for one Sheet pointer hit target.
 */
function getSheetCanvasPointerCursor(hit: SheetCanvasPointerHit, disabled?: boolean) {
	if (disabled) {
		return '';
	}

	if (hit.columnResize) {
		return 'col-resize';
	}

	if (hit.rowResize) {
		return 'row-resize';
	}

	return '';
}

/*
 * Set the page cursor while canvas resizing is driven by window pointer events.
 */
function setSheetCanvasBodyCursor(cursor: string) {
	if (typeof document === 'undefined') {
		return '';
	}

	const previousCursor = document.body.style.cursor;
	document.body.style.cursor = cursor;

	return previousCursor;
}

/*
 * Restore the page cursor after canvas resizing ends.
 */
function restoreSheetCanvasBodyCursor(previousCursor: string) {
	if (typeof document !== 'undefined') {
		document.body.style.cursor = previousCursor;
	}
}

/*
 * Return the cell target used by the Sheet context menu.
 */
function getSheetCanvasContextMenuTarget(params: {
	canPopulateFromDataTable: boolean;
	canRemoveCellsFromDataTable: boolean;
	cell: SheetCanvasHitCell;
	cellLookup: Map<string, SheetCanvasCell>;
	regions?: SheetRegionGQL[] | null;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const renderKey = getSheetCellKey(params.cell.rowId, params.cell.cellKey);
	const targetCell = params.cellLookup.get(renderKey);
	const rowIndex = getSheetCanvasRowIndexFromId(params.cell.rowId);
	const columnIndex = getSheetCanvasColumnIndexFromKey(params.cell.cellKey);
	const dataTableRegion = rowIndex && columnIndex
		? getSheetDataTableRegionAtCell(rowIndex, columnIndex, params.regions)
		: null;
	const selectedCells = params.selectedCellKeyMap && params.selectedCellKeyMap[renderKey]
		? getGridSelectedCellsFromKeyMap(params.selectedCellKeyMap)
		: [{
			cellKey: params.cell.cellKey,
			rowId: params.cell.rowId,
		}];

	return {
		canEdit: true,
		canPopulateFromDataTable: params.canPopulateFromDataTable,
		canRemoveCellsFromDataTable: params.canRemoveCellsFromDataTable,
		cells: selectedCells,
		cellKey: params.cell.cellKey,
		dataTableRegionId: dataTableRegion?.id ? String(dataTableRegion.id) : null,
		displayValue: targetCell?.displayValue || '',
		fillColor: targetCell?.style ? getSheetCanvasStyleColor(targetCell.style, ['backgroundColor', 'fillColor']) : null,
		rowId: params.cell.rowId,
		textColor: targetCell?.style ? getSheetCanvasStyleColor(targetCell.style, ['color', 'textColor']) : null,
	} satisfies SheetContextMenuTarget;
}

/*
 * Return the data table populate request represented by a Sheet context-menu target.
 */
function getSheetInsertViewTableRequest(target: SheetContextMenuTarget, design: SheetDesignObj): SheetInsertViewTableRequest | null {
	let startRowIndex = Number.POSITIVE_INFINITY;
	let startColumnIndex = Number.POSITIVE_INFINITY;
	let endRowIndex = 0;
	let endColumnIndex = 0;

	target.cells.forEach((cell) => {
		const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

		if (!rowIndex || !columnIndex) {
			return;
		}

		startRowIndex = Math.min(startRowIndex, rowIndex);
		startColumnIndex = Math.min(startColumnIndex, columnIndex);
		endRowIndex = Math.max(endRowIndex, rowIndex);
		endColumnIndex = Math.max(endColumnIndex, columnIndex);
	});

	if (!Number.isFinite(startRowIndex) || !Number.isFinite(startColumnIndex)) {
		return null;
	}

	const boundedRows = target.cells.length > 1;
	const maxRows = boundedRows
		? Math.min(SHEET_DATA_TABLE_REGION_MAX_ROWS, endRowIndex - startRowIndex + 1)
		: Math.min(SHEET_DATA_TABLE_REGION_MAX_ROWS, Math.max(1, design.grid.rowCount - startRowIndex + 1));
	const maxColumns = boundedRows
		? endColumnIndex - startColumnIndex + 1
		: Math.max(1, design.grid.columnCount - startColumnIndex + 1);

	if (maxRows < 1 || maxColumns < 1) {
		return null;
	}

	return {
		boundedRows,
		maxColumns,
		maxRows,
		startColumnIndex,
		startRowIndex,
	};
}

/*
 * Render the stateful canvas Sheet controller.
 */
export function SheetController(p: SheetControllerProps) {
	const [keyDown] = useKeyDown();
	const openModalPopUp = useOpenModalPopUp();
	const scrollElement = useGridElementSize<HTMLDivElement>();
	const [scrollState, setScrollState] = useAtom(p.stateAtoms.scrollStateAtom);
	const [selectedCellState, setSelectedCellState] = useAtom(p.stateAtoms.selectedCellStateAtom);
	const [selectedCellKeyMap, setSelectedCellKeyMap] = useAtom(p.stateAtoms.selectedCellKeyMapAtom);
	const [headerSelection, setHeaderSelection] = useAtom(p.stateAtoms.headerSelectionAtom);
	const [editState, setEditState] = useAtom(p.stateAtoms.editStateAtom);
	const [optimisticCellsByCoord, setOptimisticCellsByCoord] = useAtom(p.stateAtoms.optimisticCellsByCoordAtom);
	const [optimisticDataTableValues, setOptimisticDataTableValues] = useState<Record<string, string | null>>({});
	const [localColumnWidths, setLocalColumnWidths] = useAtom(p.stateAtoms.localColumnWidthsAtom);
	const [localRowHeights, setLocalRowHeights] = useAtom(p.stateAtoms.localRowHeightsAtom);
	const [resizeState, setResizeState] = useAtom(p.stateAtoms.resizeStateAtom);
	const [rowResizeState, setRowResizeState] = useAtom(p.stateAtoms.rowResizeStateAtom);
	const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
	const [formulaInputFocused, setFormulaInputFocused] = useState(false);
	const [colorPickerState, setColorPickerState] = useState<SheetColorPickerState | null>(null);
	const dragSelectionRef = useRef<SheetCanvasDragSelectionState | null>(null);
	const colorPickerPointerDownInsideRef = useRef(false);
	const fetchingMoreRef = useRef(false);
	const designRef = useRef(p.design);
	const onUpdateSheetDesignRef = useRef(p.onUpdateSheetDesign);
	const resizeStateRef = useRef<SheetCanvasResizeState | null>(null);
	const rowResizeStateRef = useRef<SheetCanvasRowResizeState | null>(null);
	const viewportRequestRef = useRef<SheetViewportRequest | null>(null);
	const committingEditorRef = useRef(false);
	const {
		pushUndoEntry: pushSheetUndoEntry,
		runApplyingHistory: runApplyingSheetHistory,
		takeRedoEntry: takeSheetRedoEntry,
		takeUndoEntry: takeSheetUndoEntry,
	} = useSheetUndoRedo();
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
	const dataTablesById = useMemo(() => {
		return getSheetDataTablesById(p.dataTables);
	}, [p.dataTables]);
	const designCellsByDataTableId = useMemo(() => {
		return getSheetDataTableDesignCellsByTableId(p.dataTables);
	}, [p.dataTables]);
	const regionsById = useMemo(() => {
		return getSheetRegionsById(p.regions);
	}, [p.regions]);
	const sourceCellsByTargetKey = useMemo(() => {
		return getSourceDataTableCellsByTargetKey(p.sourceDataTableCells);
	}, [p.sourceDataTableCells]);
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

				const dataTableTarget = getSheetDataTableCellEditTarget({
					columnIndex,
					dataTablesById,
					designCellsByDataTableId,
					effectiveCellsByCoord,
					regionsById,
					rowIndex,
					sourceCellsByTargetKey,
				});
				const canvasCell = getSheetCanvasCell({
					cell,
					cellKey: String(columnIndex),
					columnIndex,
					design: p.design,
					ranges: p.ranges,
					rowId: rowMetric.rowKey,
					rowIndex,
				});

				if (dataTableTarget) {
					const optimisticKey = getSheetDataTableSourceCellKey(
						String(dataTableTarget.dataTable.id || ''),
						dataTableTarget.sourceRowId,
						dataTableTarget.sourceCellKey,
					);
					const optimisticValue = optimisticDataTableValues[optimisticKey];
					const dataTableDisplay = getDataTableCellDisplayModel({
						canEdit: canEditSheetDataTableCellTarget(dataTableTarget, p.disabled),
						cell: dataTableTarget.lookup.cell,
						designCell: dataTableTarget.lookup.designCell,
						optimisticValue,
						timeZone: p.timeZone,
					});

					cells.set(getSheetCellKey(rowMetric.rowKey, String(columnIndex)), {
						...canvasCell,
						dataTableDisplay,
						displayValue: dataTableDisplay.text,
						draftValue: dataTableDisplay.draftValue,
					});
					return;
				}

				cells.set(getSheetCellKey(rowMetric.rowKey, String(columnIndex)), canvasCell);
			});
		});

		return cells;
	}, [columnMetricsData.metrics, dataTablesById, designCellsByDataTableId, effectiveCellsByCoord, optimisticDataTableValues, p.design, p.disabled, p.ranges, p.timeZone, regionsById, rowMetricsData.metrics, sourceCellsByTargetKey, visibleRange.columnEnd, visibleRange.columnStart, visibleRange.rowEnd, visibleRange.rowStart]);
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
	const colorPickerEditorPosition = useMemo(() => {
		if (!colorPickerState) {
			return null;
		}

		return getSheetCanvasEditorPosition({
			columnMetricsByKey,
			editState: {
				cellKey: colorPickerState.target.cellKey,
				draftValue: '',
				rowId: colorPickerState.target.rowId,
			},
			rowMetricsByKey,
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyColumnCount,
		});
	}, [colorPickerState, columnMetricsByKey, rowMetricsByKey, scrollState.scrollLeft, scrollState.scrollTop, stickyColumnCount]);
	const activeDataTableEditTarget = useMemo(() => {
		if (!editState) {
			return null;
		}

		return getSheetDataTableCellEditTarget({
			cellKey: editState.cellKey,
			dataTablesById,
			designCellsByDataTableId,
			effectiveCellsByCoord,
			regionsById,
			rowId: editState.rowId,
			sourceCellsByTargetKey,
		});
	}, [dataTablesById, designCellsByDataTableId, editState, effectiveCellsByCoord, regionsById, sourceCellsByTargetKey]);
	const activeDataTableFieldType = activeDataTableEditTarget
		? getSheetEditorFieldType(activeDataTableEditTarget.lookup.designCell) as SheetUIFieldType
		: null;
	const activeDataTableLocalEditorPosition = useMemo(() => {
		if (!activeDataTableEditTarget || !editorPosition || !activeDataTableFieldType) {
			return null;
		}

		if (!isSheetSelectEditorFieldType(activeDataTableFieldType) && !isDataTableDateEditorFieldType(activeDataTableFieldType) && !isDataTableInboundContactIdLookup(activeDataTableEditTarget.lookup)) {
			return null;
		}

		const width = isDataTableDateEditorFieldType(activeDataTableFieldType)
			? DATA_TABLE_DATE_EDITOR_WIDTH
			: isDataTableInboundContactIdLookup(activeDataTableEditTarget.lookup)
				? Math.max(editorPosition.width, DATA_TABLE_INBOUND_CONTACT_EDITOR_MIN_WIDTH)
				: undefined;

		return getSheetDataTableLocalEditorPosition({
			columnMetric: columnMetricsByKey.get(activeDataTableEditTarget.cellKey),
			editorPosition,
			rowWidth: Math.max(totalWidth, viewportWidth),
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyColumnCount,
			width,
		});
	}, [activeDataTableEditTarget, activeDataTableFieldType, columnMetricsByKey, editorPosition, scrollState.scrollLeft, scrollState.scrollTop, stickyColumnCount, totalWidth, viewportWidth]);
	const activeEditorColumn = editState
		? activeDataTableEditTarget
			? {
					...getDataTableSheetUIColumn(activeDataTableEditTarget.lookup.designCell),
					id: editState.cellKey,
					key: editState.cellKey,
				}
			: columnMetricsByKey.get(editState.cellKey)?.column || null
		: null;
	const formulaInputState = useMemo(() => {
		if (editState && activeEditorColumn) {
			return {
				column: activeEditorColumn,
				error: editState.error || null,
				value: editState.draftValue,
			};
		}

		if (!selectedCellState) {
			return {
				column: null,
				error: null,
				value: '',
			};
		}

		const rowIndex = getSheetCanvasRowIndexFromId(selectedCellState.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(selectedCellState.cellKey);
		const column = columnMetricsByKey.get(selectedCellState.cellKey)?.column || null;

		if (!rowIndex || !columnIndex) {
			return {
				column,
				error: null,
				value: '',
			};
		}

		const dataTableTarget = getSheetDataTableCellEditTarget({
			columnIndex,
			dataTablesById,
			designCellsByDataTableId,
			effectiveCellsByCoord,
			regionsById,
			rowIndex,
			sourceCellsByTargetKey,
		});

		if (dataTableTarget) {
			return {
				column: {
					...getDataTableSheetUIColumn(dataTableTarget.lookup.designCell),
					id: selectedCellState.cellKey,
					key: selectedCellState.cellKey,
				},
				error: null,
				value: getSheetEditorDraftValue(dataTableTarget.lookup.cell, dataTableTarget.lookup.designCell),
			};
		}

		const sourceCell = effectiveCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex));

		return {
			column,
			error: null,
			value: getSheetCanvasCellDraftValue(sourceCell),
		};
	}, [activeEditorColumn, columnMetricsByKey, dataTablesById, designCellsByDataTableId, editState, effectiveCellsByCoord, regionsById, selectedCellState, sourceCellsByTargetKey]);
	const formulaInputCanStartEdit = useMemo(() => {
		if (!selectedCellState) {
			return false;
		}

		if (editState) {
			return Boolean(activeEditorColumn && !editState.disableInlineEditor && !activeDataTableLocalEditorPosition);
		}

		const rowIndex = getSheetCanvasRowIndexFromId(selectedCellState.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(selectedCellState.cellKey);

		if (!rowIndex || !columnIndex) {
			return false;
		}

		const dataTableTarget = getSheetDataTableCellEditTarget({
			columnIndex,
			dataTablesById,
			designCellsByDataTableId,
			effectiveCellsByCoord,
			regionsById,
			rowIndex,
			sourceCellsByTargetKey,
		});

		return canStartSheetFormulaInputEditTarget(dataTableTarget, p.disabled);
	}, [activeDataTableLocalEditorPosition, activeEditorColumn, dataTablesById, designCellsByDataTableId, editState, effectiveCellsByCoord, p.disabled, regionsById, selectedCellState, sourceCellsByTargetKey]);
	const formulaInputCanEdit = Boolean(editState && activeEditorColumn && !editState.disableInlineEditor && !activeDataTableLocalEditorPosition);
	const selectedDataTableReadOnlyCellPosition = useMemo(() => {
		if (!selectedCellState || editState) {
			return null;
		}

		const target = getSheetDataTableCellEditTarget({
			cellKey: selectedCellState.cellKey,
			dataTablesById,
			designCellsByDataTableId,
			effectiveCellsByCoord,
			regionsById,
			rowId: selectedCellState.rowId,
			sourceCellsByTargetKey,
		});

		if (!target || canEditSheetDataTableCellTarget(target, p.disabled)) {
			return null;
		}

		return getSheetDataTableReadOnlyTagPosition({
			columnMetric: columnMetricsByKey.get(selectedCellState.cellKey),
			rowMetric: rowMetricsByKey.get(selectedCellState.rowId),
			rowWidth: Math.max(totalWidth, viewportWidth),
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyColumnCount,
		});
	}, [columnMetricsByKey, dataTablesById, designCellsByDataTableId, editState, effectiveCellsByCoord, p.disabled, regionsById, rowMetricsByKey, scrollState.scrollLeft, scrollState.scrollTop, selectedCellState, sourceCellsByTargetKey, stickyColumnCount, totalWidth, viewportWidth]);
	const keepEditModeForDev = useMemo(() => {
		return shouldSheetKeepEditModeFromURL();
	}, []);
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

	/*
	 * Close the active editor for selection changes unless the local dev keep-edit flag is enabled.
	 */
	const closeSheetCellEditorForSelection = useCallback(() => {
		if (!keepEditModeForDev) {
			setEditState(null);
		}
	}, [keepEditModeForDev]);

	const selectSheetCell = useCallback((cell: SheetUISelectedCellState, selectedMap?: SheetUISelectedCellKeyMap | null) => {
		closeSheetCellEditorForSelection();
		setHeaderSelection(null);
		setSelectedCellState(cell);
		setSelectedCellKeyMap(selectedMap || getGridSelectedCellKeyMapFromCells([cell]));
		scrollCellIntoView(cell);
	}, [closeSheetCellEditorForSelection, scrollCellIntoView, setHeaderSelection]);

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

		closeSheetCellEditorForSelection();
		setHeaderSelection(null);
		setSelectedCellState(selection.activeCell);
		setSelectedCellKeyMap(selection.selectedCellKeyMap);
		scrollCellIntoView(targetCell);
	}, [closeSheetCellEditorForSelection, scrollCellIntoView, selectSheetCell, selectedCellState, setHeaderSelection]);

	const openSheetCellEditor = useCallback((cell?: SheetUISelectedCellState | null, initialValue?: string, selectAllOnFocus = true) => {
		const runtime = runtimeRef.current;
		const targetCell = cell || selectedCellState;
		const rowIndex = getSheetCanvasRowIndexFromId(targetCell?.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(targetCell?.cellKey);

		if (!runtime || !targetCell || !rowIndex || !columnIndex || p.disabled) {
			return;
		}

		setSelectedCellState(targetCell);
		setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells([targetCell]));
		setHeaderSelection(null);

		const dataTableTarget = getSheetDataTableCellEditTarget({
			columnIndex,
			dataTablesById,
			designCellsByDataTableId,
			effectiveCellsByCoord: runtime.effectiveCellsByCoord,
			regionsById,
			rowIndex,
			sourceCellsByTargetKey,
		});

		if (dataTableTarget) {
			if (!canEditSheetDataTableCellTarget(dataTableTarget, p.disabled)) {
				setEditState(null);
				scrollCellIntoView(targetCell);
				return;
			}

			if (!isDataTableInboundContactIdLookup(dataTableTarget.lookup) && handleDataTableRelatedDocumentCellEdit(dataTableTarget.lookup, p.setFloatingMessage)) {
				setEditState(null);
				scrollCellIntoView(targetCell);
				return;
			}

			const optimisticKey = getSheetDataTableSourceCellKey(
				String(dataTableTarget.dataTable.id || ''),
				dataTableTarget.sourceRowId,
				dataTableTarget.sourceCellKey,
			);
			const fieldType = getSheetEditorFieldType(dataTableTarget.lookup.designCell);
			const localEditor = isDataTableLocalEditorFieldType(fieldType) || isDataTableInboundContactIdLookup(dataTableTarget.lookup);
			const dataTableEditState = getSheetDataTableEditState(dataTableTarget, optimisticDataTableValues[optimisticKey], 'CELL_BACKGROUND');

			setEditState({
				...dataTableEditState,
				disableInlineEditor: localEditor,
				draftValue: initialValue ?? dataTableEditState.draftValue,
				selectAllOnFocus,
			});
			scrollCellIntoView(targetCell);
			return;
		}

		const sourceCell = runtime.effectiveCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex));
		setEditState({
			cellKey: targetCell.cellKey,
			selectAllOnFocus,
			draftValue: initialValue ?? getSheetCanvasCellDraftValue(sourceCell),
			rowId: targetCell.rowId,
		});
		scrollCellIntoView(targetCell);
	}, [dataTablesById, designCellsByDataTableId, optimisticDataTableValues, p.disabled, p.setFloatingMessage, regionsById, scrollCellIntoView, selectedCellState, setHeaderSelection, sourceCellsByTargetKey]);

	const applySheetCellInputs = useCallback(async (inputs: SheetCellEditInput[]) => {
		const runtime = runtimeRef.current;

		if (!inputs.length) {
			return;
		}

		setOptimisticCellsByCoord((current) => {
			const next = new Map(current);

			inputs.forEach((input) => {
				const key = getSheetCanvasCoordKey(input.cell.rowIndex, input.cell.columnIndex);
				const currentCell = runtime?.effectiveCellsByCoord.get(key) || null;

				next.set(key, getOptimisticSheetCellFromEditInput(input, currentCell));
			});

			return next;
		});

		await p.onSaveCells(inputs);
	}, [p.onSaveCells]);

	const applySheetDataTableCellChanges = useCallback(async (changes: SheetDataTableCellHistoryChange[], direction: 'after' | 'before') => {
		if (!changes.length) {
			return;
		}

		const groupedChanges = new Map<string, SheetDataTableCellHistoryChange[]>();

		setOptimisticDataTableValues((current) => {
			const next = { ...current };

			changes.forEach((change) => {
				const dataTableId = String(change.target.dataTable.id || '');

				if (!dataTableId) {
					return;
				}

				next[getSheetDataTableSourceCellKey(dataTableId, change.target.sourceRowId, change.target.sourceCellKey)] = change[direction];
				groupedChanges.set(dataTableId, [
					...(groupedChanges.get(dataTableId) || []),
					change,
				]);
			});

			return next;
		});

		for (const [dataTableId, groupChanges] of groupedChanges) {
			await p.onSaveDataTableCells({
				dataTableId,
					cells: groupChanges.map((change) => ({
						cellKey: change.target.sourceCellKey,
						dataTableRowId: change.target.sourceRowId,
						value: change[direction],
					})),
				});
		}
	}, [p.onSaveDataTableCells]);

	const applySheetDesignPatch = useCallback(async (patch: SheetDesignPatchInput) => {
		if (patch.columns) {
			const columns = parseSheetJSONObject(patch.columns, {});

			setLocalColumnWidths(getSheetCanvasColumnWidths({
				...designRef.current,
				columns,
			}));
		}

		if (patch.rows) {
			const rows = parseSheetJSONObject(patch.rows, {});

			setLocalRowHeights(getSheetCanvasRowHeights({
				...designRef.current,
				rows,
			}, rowCount));
		}

		await p.onUpdateSheetDesign(patch);
	}, [p.onUpdateSheetDesign, rowCount, setLocalColumnWidths, setLocalRowHeights]);

	const applySheetHistoryEntry = useCallback(async (entry: SheetUndoRedoEntry, direction: 'after' | 'before') => {
		await runApplyingSheetHistory(async () => {
			if (entry.sheetCells?.length) {
				await applySheetCellInputs(entry.sheetCells.map((change) => change[direction]));
			}

			if (entry.dataTableCells?.length) {
				await applySheetDataTableCellChanges(entry.dataTableCells, direction);
			}

			if (entry.design) {
				await applySheetDesignPatch(entry.design[direction]);
			}
		});
	}, [applySheetCellInputs, applySheetDataTableCellChanges, applySheetDesignPatch, runApplyingSheetHistory]);

	const undoSheetHistory = useCallback(async () => {
		const entry = takeSheetUndoEntry();

		if (entry) {
			await applySheetHistoryEntry(entry, 'before');
		}
	}, [applySheetHistoryEntry, takeSheetUndoEntry]);

	const redoSheetHistory = useCallback(async () => {
		const entry = takeSheetRedoEntry();

		if (entry) {
			await applySheetHistoryEntry(entry, 'after');
		}
	}, [applySheetHistoryEntry, takeSheetRedoEntry]);

	const saveSheetCellValue = useCallback(async (cell: SheetUISelectedCellState, value: string | null) => {
		const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

		if (!rowIndex || !columnIndex) {
			return;
		}

		const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
		const currentCell = runtimeRef.current?.effectiveCellsByCoord.get(coordKey) || null;
		const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, currentCell);
		const after = getSheetValueEditInput(rowIndex, columnIndex, value);

		if (sheetCellEditInputsAreEqual(before, after)) {
			return;
		}

		pushSheetUndoEntry({
			sheetCells: [{
				after,
				before,
			}],
		});
		await applySheetCellInputs([after]);
	}, [applySheetCellInputs, pushSheetUndoEntry]);

	const saveDataTableCellValue = useCallback(async (target: SheetDataTableCellEditTarget, value: string | null) => {
		const dataTableId = String(target.dataTable.id || '');
		const optimisticKey = getSheetDataTableSourceCellKey(dataTableId, target.sourceRowId, target.sourceCellKey);
		const currentValue = getDataTableCellSerializedValue(target.lookup.cell, target.lookup.designCell, optimisticDataTableValues[optimisticKey]);

		if (!dataTableId || currentValue === value) {
			return;
		}

		pushSheetUndoEntry({
			dataTableCells: [{
				after: value,
				before: currentValue,
				target,
			}],
		});

		try {
			await applySheetDataTableCellChanges([{
				after: value,
				before: currentValue,
				target,
			}], 'after');
		} catch (error) {
			setOptimisticDataTableValues((current) => {
				const next = { ...current };
				delete next[optimisticKey];
				return next;
			});

			throw error;
		}
	}, [applySheetDataTableCellChanges, optimisticDataTableValues, pushSheetUndoEntry]);

	const commitEditorElement = useCallback(async (editorElement: HTMLElement, options?: { selectAfterCommit?: boolean }) => {
		if (committingEditorRef.current) {
			return;
		}

		const cellKey = editorElement.dataset.cellKey;
		const rowId = editorElement.dataset.rowId;
		const selectAfterCommit = options?.selectAfterCommit !== false;

		if (!cellKey || !rowId) {
			setEditState(null);
			return;
		}

		const nextCell = {
			cellKey,
			rowId,
		};
		const dataTableTarget = getSheetDataTableCellEditTarget({
			cellKey,
			dataTablesById,
			designCellsByDataTableId,
			effectiveCellsByCoord: runtimeRef.current?.effectiveCellsByCoord || new Map(),
			regionsById,
			rowId,
			sourceCellsByTargetKey,
		});

		if (dataTableTarget) {
			const draftValue = getDataTableEditorElementValue(editorElement);
			const parsedValue = parseSheetEditorValue(dataTableTarget.lookup.designCell, draftValue);

			if (parsedValue.error) {
				setEditState({
					cellKey,
					draftValue,
					error: parsedValue.error,
					rowId,
				});
				return;
			}

			try {
				committingEditorRef.current = true;
				await saveDataTableCellValue(dataTableTarget, parsedValue.value);
				setEditState(null);
				if (selectAfterCommit) {
					selectSheetCell(nextCell);
				}
			} catch (error) {
				setEditState({
					cellKey,
					draftValue,
					error: error instanceof Error ? error.message : 'Unable to save cell',
					rowId,
				});
			} finally {
				committingEditorRef.current = false;
			}
			return;
		}

		const draftValue = getSheetEditorElementValue(editorElement);

		try {
			committingEditorRef.current = true;
			await saveSheetCellValue(nextCell, draftValue);
			setEditState(null);
			if (selectAfterCommit) {
				selectSheetCell(nextCell);
			}
		} catch (error) {
			setEditState({
				cellKey,
				draftValue,
				error: error instanceof Error ? error.message : 'Unable to save cell',
				rowId,
			});
		} finally {
			committingEditorRef.current = false;
		}
	}, [dataTablesById, designCellsByDataTableId, regionsById, saveDataTableCellValue, saveSheetCellValue, selectSheetCell, sourceCellsByTargetKey]);

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
		const sheetCellChanges: SheetCellHistoryChange[] = [];
		const dataTableCellChanges: SheetDataTableCellHistoryChange[] = [];

		selectedCells.forEach((cell) => {
			const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
			const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

			if (!rowIndex || !columnIndex) {
				return;
			}

			const dataTableTarget = getSheetDataTableCellEditTarget({
				columnIndex,
				dataTablesById,
				designCellsByDataTableId,
				effectiveCellsByCoord: runtime.effectiveCellsByCoord,
				regionsById,
				rowIndex,
				sourceCellsByTargetKey,
			});

			if (dataTableTarget) {
				if (!canEditSheetDataTableCellTarget(dataTableTarget, p.disabled)) {
					return;
				}

				const parsedValue = parseSheetEditorValue(dataTableTarget.lookup.designCell, '');
				const dataTableId = String(dataTableTarget.dataTable.id || '');
				const optimisticKey = getSheetDataTableSourceCellKey(dataTableId, dataTableTarget.sourceRowId, dataTableTarget.sourceCellKey);
				const currentValue = getDataTableCellSerializedValue(dataTableTarget.lookup.cell, dataTableTarget.lookup.designCell, optimisticDataTableValues[optimisticKey]);

				if (!parsedValue.error && currentValue !== parsedValue.value) {
					dataTableCellChanges.push({
						after: parsedValue.value,
						before: currentValue,
						target: dataTableTarget,
					});
				}
				return;
			}

			const key = getSheetCanvasCoordKey(rowIndex, columnIndex);
			const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, runtime.effectiveCellsByCoord.get(key));
			const after = getSheetClearEditInput(rowIndex, columnIndex);

			if (!sheetCellEditInputsAreEqual(before, after)) {
				sheetCellChanges.push({
					after,
					before,
				});
			}
		});

		if (!sheetCellChanges.length && !dataTableCellChanges.length) {
			return;
		}

		pushSheetUndoEntry({
			dataTableCells: dataTableCellChanges,
			sheetCells: sheetCellChanges,
		});

		await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
		await applySheetDataTableCellChanges(dataTableCellChanges, 'after');
	}, [applySheetCellInputs, applySheetDataTableCellChanges, dataTablesById, designCellsByDataTableId, optimisticDataTableValues, p.disabled, pushSheetUndoEntry, regionsById, selectedCellKeyMap, selectedCellState, sourceCellsByTargetKey]);

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
		const sheetCellChanges: SheetCellHistoryChange[] = [];
		const dataTableCellChanges: SheetDataTableCellHistoryChange[] = [];

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
					const dataTableTarget = getSheetDataTableCellEditTarget({
						columnIndex: canvasColumn.sheetColumnIndex,
						dataTablesById,
						designCellsByDataTableId,
						effectiveCellsByCoord: runtime.effectiveCellsByCoord,
						regionsById,
						rowIndex,
						sourceCellsByTargetKey,
					});

					if (dataTableTarget) {
						if (!canEditSheetDataTableCellTarget(dataTableTarget, p.disabled)) {
							return;
						}

						const parsedValue = parseSheetEditorValue(dataTableTarget.lookup.designCell, value);
						const dataTableId = String(dataTableTarget.dataTable.id || '');
						const optimisticKey = getSheetDataTableSourceCellKey(dataTableId, dataTableTarget.sourceRowId, dataTableTarget.sourceCellKey);
						const currentValue = getDataTableCellSerializedValue(dataTableTarget.lookup.cell, dataTableTarget.lookup.designCell, optimisticDataTableValues[optimisticKey]);

						if (!parsedValue.error && currentValue !== parsedValue.value) {
							dataTableCellChanges.push({
								after: parsedValue.value,
								before: currentValue,
								target: dataTableTarget,
							});
						}
						return;
					}

					const key = getSheetCanvasCoordKey(rowIndex, canvasColumn.sheetColumnIndex);
					const before = getSheetCellSnapshotEditInput(rowIndex, canvasColumn.sheetColumnIndex, runtime.effectiveCellsByCoord.get(key));
					const after = getSheetValueEditInput(rowIndex, canvasColumn.sheetColumnIndex, value);

					if (!sheetCellEditInputsAreEqual(before, after)) {
						sheetCellChanges.push({
							after,
							before,
						});
					}
				}
			});
		});

		if (!sheetCellChanges.length && !dataTableCellChanges.length) {
			return;
		}

		pushSheetUndoEntry({
			dataTableCells: dataTableCellChanges,
			sheetCells: sheetCellChanges,
		});

		await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
		await applySheetDataTableCellChanges(dataTableCellChanges, 'after');
	}, [applySheetCellInputs, applySheetDataTableCellChanges, dataTablesById, designCellsByDataTableId, optimisticDataTableValues, p.disabled, pushSheetUndoEntry, regionsById, selectedCellState, sourceCellsByTargetKey]);

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

		closeSheetCellEditorForSelection();
		setHeaderSelection(null);
		setSelectedCellState(activeCell);
		setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells(selectedCells));
	}, [closeSheetCellEditorForSelection, p.design, p.ranges, rowCount, selectSheetCell, selectedCellState, setHeaderSelection]);

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

		closeSheetCellEditorForSelection();
		setHeaderSelection({
			rowIds,
			type: 'ROW',
		});
		setSelectedCellState(activeCell);
		setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells(selectedCells));
	}, [closeSheetCellEditorForSelection, setHeaderSelection, setSelectedCellKeyMap, setSelectedCellState]);

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

		closeSheetCellEditorForSelection();
		setHeaderSelection({
			cellKeys,
			type: 'COLUMN',
		});
		setSelectedCellState(activeCell);
		setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells(selectedCells));
	}, [closeSheetCellEditorForSelection, setHeaderSelection, setSelectedCellKeyMap, setSelectedCellState]);

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

			closeSheetCellEditorForSelection();
			setHeaderSelection(null);
			setSelectedCellState(selection.activeCell);
			setSelectedCellKeyMap(selection.selectedCellKeyMap);
			scrollCellIntoView(selection.activeCell);
			return;
		}

		selectSheetCell(nextCell);
	}, [closeSheetCellEditorForSelection, scrollCellIntoView, selectSheetCell, selectedCellKeyMap, selectedCellState, setHeaderSelection]);

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

	/*
	 * Open the in-sheet color picker for one Sheet context-menu format action.
	 */
	const handleSheetContextMenuCustomizeCells = useCallback((target: SheetContextMenuTarget, formatName: SheetContextMenuFormatName) => {
		if (!target.canEdit) {
			return;
		}

		setColorPickerState({
			formatName,
			target,
		});
	}, []);

	const handleSheetContextMenuFormatCells = useCallback(async (target: SheetContextMenuTarget, format: SheetContextMenuFormat) => {
		const runtime = runtimeRef.current;
		const sheetCellChanges: SheetCellHistoryChange[] = [];

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
			const after = {
				cell: {
					columnIndex,
					rowIndex,
					style: JSON.stringify(nextStyle),
				},
			};
			const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, currentCell);

			if (!sheetCellEditInputsAreEqual(before, after)) {
				sheetCellChanges.push({
					after,
					before,
				});
			}
		});

		if (!sheetCellChanges.length) {
			return;
		}

		pushSheetUndoEntry({
			sheetCells: sheetCellChanges,
		});

		await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
	}, [applySheetCellInputs, pushSheetUndoEntry]);

	const handleSheetContextMenuPopulateDataTable = useCallback((target: SheetContextMenuTarget) => {
		const request = getSheetInsertViewTableRequest(target, p.design);

		if (request) {
			p.onPopulateFromDataTable?.(request);
		}
	}, [p.design, p.onPopulateFromDataTable]);

	const handleSheetContextMenuRemoveDataTableRegion = useCallback(async (target: SheetContextMenuTarget) => {
		if (!target.dataTableRegionId) {
			return;
		}

		await p.onRemoveDataTableRegion?.(target.dataTableRegionId);
	}, [p.onRemoveDataTableRegion]);

	/*
	 * Paste clipboard text through the same Sheet mutation path used by keyboard shortcuts.
	 */
	const handleSheetContextMenuPasteCells = useCallback(async (_target: SheetContextMenuTarget, clipboardText: string) => {
		await pasteSelectedSheetCells(clipboardText);
	}, [pasteSelectedSheetCells]);

	/*
	 * Apply the custom Sheet color picker value to the active color format target.
	 */
	const handleSheetColorPickerValue = useCallback((value: string) => {
		if (!colorPickerState) {
			return;
		}

		void handleSheetContextMenuFormatCells(colorPickerState.target, {
			name: colorPickerState.formatName,
			value,
		});
	}, [colorPickerState, handleSheetContextMenuFormatCells]);

	/*
	 * Close the active in-sheet color picker.
	 */
	const closeSheetColorPicker = useCallback(() => {
		setColorPickerState(null);
	}, []);

	const {
		closeSheetContextMenu,
		openSheetContextMenu,
	} = useSheetContextMenu({
		onCustomizeCells: handleSheetContextMenuCustomizeCells,
		onEditCell: handleSheetContextMenuEditCell,
		onFormatCells: handleSheetContextMenuFormatCells,
		onPasteCells: handleSheetContextMenuPasteCells,
		onPopulateFromDataTable: handleSheetContextMenuPopulateDataTable,
		onRemoveCellsFromDataTable: handleSheetContextMenuRemoveDataTableRegion,
		readClipboardText: readSheetClipboardText,
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
				onDismissContextMenu: closeSheetContextMenu,
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
				onRedo: redoSheetHistory,
				onSelectAll: selectAllSheetCells,
				onTab: navigateSheetTab,
				onTextInput: (pressed) => {
					openSheetCellEditor(selectedCellState, pressed, false);
				},
				onUndo: undoSheetHistory,
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
		closeSheetContextMenu,
		commitEditorElement,
		copySelectedSheetCells,
		editState,
		keyDown.alert,
		keyDown.modal,
		navigateSheetArrow,
		navigateSheetTab,
		openSheetCellEditor,
		pasteSelectedSheetCells,
		redoSheetHistory,
		selectAllSheetCells,
		selectedCellState,
		undoSheetHistory,
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
		const previousBodyCursor = setSheetCanvasBodyCursor('col-resize');
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
			const before = {
				columns: JSON.stringify(design.columns || {}),
			};
			const after = {
				columns: JSON.stringify(columns),
			};

			pushSheetUndoEntry({
				design: {
					after,
					before,
				},
			});
			setLocalColumnWidths((currentWidths) => ({
				...currentWidths,
				[state.columnKey]: state.latestWidth,
			}));
			await onUpdateSheetDesignRef.current({
				columns: JSON.stringify(columns),
			});
		};
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				resizeStateRef.current = null;
				setResizeState(null);
			}
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp, {
			once: true,
		});
		window.addEventListener('pointercancel', onPointerUp, {
			once: true,
		});
		window.addEventListener('keydown', onKeyDown);

		return () => {
			restoreSheetCanvasBodyCursor(previousBodyCursor);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [resizeState?.columnKey]);

	useEffect(() => {
		if (!rowResizeState?.rowKey) {
			return;
		}

		const activeRowKey = rowResizeState.rowKey;
		const previousBodyCursor = setSheetCanvasBodyCursor('row-resize');
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
			const before = {
				rows: JSON.stringify(design.rows || {}),
			};
			const after = {
				rows: JSON.stringify(rows),
			};

			setRowResizeState(null);
			pushSheetUndoEntry({
				design: {
					after,
					before,
				},
			});
			setLocalRowHeights((currentHeights) => ({
				...currentHeights,
				[state.rowKey]: state.latestHeight,
			}));
			await onUpdateSheetDesignRef.current({
				rows: JSON.stringify(rows),
			});
		};
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				rowResizeStateRef.current = null;
				setRowResizeState(null);
			}
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp, {
			once: true,
		});
		window.addEventListener('pointercancel', onPointerUp, {
			once: true,
		});
		window.addEventListener('keydown', onKeyDown);

		return () => {
			restoreSheetCanvasBodyCursor(previousBodyCursor);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [rowResizeState?.rowKey]);

	/*
	 * Dismiss the color picker from the sheet's centralized pointer capture path.
	 */
	const handlePointerDownCapture = useCallback((event: PointerEvent<HTMLDivElement>) => {
		const target = event.target instanceof Element ? event.target : null;
		const colorPickerElement = target?.closest(SHEET_COLOR_PICKER_SELECTOR);

		colorPickerPointerDownInsideRef.current = Boolean(colorPickerElement);

		if (!colorPickerElement && colorPickerState) {
			closeSheetColorPicker();
		}
	}, [closeSheetColorPicker, colorPickerState]);

	const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
		dismissGridContextMenuOnPointerDown(event.nativeEvent, closeSheetContextMenu);

		const target = event.target instanceof Element ? event.target : null;
		const startedInsideColorPicker = colorPickerPointerDownInsideRef.current || Boolean(target?.closest(SHEET_COLOR_PICKER_SELECTOR));

		colorPickerPointerDownInsideRef.current = false;

		if (startedInsideColorPicker) {
			return;
		}

		if (p.disabled || event.button !== 0 || target?.closest(SHEET_CANVAS_GRID_EDITOR_SELECTOR)) {
			return;
		}

		const scrollRect = event.currentTarget.getBoundingClientRect();
		const isVerticalScrollbarClick = event.clientX >= scrollRect.right - SHEET_CANVAS_APP_SCROLLBAR_SIZE;
		const isHorizontalScrollbarClick = event.clientY >= scrollRect.bottom - SHEET_CANVAS_APP_SCROLLBAR_SIZE;

		if (isVerticalScrollbarClick || isHorizontalScrollbarClick) {
			return;
		}

		const activeEditorElement = event.currentTarget.querySelector(SHEET_CANVAS_TEXT_EDITOR_SELECTOR) as HTMLElement | null;
		if (activeEditorElement) {
			void commitEditorElement(activeEditorElement, {
				selectAfterCommit: false,
			});
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

			closeSheetCellEditorForSelection();
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
	}, [closeSheetCellEditorForSelection, closeSheetContextMenu, commitEditorElement, p.disabled, selectSheetCell, selectSheetCellRangeToTarget, selectSheetColumn, selectSheetColumnRange, selectedCellState, selectSheetRow, selectSheetRowRange, setHeaderSelection, startColumnResize, startRowResize, stickyColumnCount]);

	const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
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
		const cursor = getSheetCanvasPointerCursor(hit, p.disabled);
		const rowIndex = hit.cell ? getSheetCanvasRowIndexFromId(hit.cell.rowId) : null;
		const columnIndex = hit.cell ? getSheetCanvasColumnIndexFromKey(hit.cell.cellKey) : null;
		const dataTableRegion = rowIndex && columnIndex
			? getSheetDataTableRegionAtCell(rowIndex, columnIndex, p.regions)
			: null;
		const nextHoveredRegionId = dataTableRegion?.id ? String(dataTableRegion.id) : null;

		if (event.currentTarget.style.cursor !== cursor) {
			event.currentTarget.style.cursor = cursor;
		}

		setHoveredRegionId((currentRegionId) => {
			return currentRegionId === nextHoveredRegionId ? currentRegionId : nextHoveredRegionId;
		});
	}, [p.disabled, p.regions, stickyColumnCount]);

	const handlePointerLeave = useCallback((event: PointerEvent<HTMLDivElement>) => {
		if (event.currentTarget.style.cursor) {
			event.currentTarget.style.cursor = '';
		}

		setHoveredRegionId(null);
	}, []);

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
			canPopulateFromDataTable: Boolean(p.onPopulateFromDataTable),
			canRemoveCellsFromDataTable: Boolean(p.onRemoveDataTableRegion) && !p.disabled,
			cell: hit.cell,
			cellLookup,
			regions: p.regions,
			selectedCellKeyMap: nextSelectedCellKeyMap,
			selectedCellState: nextCell,
		}));
	}, [cellLookup, openSheetContextMenu, p.disabled, p.onPopulateFromDataTable, p.onRemoveDataTableRegion, p.regions, selectSheetCell, selectedCellKeyMap, selectedCellState, stickyColumnCount]);

	const handleFocusOut = useCallback((event: FocusEvent<HTMLDivElement>) => {
		if (keepEditModeForDev) {
			return;
		}

		const editorElement = event.target instanceof HTMLElement && event.target.closest(SHEET_CANVAS_TEXT_EDITOR_SELECTOR) as HTMLElement | null;
		const nextEditorElement = event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest(SHEET_CANVAS_TEXT_EDITOR_SELECTOR) as HTMLElement | null;

		if (editorElement && !nextEditorElement) {
			void commitEditorElement(editorElement);
		}
	}, [commitEditorElement, keepEditModeForDev]);

	/*
	 * Commit formula input edits only when focus leaves both Sheet text editors.
	 */
	const handleFormulaInputBlur = useCallback((event: FocusEvent<HTMLInputElement>) => {
		setFormulaInputFocused(false);

		if (keepEditModeForDev) {
			return;
		}

		const nextEditorElement = event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest(SHEET_CANVAS_TEXT_EDITOR_SELECTOR) as HTMLElement | null;

		if (!nextEditorElement) {
			void commitEditorElement(event.currentTarget);
		}
	}, [commitEditorElement, keepEditModeForDev]);

	/*
	 * Start regular-cell edit mode from the formula input without moving focus into the cell overlay.
	 */
	const handleFormulaInputFocus = useCallback(() => {
		setFormulaInputFocused(true);

		if (!formulaInputCanStartEdit || editState || !selectedCellState) {
			return;
		}

		openSheetCellEditor(selectedCellState, undefined, false);
	}, [editState, formulaInputCanStartEdit, openSheetCellEditor, selectedCellState]);

	/*
	 * Store the active formula input draft so the canvas cell can redraw while users type.
	 */
	const updateSheetEditorDraftValue = useCallback((draftValue: string, cellKey?: string | null, rowId?: string | null) => {
		setEditState((current) => {
			if (!current) {
				return current;
			}

			const nextCellKey = cellKey || current.cellKey;
			const nextRowId = rowId || current.rowId;

			if (
				current.cellKey === nextCellKey &&
				current.rowId === nextRowId &&
				current.draftValue === draftValue &&
				!current.error
			) {
				return current;
			}

			return {
				...current,
				cellKey: nextCellKey,
				draftValue,
				error: null,
				rowId: nextRowId,
			};
		});
	}, []);

	const handleInput = useCallback((event: FormEvent<HTMLDivElement>) => {
		const editorElement = event.target instanceof HTMLElement && event.target.closest(SHEET_CANVAS_TEXT_EDITOR_SELECTOR) as HTMLElement | null;

		if (!editorElement) {
			return;
		}

		updateSheetEditorDraftValue(
			getSheetEditorElementValue(editorElement),
			editorElement.dataset.cellKey,
			editorElement.dataset.rowId,
		);
	}, [updateSheetEditorDraftValue]);

	const saveDataTableLocalEditorDraftValue = useCallback(async (target: SheetDataTableCellEditTarget, draftValue: string, closeAfterSave: boolean) => {
		const parsedValue = parseSheetEditorValue(target.lookup.designCell, draftValue);

		if (parsedValue.error) {
			setEditState({
				cellKey: target.cellKey,
				draftValue,
				error: parsedValue.error,
				rowId: target.rowId,
			});
			return;
		}

		try {
			await saveDataTableCellValue(target, parsedValue.value);

			if (closeAfterSave) {
				setEditState(null);
				selectSheetCell({
					cellKey: target.cellKey,
					rowId: target.rowId,
				});
				return;
			}

			setEditState({
				cellKey: target.cellKey,
				disableInlineEditor: true,
				draftValue: parsedValue.value || '',
				rowId: target.rowId,
			});
		} catch (error) {
			setEditState({
				cellKey: target.cellKey,
				draftValue,
				error: error instanceof Error ? error.message : 'Unable to save cell',
				rowId: target.rowId,
			});
		}
	}, [saveDataTableCellValue, selectSheetCell]);

	const handleDataTableSelectEditorOptionValue = useCallback((lookup: DataTableCellLookup, value: string) => {
		const target = activeDataTableEditTarget;

		if (!target || target.lookup !== lookup) {
			return;
		}

		if (getSheetEditorFieldType(lookup.designCell) !== 'MULTI_SELECT') {
			void saveDataTableLocalEditorDraftValue(target, value, true);
			return;
		}

		const selectedValues = getSheetMultiSelectEditorValueSet(editState?.draftValue || getSheetEditorDraftValue(lookup.cell, lookup.designCell));

		if (selectedValues.has(value)) {
			selectedValues.delete(value);
		} else {
			selectedValues.add(value);
		}

		void saveDataTableLocalEditorDraftValue(target, JSON.stringify(Array.from(selectedValues)), false);
	}, [activeDataTableEditTarget, editState?.draftValue, saveDataTableLocalEditorDraftValue]);

	const handleDataTableSelectEditorCustomTextSave = useCallback((lookup: DataTableCellLookup, draftValue: string) => {
		const target = activeDataTableEditTarget;

		if (!target || target.lookup !== lookup) {
			return;
		}

		void saveDataTableLocalEditorDraftValue(target, draftValue, true);
	}, [activeDataTableEditTarget, saveDataTableLocalEditorDraftValue]);

	const handleDataTableDateEditorValue = useCallback((lookup: DataTableCellLookup, draftValue: string) => {
		const target = activeDataTableEditTarget;

		if (!target || target.lookup !== lookup) {
			return;
		}

		void saveDataTableLocalEditorDraftValue(target, draftValue, true);
	}, [activeDataTableEditTarget, saveDataTableLocalEditorDraftValue]);

	const formulaContent = <SheetFormulaInput
		canEdit={formulaInputCanStartEdit}
		column={formulaInputState.column}
		editState={formulaInputCanEdit ? editState : null}
		error={formulaInputState.error}
		onBlur={handleFormulaInputBlur}
		onDraftValue={updateSheetEditorDraftValue}
		onEditStart={handleFormulaInputFocus}
		readOnly={!formulaInputCanStartEdit}
		value={formulaInputCanEdit ? editState?.draftValue || '' : formulaInputState.value}
	/>;

	const overlayContent = <>
		{activeEditorColumn && editState && editorPosition && !editState.disableInlineEditor && !activeDataTableLocalEditorPosition
			? <SheetEditorOverlay
				column={activeEditorColumn}
				autoFocus={!formulaInputFocused}
				editState={editState}
				onDraftValue={updateSheetEditorDraftValue}
				position={editorPosition}
				scrollLeft={scrollState.scrollLeft}
				scrollTop={scrollState.scrollTop}
			/>
			: null}
		{activeDataTableEditTarget && editState && activeDataTableLocalEditorPosition && activeDataTableFieldType && isSheetSelectEditorFieldType(activeDataTableFieldType)
			? <DataTableLocalEditorContainer position={activeDataTableLocalEditorPosition}>
				<DataTableSelectEditor
					clickSource={editState.clickSource}
					editState={editState}
					fieldType={activeDataTableFieldType}
					lookup={activeDataTableEditTarget.lookup}
					onCustomTextSave={handleDataTableSelectEditorCustomTextSave}
					onOptionValue={handleDataTableSelectEditorOptionValue}
				/>
			</DataTableLocalEditorContainer>
			: null}
		{activeDataTableEditTarget && editState && activeDataTableLocalEditorPosition && activeDataTableFieldType && isDataTableDateEditorFieldType(activeDataTableFieldType)
			? <DataTableLocalEditorContainer position={activeDataTableLocalEditorPosition}>
				<DataTableDateEditor
					clickSource={editState.clickSource}
					editState={editState}
					lookup={activeDataTableEditTarget.lookup}
					onDateTimeSave={handleDataTableDateEditorValue}
					onDateValue={handleDataTableDateEditorValue}
				/>
			</DataTableLocalEditorContainer>
			: null}
		{activeDataTableEditTarget && activeDataTableLocalEditorPosition && isDataTableInboundContactIdLookup(activeDataTableEditTarget.lookup)
			? <DataTableLocalEditorContainer position={activeDataTableLocalEditorPosition}>
				<DataTableInboundContactEditor
					clickSource={editState?.clickSource}
					displayValue={getSheetCellDisplayValue(activeDataTableEditTarget.lookup.cell, activeDataTableEditTarget.lookup.designCell, undefined, p.timeZone)}
					inboundContactId={String(activeDataTableEditTarget.lookup.cell?.relatedId || '')}
					onClose={() => {
						setEditState(null);
						selectSheetCell({
							cellKey: activeDataTableEditTarget.cellKey,
							rowId: activeDataTableEditTarget.rowId,
						});
					}}
					openModalPopUp={openModalPopUp}
					organizationId={String(activeDataTableEditTarget.dataTable.organizationId || '')}
				/>
			</DataTableLocalEditorContainer>
			: null}
		{colorPickerState && colorPickerEditorPosition
			? <SheetColorPicker
				key={`${colorPickerState.target.rowId}:${colorPickerState.target.cellKey}:${colorPickerState.formatName}`}
				label={getSheetColorPickerFormatLabel(colorPickerState.formatName)}
				onClose={closeSheetColorPicker}
				onColorValue={handleSheetColorPickerValue}
				position={colorPickerEditorPosition}
				scrollLeft={scrollState.scrollLeft}
				scrollTop={scrollState.scrollTop}
				value={colorPickerState.formatName === 'textColor' ? colorPickerState.target.textColor : colorPickerState.target.fillColor}
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
		formulaContent={formulaContent}
		headerContent={p.children}
		headerSelection={headerSelection}
		onContextMenu={handleContextMenu}
		onDoubleClick={handleDoubleClick}
		onFocusOut={handleFocusOut}
		onInput={handleInput}
		onPointerDown={handlePointerDown}
		onPointerDownCapture={handlePointerDownCapture}
		onPointerLeave={handlePointerLeave}
		onPointerMove={handlePointerMove}
		overlayContent={overlayContent}
		regions={p.regions}
		hoveredRegionId={hoveredRegionId}
		resizeGuide={resizeGuide}
		rowMetrics={rowMetricsData.metrics}
		rowResizeGuide={rowResizeGuide}
		scrollLeft={scrollState.scrollLeft}
		scrollRef={scrollElement.ref}
		scrollTop={scrollState.scrollTop}
		selectedReadOnlyCellPosition={selectedDataTableReadOnlyCellPosition}
		selectedCellKeyMap={selectedCellKeyMap}
		selectedCellState={selectedCellState}
		stickyColumnCount={stickyColumnCount}
		stickyRowCount={Math.max(0, p.design.grid.frozenRows || 0)}
		viewportHeight={viewportHeight}
		viewportWidth={viewportWidth}
	/>;
}

export default SheetController;
