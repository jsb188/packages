import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import {
	SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
	SHEET_DATA_TABLE_REGION_MAX_ROWS,
} from '@jsb188/mday/constants/sheet.ts';
import { sheetMergedRangesIntersect, addSheetMergedRange, getSheetMergedRangeAtCell, getSheetMergedRanges, isSheetCellInMergedRange, isSheetMergedRangeAnchor, removeSheetMergedRangesIntersecting,
	getSheetAutofillValues,
	getSheetCellValueType,
	getSheetCellValueTypeForDataTableFieldType,
	getSheetChildOrganizationSourceOrgId,
	getSheetColumnDesignKey,
	getSheetRegionSourceDataTableRoute,
	getSheetRegionSourceId,
	getSheetRowDesignKey,
	isSheetGeneratedRegionSource,
	mergeSheetAxisDesignLineFormats,
	mergeSheetAxisDesignLineStyles,
	normalizeSheetCellFontSize,
	normalizeSheetCellFormat,
	normalizeSheetCellStyle,
	sheetCellFormatHasDisplayRules,
	shiftSheetFormulaReferences,
	type SheetAutofillCell,
} from '@jsb188/mday/utils/sheet.ts';
import type {
  DataTableCellGQL,
  DataTableGQL,
  DataTableRowGQL,
} from '@jsb188/mday/types/dataTable.d.ts';
import type { OrganizationOperationEnum } from '@jsb188/mday/types/organization.d.ts';
import type { SheetMergedRangeObj,
  SheetAxisDesignObj,
  SheetCellFormatObj,
  SheetCellGQL,
  SheetCellValueTypeEnum,
  SheetDesignObj,
  SheetDisplayRulesForTypeObj,
  SheetDisplayRulesObj,
  SheetRangeGQL,
  SheetRegionGQL,
  SheetStructureOperationEnum,
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
import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type FormEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { SheetCanvasSurface } from './SheetCanvasSurface.tsx';
import { SheetColorPicker } from './SheetColorPicker.tsx';
import { SheetDisplayRulesEditor } from './SheetDisplayRulesEditor.tsx';
import { SheetEditorOverlay, type SheetEditorOverlayPosition } from './SheetEditorOverlay.tsx';
import { SheetFormulaInput } from './SheetFormulaInput.tsx';
import { useSheetContextMenu, type SheetContextMenuFormat, type SheetContextMenuFormatName, type SheetContextMenuMergeMode, type SheetContextMenuStructureAction, type SheetContextMenuTarget } from '../libs/SheetContextMenu.tsx';
import { getInternalGridClipboard, parseGridClipboardText, setInternalGridClipboard } from '../libs/grid-clipboard.ts';
import type { GridInternalClipboardCell } from '../libs/grid-clipboard.ts';
import {
	dismissGridContextMenuOnPointerDown,
} from '../libs/grid-context-menu.ts';
import { getClientCalculatedSheetFormulaCell, sheetCellCanClientCalculateFormula } from '../libs/sheet-formula-evaluation.ts';
import {
  addGridKeyboardEventListener,
  GRID_FORMULA_INPUT_SELECTOR,
  handleGridKeyboardEvent,
  type GridArrowDirection,
  type GridFillShortcutDirection,
  type GridHomeEndEdge,
  type GridPageDirection,
  type GridTextStyleShortcutName,
} from '../libs/grid-keyboard.ts';
import {
	getSheetEventElementTarget,
	isSheetColorPickerEventTarget,
	isSheetContextMenuOverlayEventTarget,
	isSheetDisplayRulesEditorEventTarget,
	SHEET_GRID_EDITOR_SELECTOR,
	SHEET_TEXT_EDITOR_SELECTOR,
} from '../libs/sheet-overlay-targets.ts';
import {
	applySheetBorderColorToEnabledSides,
	applySheetBorderPresetStyleToCell,
	getSheetBorderColorStyleDelta,
	getSheetBorderPresetStyleDeltaForNeighbors,
	getSheetBorderStyleCellCoords,
	isSheetBorderStylePresetValue,
	type SheetBorderStyleCellCoord,
	type SheetBorderStylePresetValue,
} from '../libs/sheet-border-styles.ts';
import { getSheetCellTextRequiredRowHeight } from '../libs/sheet-text-measure.ts';
import {
	applySheetStructureShiftToUndoEntries,
	getSheetCellSnapshotEditInput,
	getSheetClearEditInput,
	getSheetStructureHistoryChange,
	getSheetValueEditInput,
	sheetCellDraftValueIsEqual,
	sheetCellEditInputMatchesCell,
	sheetCellEditInputsAreEqual,
	sheetCellHasSavedDesign,
	useSheetUndoRedo,
	type SheetCellEditInput,
	type SheetCellHistoryChange,
	type SheetDataTableCellEditTarget,
	type SheetDataTableCellHistoryChange,
	type SheetDesignHistoryChange,
	type SheetDesignPatchInput,
	type SheetRegionHistoryChange,
	type SheetUndoRedoEntry,
} from '../libs/sheet-history.ts';
import {
	getSheetOptimisticCellEditTransition,
} from '../libs/sheet-local-state.ts';
import {
	getGridKeyboardElements,
	isGridShortcutBlockedByActiveInput,
	isGridTextInputKey,
	useGridElementSize,
} from '../libs/grid-runtime.ts';
import {
	getDataTableCellFieldsFromSheetSourceMeta,
	getSheetCellDataTableSourceKey,
	getSheetCellValueFieldsFromDataTableOptimisticValue,
	getSheetDataTableDesignCellsByTableId,
	getSheetDataTableSourceCellKey,
	getSourceDataTableCellsByTargetKey,
} from '../libs/sheet-dataTable-preview.ts';
import {
	getSheetPendingEditDataTableSourceKey,
	type SheetCellSaveEntry,
	type SheetDataTableCellSaveEdit,
} from '../libs/use-sheet-cell-saves.ts';
import {
  getSheetCanvasColumnDisplayLeft,
  getSheetCanvasColumnDisplayRight,
  getSheetCanvasRowDisplayBottom,
  getSheetCanvasRowDisplayTop,
} from '../libs/sheet-canvas-geometry.ts';
import {
  gridSelectedCellKeyMapHasMultipleCells,
  getGridArrowNavigationSelection,
  getGridDataEdgeNavigationSelection,
  getGridRangeSelection,
  getGridResolvedSelectedCellKeyMap,
  getGridSelectedCellsFromKeyMap,
  getGridSelectedCellKeyMapFromCells,
  getGridSelectedCellKeyMapWithCellToggled,
  getGridTopLeftSelectedCell,
  getNextActiveGridSelectedCell,
  getOrderedGridSelectedCells,
} from '../libs/grid-selection.ts';
import {
	getSheetRegionGridRect,
  canSheetCanvasCellTextOverflow,
  getSheetCanvasCell,
  getSheetCanvasCellDisplayValue,
  getSheetCanvasCellDraftValue,
  getSheetCanvasColumnBufferCount,
  getSheetCanvasColumnDesign,
  getSheetCanvasColumnIndexFromKey,
  getSheetCanvasColumns,
  getSheetCanvasColumnWidths,
  getSheetCanvasCoordKey,
  getSheetCanvasInitialRowCount,
  getSheetCanvasRowBufferCount,
  getSheetCanvasRowDesign,
  getSheetCanvasRowHeights,
  getSheetCanvasRowIndexFromId,
  getSheetCanvasResolvedFormat,
  getSheetCanvasRowKeys,
  getSheetCanvasStyleColor,
  getSheetCanvasStyleFontSize,
  isSheetCanvasFormattedEmptyCell,
  parseSheetJSONObject,
  SHEET_CANVAS_INITIAL_ROW_COUNT,
  sheetCanvasStyleHasContent,
  type SheetCanvasCell,
  type SheetCanvasColumn,
} from '../libs/sheet-utils.ts';
import {
	type SheetHeaderSelectionState,
	type SheetStateAtoms,
} from '../libs/sheet-state.ts';
import type { SheetPresenceRosterEntry, SheetRemoteSelection } from '../libs/sheet-collab.ts';
import SheetPresenceRoster from '../ui/SheetPresenceRoster.tsx';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/layout/MainLayout';
import { DataTableInboundContactEditor } from './DataTable-InboundContact.tsx';
import { DataTableSiteLocationEditor } from './DataTable-SiteLocation.tsx';
import {
	DATA_TABLE_DATE_EDITOR_WIDTH,
	DATA_TABLE_INBOUND_CONTACT_EDITOR_MIN_WIDTH,
	DATA_TABLE_LOCAL_EDITOR_WIDTH_OFFSET,
	DATA_TABLE_SITE_LOCATION_EDITOR_MIN_WIDTH,
	canEditDataTableRuntimeCell,
	canOpenDataTableCellLink,
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
	isDataTableInboundContactOpenLookup,
	isDataTableLocalEditorFieldType,
	isDataTableOrganizationProfileLookup,
	isDataTableReferenceCell,
	isDataTableSiteLocationOpenLookup,
	isSheetSelectEditorFieldType,
	parseSheetEditorValue,
	type DataTableCellLookup,
	type DataTableLocalEditorPosition,
	type DataTableOpenCellParams,
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
const SHEET_CANVAS_FILL_HANDLE_HIT_SIZE = 8;
// This must match the .app_scr::-webkit-scrollbar width/height in packages/@jsb188:css/css/layout.css.
const SHEET_CANVAS_APP_SCROLLBAR_SIZE = 19;
const SHEET_KEYBOARD_DEFAULT_FONT_SIZE = 14;
const SHEET_KEYBOARD_FONT_SIZE_CHANGE_RATIO = 0.15;
const SHEET_DEV_PARAM = 'dev';
const SHEET_EDITOR_OVERFLOW_PADDING_X = 8;
const SHEET_EDITOR_OVERFLOW_FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export type SheetInsertViewTableRequest = {
	dataTableId?: string | null;
	region?: SheetRegionGQL | null;
	regionId?: string | null;
	startColumnIndex: number;
	startRowIndex: number;
};

type SheetClearSelectedCellsOptions = {
	/* Clear saved formatting along with content (cut-moves; Delete keeps formatting) */
	clearDesign?: boolean;
	deleteDataTableRegions?: boolean;
	promptForDataTableRegions?: boolean;
};

/*
 * Serialize one cell value for TSV clipboard text, quoting embedded tabs,
 * newlines, and quotes so spreadsheet apps parse them back as one cell.
 */
function getSheetClipboardEscapedValue(value: string) {
	return /[\t\n"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}

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
 * Return whether two selected Sheet cell states point to the same canvas cell.
 */
function isSameSheetSelectedCellState(left?: SheetUISelectedCellState | null, right?: SheetUISelectedCellState | null) {
	return Boolean(left && right && left.cellKey === right.cellKey && left.rowId === right.rowId);
}

type SheetControllerProps = {
	bufferColumns?: number;
	bufferRows?: number;
	cellsByCoord: Map<string, SheetCellGQL>;
	children?: ReactNode;
	className?: string;
	dataTables?: DataTableGQL[] | null;
	design: SheetDesignObj;
	disabled?: boolean;
	loadedRowCount: number;
	operation?: OrganizationOperationEnum | null;
	onEditSheetStructure?: (operation: SheetStructureOperationEnum, index: number) => Promise<unknown> | unknown;
	onOpenDataTable?: (route: string) => void;
	onOpenDataTableCellLink?: (params: DataTableOpenCellParams) => void;
	onOpenOrganizationProfile?: (childId: string, childOrgId?: string | null) => void;
	onPopulateFromDataTable?: (request: SheetInsertViewTableRequest) => void;
	onRemoveDataTableRegion?: (regionId: string, options?: { onDeleted?: (regionId: string) => void; skipConfirmation?: boolean }) => Promise<unknown> | unknown;
	/* Recreates one deleted data table region from its captured state (undo) */
	onRestoreDataTableRegion?: (region: SheetRegionGQL) => Promise<SheetRegionGQL | null>;
	/* Relays instant pending previews to peer viewers */
	onBroadcastCellEdits?: (previews: Array<{ coordKey: string; previewCell: SheetCellGQL }>) => void;
	onClearDataTablePendingEdits: (sourceKey: string) => void;
	onSaveDataTableCellEdits: (edits: SheetDataTableCellSaveEdit[]) => void;
	onSaveCells: (entries: SheetCellSaveEntry[]) => Promise<unknown> | unknown;
	/* Region areas whose materialized cells are still loading from the server */
	loadingRegionRects?: Array<{
		startRowIndex: number;
		startColumnIndex: number;
		endRowIndex: number;
		endColumnIndex: number;
	}> | null;
	presenceRoster?: SheetPresenceRosterEntry[] | null;
	remoteSelections?: SheetRemoteSelection[] | null;
	/* Last collaborator structure op; rebases the local undo/redo stacks over the shift */
	remoteStructureShift?: { index: number; operation: SheetStructureOperationEnum; seq: number } | null;
	onUpdateSheetDesign: (design: SheetDesignPatchInput) => Promise<unknown> | unknown;
	organizationId?: string | null;
	ranges: SheetRangeGQL[];
	regions?: SheetRegionGQL[] | null;
	setFloatingMessage?: SetFloatingMessage;
	sheetId: string;
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

type SheetFormulaErrorOverlayState = {
	message: string;
	position: DataTableLocalEditorPosition;
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

type SheetDisplayRulesEditorState = {
	target: SheetContextMenuTarget;
};

/*
 * Return the format object safe to persist at cell level for one coordinate.
 * Served cells carry a server-pre-merged format (design and range layers
 * folded in), so display-rule type keys that byte-match the design-only
 * resolution drop out — otherwise saving a cell rule would also bake the
 * inherited column/row rules into the cell as permanent cell-level rules.
 */
function getSheetCellOwnedDisplayRulesFormat(params: {
	cell?: SheetCellGQL | null;
	columnIndex: number;
	design: SheetDesignObj;
	ranges: SheetRangeGQL[];
	rowIndex: number;
}): SheetCellFormatObj {
	const format = normalizeSheetCellFormat(params.cell?.format);
	const displayRules: SheetDisplayRulesObj = { ...(format.displayRules || {}) };

	if (!Object.keys(displayRules).length) {
		return format;
	}

	const inheritedRules = getSheetCanvasResolvedFormat({
		...params,
		cell: null,
	}).displayRules || {};

	(Object.keys(displayRules) as SheetCellValueTypeEnum[]).forEach((typeKey) => {
		if (
			inheritedRules[typeKey] &&
			JSON.stringify(displayRules[typeKey]) === JSON.stringify(inheritedRules[typeKey])
		) {
			delete displayRules[typeKey];
		}
	});

	if (Object.keys(displayRules).length) {
		return {
			...format,
			displayRules,
		};
	}

	const { displayRules: _droppedRules, ...formatWithoutRules } = format;

	return formatWithoutRules;
}

type SheetCanvasFillDragState = {
	pointerId: number;
	source: SheetMergedRangeObj;
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
 * Return DataTable names keyed by their GraphQL id.
 */
function getSheetDataTableLabelsById(dataTables?: DataTableGQL[] | null) {
	return new Map((dataTables || [])
		.filter((dataTable) => dataTable?.id && dataTable.name)
		.map((dataTable) => [String(dataTable.id), String(dataTable.name)]));
}

/*
 * Return the current organization's built-in Child Organizations source label.
 */
function getSheetChildOrganizationsRegionSourceLabel(operation?: string | null) {
	return operation && i18n.has(`org.children.${operation}`)
		? i18n.t(`org.children.${operation}`)
		: i18n.t('org.children.default');
}

/*
 * Return source labels keyed by generated Sheet region source id.
 */
function getSheetRegionSourceLabelsById(dataTables?: DataTableGQL[] | null, operation?: string | null) {
	const labelsById = getSheetDataTableLabelsById(dataTables);

	labelsById.set(
		SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS,
		getSheetChildOrganizationsRegionSourceLabel(operation),
	);

	return labelsById;
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
 * Return the configured one-based end row for one generated Sheet region.
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
 * Return whether one Sheet region is backed by a generated source.
 */
function isSheetGeneratedRegion(region?: SheetRegionGQL | null) {
	return Boolean(region?.type === 'DATA_TABLE' && isSheetGeneratedRegionSource(region.source));
}

/*
 * Return whether one generated region contains a Sheet coordinate.
 */
function sheetDataTableRegionContainsCell(region: SheetRegionGQL, rowIndex: number, columnIndex: number) {
	if (!isSheetGeneratedRegion(region) || !region.columns?.length) {
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
}

/*
 * Return the generated Sheet region that owns one grid coordinate.
 */
function getSheetDataTableRegionAtCell(rowIndex: number, columnIndex: number, regions?: SheetRegionGQL[] | null) {
	return (regions || []).find((region) => {
		return sheetDataTableRegionContainsCell(region, rowIndex, columnIndex);
	}) || null;
}

/*
 * Return the generated Sheet region that owns one grid coordinate from an id map.
 */
function getSheetDataTableRegionAtCellFromMap(rowIndex: number, columnIndex: number, regionsById: Map<string, SheetRegionGQL>) {
	for (const region of regionsById.values()) {
		if (sheetDataTableRegionContainsCell(region, rowIndex, columnIndex)) {
			return region;
		}
	}

	return null;
}

/*
 * Return data table-backed region ids touched by the current Sheet selection.
 */
function getSheetDataTableRegionIdsForSelectedCells(params: {
	regionsById: Map<string, SheetRegionGQL>;
	selectedCells: SheetUISelectedCellState[];
}) {
	const regionIds = new Set<string>();

	params.selectedCells.forEach((cell) => {
		const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

		if (!rowIndex || !columnIndex) {
			return;
		}

		const region = getSheetDataTableRegionAtCellFromMap(rowIndex, columnIndex, params.regionsById);
		const regionId = region?.id ? String(region.id) : '';

		if (regionId) {
			regionIds.add(regionId);
		}
	});

	return Array.from(regionIds);
}

/*
 * Return whether one coordinate is inside a generated region but has no source target to edit.
 */
function isSheetDataTableRegionCellWithoutEditTarget(
	rowIndex: number,
	columnIndex: number,
	regionsById: Map<string, SheetRegionGQL>,
	target: SheetDataTableCellEditTarget | null,
) {
	return Boolean(!target && getSheetDataTableRegionAtCellFromMap(rowIndex, columnIndex, regionsById));
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
		...getDataTableCellFieldsFromSheetSourceMeta(cell),
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
	const dataTableId = region ? getSheetRegionSourceId(region) : '';
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
 * Return the openable DataTable target represented by one clickable Sheet canvas hit.
 */
function getSheetOpenableDataTableCellTarget(params: {
	dataTablesById: Map<string, DataTableGQL>;
	designCellsByDataTableId: Map<string, Map<string, DataTableRuntimeDesignCell>>;
	effectiveCellsByCoord: Map<string, SheetCellGQL>;
	hit: SheetCanvasPointerHit;
	regionsById: Map<string, SheetRegionGQL>;
	sourceCellsByTargetKey: Map<string, DataTableCellGQL>;
}) {
	if (!params.hit.cell) {
		return null;
	}

	const target = getSheetDataTableCellEditTarget({
		cellKey: params.hit.cell.cellKey,
		dataTablesById: params.dataTablesById,
		designCellsByDataTableId: params.designCellsByDataTableId,
		effectiveCellsByCoord: params.effectiveCellsByCoord,
		regionsById: params.regionsById,
		rowId: params.hit.cell.rowId,
		sourceCellsByTargetKey: params.sourceCellsByTargetKey,
	});

	if (!target || target.lookup.row.__deleted || !canOpenDataTableCellLink(target.lookup.cell, target.lookup.designCell)) {
		return null;
	}

	return target;
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
		!isDataTableInboundContactOpenLookup(target.lookup) &&
		!isDataTableSiteLocationOpenLookup(target.lookup) &&
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
	if (formatName === 'borderStyle') {
		return i18n.t('sheet.border_styles');
	}

	if (formatName === 'textColor') {
		return i18n.t('sheet.text_color');
	}

	if (formatName === 'fillColor') {
		return i18n.t('sheet.fill_color');
	}

	return i18n.t('sheet.font_size');
}

/*
 * Return a row-height design patch for rows whose selected text needs more height at a new font size.
 */
function getSheetAutoRowHeightPatchForFontSize(params: {
	cellCoords: SheetBorderStyleCellCoord[];
	cellLookup: Map<string, SheetCanvasCell>;
	columnMetricsByKey: Map<string, SheetColumnMetric>;
	designRows?: SheetDesignObj['rows'] | null;
	fontSize: number;
	rowMetricsByKey: Map<string, SheetRowMetric>;
}) {
	const rows = { ...(params.designRows || {}) };
	let changed = false;

	params.cellCoords.forEach((cellCoord) => {
		const cell = params.cellLookup.get(cellCoord.coordKey);
		const text = String(cell?.displayValue || '');

		if (!text) {
			return;
		}

		const columnMetric = params.columnMetricsByKey.get(cellCoord.cellKey);
		const rowMetric = params.rowMetricsByKey.get(cellCoord.rowId);

		if (!columnMetric || !rowMetric) {
			return;
		}

		const requiredHeight = clampSheetRowHeight(getSheetCellTextRequiredRowHeight({
			columnWidth: columnMetric.width,
			fontSize: params.fontSize,
			// Overflow-eligible text draws as one unwrapped line, so its row
			// height must not be measured with column-width wrapping
			singleLine: canSheetCanvasCellTextOverflow(cell),
			text,
		}));

		const plannedHeight = Number(rows[cellCoord.rowId]?.height || rowMetric.height);

		if (requiredHeight <= plannedHeight) {
			return;
		}

		rows[cellCoord.rowId] = {
			...(rows[cellCoord.rowId] || {}),
			height: requiredHeight,
		};
		changed = true;
	});

	if (!changed) {
		return null;
	}

	return {
		after: {
			rows: JSON.stringify(rows),
		},
		before: {
			rows: JSON.stringify(params.designRows || {}),
		},
	};
}

/*
 * Return the read-only tag position used by DataTable-backed Sheet cells.
 */
function getSheetDataTableReadOnlyTagPosition(params: {
	columnMetric?: SheetColumnMetric | null;
	placeInsideCell?: boolean;
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
	const top = params.scrollTop + getSheetCanvasRowDisplayTop(params.rowMetric, params.scrollTop) + (params.placeInsideCell ? 0 : -22);

	return {
		isStickyLeft,
		left: left + 1,
		rowWidth: params.rowWidth,
		top: top + 1.5,
		width: params.columnMetric.width,
	} satisfies DataTableLocalEditorPosition;
}

/*
 * Return the floating formula error position for one selected Sheet cell.
 */
function getSheetFormulaErrorOverlayPosition(params: {
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
	const top = params.scrollTop + getSheetCanvasRowDisplayTop(params.rowMetric, params.scrollTop) + params.rowMetric.height + 1;
	const availableWidth = Math.max(220, params.rowWidth - left - 8);
	const width = Math.min(Math.max(280, params.columnMetric.width), availableWidth);

	return {
		isStickyLeft,
		left,
		rowWidth: params.rowWidth,
		top,
		width,
	} satisfies DataTableLocalEditorPosition;
}

/*
 * Render the selected Sheet formula error reason as floating text.
 */
function SheetFormulaErrorOverlay(p: SheetFormulaErrorOverlayState) {
	return (
		<DataTableLocalEditorContainer position={p.position}>
			<div
				className="bg_contrast cl_err shadow_light px_10 pt_10 pb_12 ft_tn lh_2 noclick"
				data-sheet-formula-error-overlay="true"
				style={{
					maxWidth: p.position.width,
					overflowWrap: 'break-word',
					whiteSpace: 'normal',
					width: 'max-content',
				}}
			>
				{p.message}
			</div>
		</DataTableLocalEditorContainer>
	);
}

/*
 * Return whether one DataTable-backed Sheet cell is the first cell inside its region.
 */
function isSheetDataTableRegionFirstCell(target: SheetDataTableCellEditTarget) {
	const regionStartRowIndex = Number(target.region.startRowIndex || 0);
	const regionStartColumnIndex = Number(target.region.startColumnIndex || 0);

	return target.rowIndex === regionStartRowIndex && target.columnIndex === regionStartColumnIndex;
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
		const hasStyle = sheetCanvasStyleHasContent(range.style);

		if (!hasStyle) {
			return;
		}

		maxRowIndex = Math.max(maxRowIndex, Math.min(params.loadedRowCount, Number(range.endRowIndex || 0)));
		maxColumnIndex = Math.max(maxColumnIndex, Number(range.endColumnIndex || 0));
	});

	const lastColumnIndex = (params.columns.at(-1)?.column as SheetCanvasColumn | undefined)?.sheetColumnIndex || 0;

	if (sheetCanvasStyleHasContent(params.design.defaultCellStyle || {})) {
		maxRowIndex = Math.max(maxRowIndex, params.loadedRowCount);
		maxColumnIndex = Math.max(maxColumnIndex, lastColumnIndex);
	}

	params.columns.forEach((metric) => {
		const canvasColumn = metric.column as SheetCanvasColumn;
		const columnStyle = parseSheetJSONObject(params.design.columns?.[String(canvasColumn.sheetColumnIndex)]?.style, {});

		if (sheetCanvasStyleHasContent(columnStyle)) {
			maxRowIndex = Math.max(maxRowIndex, params.loadedRowCount);
			maxColumnIndex = Math.max(maxColumnIndex, canvasColumn.sheetColumnIndex);
		}
	});

	Object.entries(params.design.rows || {}).forEach(([rowKey, rowDesign]) => {
		const rowIndex = Math.max(0, Math.floor(Number(rowKey)));
		const rowStyle = parseSheetJSONObject(rowDesign?.style, {});

		if (rowIndex > 0 && rowIndex <= params.loadedRowCount && sheetCanvasStyleHasContent(rowStyle)) {
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
 * Return a browser canvas context for measuring the inline editor text.
 */
function getSheetCanvasEditorTextMeasureContext() {
	if (typeof globalThis.document === 'undefined') {
		return null;
	}

	return globalThis.document.createElement('canvas').getContext('2d');
}

/*
 * Return the font size that the inline Sheet editor should inherit from its source cell.
 */
function getSheetCanvasEditorFontSize(cell?: SheetCanvasCell | null) {
	return getSheetCanvasStyleFontSize(cell?.style) || SHEET_KEYBOARD_DEFAULT_FONT_SIZE;
}

/*
 * Return the canvas font declaration used for measuring one inline editor value.
 */
function getSheetCanvasEditorMeasureFont(fontSize: number) {
	return `${Math.max(1, fontSize)}px ${SHEET_EDITOR_OVERFLOW_FONT_FAMILY}`;
}

/*
 * Return the editor width needed to display one draft value on a single line.
 */
function getSheetCanvasEditorDraftRequiredWidth(draftValue: string, fontSize: number) {
	const text = String(draftValue || '');

	if (!text || /\r?\n/.test(text)) {
		return 0;
	}

	const ctx = getSheetCanvasEditorTextMeasureContext();

	if (ctx) {
		ctx.font = getSheetCanvasEditorMeasureFont(fontSize);
		return Math.ceil(ctx.measureText(text).width + SHEET_EDITOR_OVERFLOW_PADDING_X * 2);
	}

	return Math.ceil(text.length * Math.max(1, fontSize) * 0.55 + SHEET_EDITOR_OVERFLOW_PADDING_X * 2);
}

/*
 * Return the editable cell width expanded across neighboring Sheet cells.
 */
function getSheetCanvasEditorOverflowWidth(params: {
	cellLookup?: Map<string, SheetCanvasCell> | null;
	columnMetric: SheetColumnMetric;
	columnMetrics?: SheetColumnMetric[] | null;
	editState: SheetUIEditState;
}) {
	const sourceCell = params.cellLookup?.get(getSheetCellKey(params.editState.rowId, params.editState.cellKey));

	if (sourceCell?.dataTableDisplay) {
		return params.columnMetric.width;
	}

	const fontSize = getSheetCanvasEditorFontSize(sourceCell);
	const requiredWidth = getSheetCanvasEditorDraftRequiredWidth(params.editState.draftValue, fontSize);
	if (requiredWidth <= params.columnMetric.width) {
		return params.columnMetric.width;
	}

	const columnMetrics = params.columnMetrics || [];
	const sourceIndex = columnMetrics.findIndex((metric) => {
		return getSheetCanvasCellKeyForColumnMetric(metric) === params.editState.cellKey;
	});

	if (sourceIndex < 0) {
		return params.columnMetric.width;
	}

	let width = params.columnMetric.width;
	let previousColumnIndex = params.columnMetric.columnIndex;

	for (let index = sourceIndex + 1; index < columnMetrics.length && width < requiredWidth; index += 1) {
		const nextMetric = columnMetrics[index];

		if (!nextMetric || nextMetric.columnIndex !== previousColumnIndex + 1) {
			break;
		}

		width += nextMetric.width;
		previousColumnIndex = nextMetric.columnIndex;
	}

	return width;
}

/*
 * Return the current editor overlay position for the active canvas cell.
 */
function getSheetCanvasEditorPosition(params: {
	cellLookup?: Map<string, SheetCanvasCell> | null;
	columnMetricsByKey: Map<string, SheetColumnMetric>;
	columnMetrics?: SheetColumnMetric[] | null;
	editState?: SheetUIEditState | null;
	mergedRanges?: SheetMergedRangeObj[] | null;
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

	// Editing a merge anchor spans the editor over the whole merged area
	const editRowIndex = Math.floor(Number(params.editState.rowId || 0));
	const editColumnIndex = Math.floor(Number(params.editState.cellKey || 0));
	const merge = params.mergedRanges?.length && editRowIndex && editColumnIndex
		? getSheetMergedRangeAtCell(params.mergedRanges, editRowIndex, editColumnIndex)
		: null;

	let mergeWidth = 0;
	let mergeHeight = 0;
	if (merge) {
		for (let columnIndex = merge.startColumnIndex; columnIndex <= merge.endColumnIndex; columnIndex += 1) {
			mergeWidth += params.columnMetricsByKey.get(String(columnIndex))?.width || 0;
		}
		for (let rowIndex = merge.startRowIndex; rowIndex <= merge.endRowIndex; rowIndex += 1) {
			mergeHeight += params.rowMetricsByKey.get(String(rowIndex))?.height || 0;
		}
	}

	return {
		fontSize: getSheetCanvasEditorFontSize(params.cellLookup?.get(getSheetCellKey(params.editState.rowId, params.editState.cellKey))),
		height: merge && mergeHeight ? mergeHeight : rowMetric.height,
		left: getSheetCanvasColumnDisplayLeft(columnMetric, params.scrollLeft, params.stickyColumnCount),
		top: getSheetCanvasRowDisplayTop(rowMetric, params.scrollTop),
		width: merge && mergeWidth ? mergeWidth : getSheetCanvasEditorOverflowWidth({
			cellLookup: params.cellLookup,
			columnMetric,
			columnMetrics: params.columnMetrics,
			editState: params.editState,
		}),
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
 * Return the cell target and selected-cell map represented by a context-menu pointer hit.
 */
function getSheetCanvasContextMenuHitTarget(params: {
	columnMetrics: SheetColumnMetric[];
	headerSelection?: SheetHeaderSelectionState | null;
	hit: SheetCanvasPointerHit;
	rowMetrics: SheetRowMetric[];
	rowIds: string[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
}) {
	if (params.hit.cell) {
		const selectedCell = {
			cellKey: params.hit.cell.cellKey,
			rowId: params.hit.cell.rowId,
		};
		const renderKey = getSheetCellKey(selectedCell.rowId, selectedCell.cellKey);
		const selectedMap = params.selectedCellKeyMap?.[renderKey]
			? params.selectedCellKeyMap
			: getGridSelectedCellKeyMapFromCells([selectedCell]);

		return {
			cell: params.hit.cell,
			headerSelection: null,
			selectedCell,
			selectedCellKeyMap: selectedMap,
		};
	}

	const columnMetric = params.hit.columnHeader?.columnMetric || params.hit.columnResize?.columnMetric || null;
	if (columnMetric) {
		const rowMetric = params.rowMetrics[0];
		const rowId = params.rowIds[0] || rowMetric?.rowKey;
		const cellKey = getSheetCanvasCellKeyForColumnMetric(columnMetric);

		if (!rowMetric || !rowId || !cellKey) {
			return null;
		}

		const selectedCell = {
			cellKey,
			rowId,
		};
		const renderKey = getSheetCellKey(selectedCell.rowId, selectedCell.cellKey);
		const useCurrentSelection = Boolean(
			params.headerSelection?.type === 'COLUMN' &&
				params.headerSelection.cellKeys.includes(cellKey) &&
				params.selectedCellKeyMap?.[renderKey],
		);
		const selectedCellKeyMap = useCurrentSelection && params.selectedCellKeyMap
			? params.selectedCellKeyMap
			: getGridSelectedCellKeyMapFromCells(getSheetCanvasSelectedCellsForColumns({
				cellKeys: [cellKey],
				rowIds: params.rowIds,
			}));

		return {
			cell: {
				cellKey,
				columnMetric,
				rowId,
				rowMetric,
			},
			headerSelection: useCurrentSelection && params.headerSelection
				? params.headerSelection
				: {
					cellKeys: [cellKey],
					type: 'COLUMN' as const,
				},
			selectedCell,
			selectedCellKeyMap,
		};
	}

	const rowMetric = params.hit.rowHeader?.rowMetric || params.hit.rowResize?.rowMetric || null;
	if (rowMetric) {
		const columnMetric = params.columnMetrics[0];
		const cellKey = columnMetric ? getSheetCanvasCellKeyForColumnMetric(columnMetric) : '';
		const rowId = rowMetric.rowKey;

		if (!columnMetric || !cellKey || !rowId) {
			return null;
		}

		const selectedCell = {
			cellKey,
			rowId,
		};
		const renderKey = getSheetCellKey(selectedCell.rowId, selectedCell.cellKey);
		const useCurrentSelection = Boolean(
			params.headerSelection?.type === 'ROW' &&
				params.headerSelection.rowIds.includes(rowId) &&
				params.selectedCellKeyMap?.[renderKey],
		);
		const selectedCellKeyMap = useCurrentSelection && params.selectedCellKeyMap
			? params.selectedCellKeyMap
			: getGridSelectedCellKeyMapFromCells(getSheetCanvasSelectedCellsForRows({
				columns: params.columnMetrics,
				rowIds: [rowId],
			}));

		return {
			cell: {
				cellKey,
				columnMetric,
				rowId,
				rowMetric,
			},
			headerSelection: useCurrentSelection && params.headerSelection
				? params.headerSelection
				: {
					rowIds: [rowId],
					type: 'ROW' as const,
				},
			selectedCell,
			selectedCellKeyMap,
		};
	}

	return null;
}

/*
 * Return the cursor style for one Sheet pointer hit target.
 */
function getSheetCanvasPointerCursor(hit: SheetCanvasPointerHit, disabled?: boolean, hasProfileLink?: boolean) {
	if (disabled) {
		return '';
	}

	if (hit.columnResize) {
		return 'col-resize';
	}

	if (hit.rowResize) {
		return 'row-resize';
	}

	if (hasProfileLink) {
		return 'pointer';
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
 * Return the one-based bounds of one selected-cells list, or null.
 */
function getSheetSelectedCellsBounds(cells: Array<{ cellKey: string; rowId: string }>): SheetMergedRangeObj | null {
	let startRowIndex = 0;
	let endRowIndex = 0;
	let startColumnIndex = 0;
	let endColumnIndex = 0;

	cells.forEach((cell) => {
		const rowIndex = Math.floor(Number(cell.rowId || 0));
		const columnIndex = Math.floor(Number(cell.cellKey || 0));
		if (!rowIndex || !columnIndex) {
			return;
		}

		startRowIndex = startRowIndex ? Math.min(startRowIndex, rowIndex) : rowIndex;
		endRowIndex = Math.max(endRowIndex, rowIndex);
		startColumnIndex = startColumnIndex ? Math.min(startColumnIndex, columnIndex) : columnIndex;
		endColumnIndex = Math.max(endColumnIndex, columnIndex);
	});

	if (!startRowIndex || !startColumnIndex) {
		return null;
	}

	return { startRowIndex, startColumnIndex, endRowIndex, endColumnIndex };
}

/*
 * Return the canvas pixel point of the selection's bottom-right corner where
 * the fill handle dot renders, or null when that corner is not rendered.
 */
function getSheetCanvasFillHandlePoint(params: {
	bounds: SheetMergedRangeObj;
	columnMetrics: SheetColumnMetric[];
	rowMetrics: SheetRowMetric[];
	scrollLeft: number;
	scrollTop: number;
	stickyColumnCount: number;
}) {
	const rowMetric = params.rowMetrics.find((metric) => Math.floor(Number(metric.rowKey || 0)) === params.bounds.endRowIndex);
	const columnMetric = params.columnMetrics.find((metric) => {
		const canvasColumn = metric.column as SheetCanvasColumn;
		return Number(canvasColumn.sheetColumnIndex || metric.column.key || 0) === params.bounds.endColumnIndex;
	});

	if (!rowMetric || !columnMetric) {
		return null;
	}

	return {
		x: getSheetCanvasColumnDisplayRight(columnMetric, params.scrollLeft, params.stickyColumnCount),
		y: getSheetCanvasRowDisplayBottom(rowMetric, params.scrollTop),
	};
}

/*
 * Return whether one pointer event grabs the selection's fill handle dot.
 */
function isSheetCanvasFillHandleHit(params: {
	clientX: number;
	clientY: number;
	point: { x: number; y: number };
	scrollNode: HTMLDivElement | null;
}) {
	const rect = params.scrollNode?.getBoundingClientRect();

	if (!rect) {
		return false;
	}

	const x = params.clientX - rect.left;
	const y = params.clientY - rect.top;

	return Math.abs(x - params.point.x) <= SHEET_CANVAS_FILL_HANDLE_HIT_SIZE &&
		Math.abs(y - params.point.y) <= SHEET_CANVAS_FILL_HANDLE_HIT_SIZE;
}

/*
 * Return the fill target range for one pointer cell during a fill-handle
 * drag, clamped to the dominant drag axis like spreadsheet fill handles, or
 * null while the pointer stays inside the source selection.
 */
function getSheetFillTargetRange(
	source: SheetMergedRangeObj,
	pointerRowIndex: number,
	pointerColumnIndex: number,
): SheetMergedRangeObj | null {
	const downDistance = pointerRowIndex - source.endRowIndex;
	const upDistance = source.startRowIndex - pointerRowIndex;
	const rightDistance = pointerColumnIndex - source.endColumnIndex;
	const leftDistance = source.startColumnIndex - pointerColumnIndex;
	const rowDistance = Math.max(downDistance, upDistance, 0);
	const columnDistance = Math.max(rightDistance, leftDistance, 0);

	if (!rowDistance && !columnDistance) {
		return null;
	}

	if (rowDistance >= columnDistance) {
		return downDistance >= upDistance
			? {
				endColumnIndex: source.endColumnIndex,
				endRowIndex: pointerRowIndex,
				startColumnIndex: source.startColumnIndex,
				startRowIndex: source.endRowIndex + 1,
			}
			: {
				endColumnIndex: source.endColumnIndex,
				endRowIndex: source.startRowIndex - 1,
				startColumnIndex: source.startColumnIndex,
				startRowIndex: pointerRowIndex,
			};
	}

	return rightDistance >= leftDistance
		? {
			endColumnIndex: pointerColumnIndex,
			endRowIndex: source.endRowIndex,
			startColumnIndex: source.endColumnIndex + 1,
			startRowIndex: source.startRowIndex,
		}
		: {
			endColumnIndex: source.startColumnIndex - 1,
			endRowIndex: source.endRowIndex,
			startColumnIndex: pointerColumnIndex,
			startRowIndex: source.startRowIndex,
		};
}

/*
 * Return the merge ranges to add for the requested merge mode.
 */
function getSheetMergeRangesForMode(bounds: SheetMergedRangeObj, mode: SheetContextMenuMergeMode): SheetMergedRangeObj[] {
	if (mode === 'all') {
		return [bounds];
	}

	if (mode === 'vertical') {
		if (bounds.endRowIndex <= bounds.startRowIndex) {
			return [];
		}

		const ranges: SheetMergedRangeObj[] = [];
		for (let columnIndex = bounds.startColumnIndex; columnIndex <= bounds.endColumnIndex; columnIndex++) {
			ranges.push({
				startRowIndex: bounds.startRowIndex,
				startColumnIndex: columnIndex,
				endRowIndex: bounds.endRowIndex,
				endColumnIndex: columnIndex,
			});
		}

		return ranges;
	}

	if (bounds.endColumnIndex <= bounds.startColumnIndex) {
		return [];
	}

	const ranges: SheetMergedRangeObj[] = [];
	for (let rowIndex = bounds.startRowIndex; rowIndex <= bounds.endRowIndex; rowIndex++) {
		ranges.push({
			startRowIndex: rowIndex,
			startColumnIndex: bounds.startColumnIndex,
			endRowIndex: rowIndex,
			endColumnIndex: bounds.endColumnIndex,
		});
	}

	return ranges;
}

/*
 * Return whether a merge action can run for the context-menu target.
 */
function canApplySheetContextMenuMergeMode(target: SheetContextMenuTarget, mode: SheetContextMenuMergeMode) {
	if (mode === 'all') {
		return target.canMergeCellsAll ?? target.canMergeCells ?? false;
	}

	if (mode === 'vertical') {
		return target.canMergeCellsVertically ?? false;
	}

	return target.canMergeCellsHorizontally ?? false;
}

/*
 * Return the cell target used by the Sheet context menu.
 */
function getSheetCanvasContextMenuTarget(params: {
	canOpenDataTable: boolean;
	canPopulateFromDataTable: boolean;
	canRemoveCellsFromDataTable: boolean;
	cell: SheetCanvasHitCell;
	cellLookup: Map<string, SheetCanvasCell>;
	/* Region cells derive their value type from the DataTable column field type */
	designCellsByDataTableId?: Map<string, Map<string, { fieldType?: string | null }>> | null;
	disabled?: boolean;
	effectiveCellsByCoord: Map<string, SheetCellGQL>;
	mergedRanges?: SheetMergedRangeObj[] | null;
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
	const dataTableRoute = getSheetRegionSourceDataTableRoute(dataTableRegion?.source || null);
	const selectedCells = params.selectedCellKeyMap && params.selectedCellKeyMap[renderKey]
		? getGridSelectedCellsFromKeyMap(params.selectedCellKeyMap)
		: [{
			cellKey: params.cell.cellKey,
			rowId: params.cell.rowId,
		}];
	const containsEmptyDataTableRegionCell = selectedCells.some((cell) => {
		const selectedRowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
		const selectedColumnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

		if (!selectedRowIndex || !selectedColumnIndex) {
			return false;
		}

		if (!getSheetDataTableRegionAtCell(selectedRowIndex, selectedColumnIndex, params.regions)) {
			return false;
		}

		const sourceCell = params.effectiveCellsByCoord.get(getSheetCanvasCoordKey(selectedRowIndex, selectedColumnIndex));

		return sourceCell?.sourceType !== 'REGION_GENERATED' ||
			!sourceCell.region?.sourceRowId ||
			!sourceCell.region?.sourceCellKey;
	});
	const canModifySheet = !params.disabled;
	const mergeBounds = getSheetSelectedCellsBounds(selectedCells);
	const mergeBoundsIntersectRegion = Boolean(
		mergeBounds &&
			(params.regions || []).some((region) => {
				const regionRect = getSheetRegionGridRect(region);
				return Boolean(
					regionRect &&
						regionRect.startRowIndex <= mergeBounds.endRowIndex &&
						regionRect.endRowIndex >= mergeBounds.startRowIndex &&
						regionRect.startColumnIndex <= mergeBounds.endColumnIndex &&
						regionRect.endColumnIndex >= mergeBounds.startColumnIndex,
				);
			}),
	);
	const mergeBoundsSpanMultipleCells = Boolean(
		mergeBounds &&
			(mergeBounds.endRowIndex > mergeBounds.startRowIndex || mergeBounds.endColumnIndex > mergeBounds.startColumnIndex),
	);
	const mergeBoundsSpanMultipleRows = Boolean(
		mergeBounds &&
			mergeBounds.endRowIndex > mergeBounds.startRowIndex,
	);
	const mergeBoundsSpanMultipleColumns = Boolean(
		mergeBounds &&
			mergeBounds.endColumnIndex > mergeBounds.startColumnIndex,
	);
	const canMergeSelection = canModifySheet && !mergeBoundsIntersectRegion;

	return {
		canEdit: canModifySheet && !containsEmptyDataTableRegionCell,
		canEditStructure: canModifySheet,
		canFormatCells: canModifySheet,
		canMergeCells: canMergeSelection && mergeBoundsSpanMultipleCells,
		canMergeCellsAll: canMergeSelection && mergeBoundsSpanMultipleCells,
		canMergeCellsHorizontally: canMergeSelection && mergeBoundsSpanMultipleColumns,
		canMergeCellsVertically: canMergeSelection && mergeBoundsSpanMultipleRows,
		canUnmergeCells: canModifySheet && Boolean(
			mergeBounds &&
				(params.mergedRanges || []).some((merge) => sheetMergedRangesIntersect(merge, mergeBounds)),
		),
		canOpenDataTable: params.canOpenDataTable && Boolean(dataTableRoute),
		canPopulateFromDataTable: params.canPopulateFromDataTable,
		canRemoveCellsFromDataTable: params.canRemoveCellsFromDataTable,
		bold: typeof targetCell?.style?.bold === 'boolean' ? targetCell.style.bold : null,
		cells: selectedCells,
		cellKey: params.cell.cellKey,
		dataTableId: dataTableRegion?.source?.dataTableId ? String(dataTableRegion.source.dataTableId) : null,
		dataTableRegion,
		dataTableRegionId: dataTableRegion?.id ? String(dataTableRegion.id) : null,
		dataTableRoute,
		disableMarkdown: typeof targetCell?.style?.disableMarkdown === 'boolean' ? targetCell.style.disableMarkdown : null,
		displayValue: targetCell?.displayValue || '',
		fillColor: targetCell?.style ? getSheetCanvasStyleColor(targetCell.style, 'fillColor') : null,
		fontSize: targetCell?.style ? getSheetCanvasStyleFontSize(targetCell.style) : null,
		italic: typeof targetCell?.style?.italic === 'boolean' ? targetCell.style.italic : null,
		rawValue: targetCell?.draftValue || '',
		rowId: params.cell.rowId,
		strikethrough: typeof targetCell?.style?.strikethrough === 'boolean' ? targetCell.style.strikethrough : null,
		textColor: targetCell?.style ? getSheetCanvasStyleColor(targetCell.style, 'textColor') : null,
		underline: typeof targetCell?.style?.underline === 'boolean' ? targetCell.style.underline : null,
		valueType: getSheetContextMenuTargetValueType({
			dataTableRegion,
			designCellsByDataTableId: params.designCellsByDataTableId,
			displayValue: targetCell?.displayValue,
			effectiveCell: rowIndex && columnIndex
				? params.effectiveCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex))
				: null,
		}),
	} satisfies SheetContextMenuTarget;
}

/*
 * Return the detected value type for one context-menu target cell. Cells
 * inside a DataTable region type by their column's field type (refined to a
 * whole number when the stored numeric value is one); plain cells classify
 * by their stored typed columns or display text.
 */
function getSheetContextMenuTargetValueType(params: {
	dataTableRegion?: SheetRegionGQL | null;
	designCellsByDataTableId?: Map<string, Map<string, { fieldType?: string | null }>> | null;
	displayValue?: string | null;
	effectiveCell?: SheetCellGQL | null;
}) {
	const { dataTableRegion, designCellsByDataTableId, displayValue, effectiveCell } = params;
	const regionFieldType = dataTableRegion && effectiveCell?.sourceCellKey
		? designCellsByDataTableId
			?.get(String(dataTableRegion.source?.dataTableId || ''))
			?.get(String(effectiveCell.sourceCellKey))?.fieldType
		: null;
	const fieldValueType = getSheetCellValueTypeForDataTableFieldType(regionFieldType);

	if (fieldValueType === 'CELL_FLOAT' && effectiveCell?.numberValue !== null && effectiveCell?.numberValue !== undefined) {
		return Number.isInteger(Number(effectiveCell.numberValue)) ? 'CELL_INT' : 'CELL_FLOAT';
	}

	return fieldValueType || getSheetCellValueType(effectiveCell, displayValue);
}

/*
 * Return the Sheet format target represented by the current keyboard selection.
 */
function getSheetKeyboardFormatTarget(params: {
	cellLookup: Map<string, SheetCanvasCell>;
	columnMetricsByKey: Map<string, SheetColumnMetric>;
	designCellsByDataTableId?: Map<string, Map<string, { fieldType?: string | null }>> | null;
	disabled?: boolean;
	effectiveCellsByCoord: Map<string, SheetCellGQL>;
	regions?: SheetRegionGQL[] | null;
	rowMetricsByKey: Map<string, SheetRowMetric>;
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const selectedCells = getGridSelectedCellsFromKeyMap(params.selectedCellKeyMap);
	const activeCell = params.selectedCellState || selectedCells[0];

	if (!activeCell) {
		return null;
	}

	const columnMetric = params.columnMetricsByKey.get(activeCell.cellKey);
	const rowMetric = params.rowMetricsByKey.get(activeCell.rowId);

	if (!columnMetric || !rowMetric) {
		return null;
	}

	return getSheetCanvasContextMenuTarget({
		canPopulateFromDataTable: false,
		canOpenDataTable: false,
		canRemoveCellsFromDataTable: false,
		cell: {
			cellKey: activeCell.cellKey,
			columnMetric,
			rowId: activeCell.rowId,
			rowMetric,
		},
		cellLookup: params.cellLookup,
		designCellsByDataTableId: params.designCellsByDataTableId,
		disabled: params.disabled,
		effectiveCellsByCoord: params.effectiveCellsByCoord,
		regions: params.regions,
		selectedCellKeyMap: selectedCells.length ? params.selectedCellKeyMap : null,
		selectedCellState: params.selectedCellState,
	});
}

/*
 * Return the whole-column/row format target when the formatted cells cover
 * entire selected header lines. Whole-line formatting persists as ONE sheet
 * design patch (line styles merge under per-cell styles at paint time) instead
 * of one cell write per covered coordinate — critical when a data table
 * region fills the line with thousands of materialized cells.
 */
function getSheetFullLineFormatTarget(params: {
	columnCount: number;
	headerSelection?: SheetHeaderSelectionState | null;
	rowCount: number;
	targetCellCount: number;
}): { lineIndexes: number[]; type: 'COLUMN' | 'ROW' } | null {
	const headerSelection = params.headerSelection;

	if (headerSelection?.type === 'COLUMN') {
		const lineIndexes = headerSelection.cellKeys
			.map((cellKey) => getSheetCanvasColumnIndexFromKey(cellKey))
			.filter((index): index is number => Boolean(index));

		return lineIndexes.length && params.targetCellCount === lineIndexes.length * params.rowCount
			? { lineIndexes, type: 'COLUMN' }
			: null;
	}

	if (headerSelection?.type === 'ROW') {
		const lineIndexes = headerSelection.rowIds
			.map((rowId) => getSheetCanvasRowIndexFromId(rowId))
			.filter((index): index is number => Boolean(index));

		return lineIndexes.length && params.targetCellCount === lineIndexes.length * params.columnCount
			? { lineIndexes, type: 'ROW' }
			: null;
	}

	return null;
}

/*
 * Return the data table populate request represented by a Sheet context-menu target.
 */
function getSheetInsertViewTableRequest(target: SheetContextMenuTarget): SheetInsertViewTableRequest | null {
	let startRowIndex = Number.POSITIVE_INFINITY;
	let startColumnIndex = Number.POSITIVE_INFINITY;

	target.cells.forEach((cell) => {
		const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

		if (!rowIndex || !columnIndex) {
			return;
		}

		startRowIndex = Math.min(startRowIndex, rowIndex);
		startColumnIndex = Math.min(startColumnIndex, columnIndex);
	});

	if (!Number.isFinite(startRowIndex) || !Number.isFinite(startColumnIndex)) {
		return null;
	}

	return {
		dataTableId: target.dataTableId || null,
		region: target.dataTableRegion || null,
		regionId: target.dataTableRegionId || null,
		startColumnIndex: target.dataTableRegion?.startColumnIndex || startColumnIndex,
		startRowIndex: target.dataTableRegion?.startRowIndex || startRowIndex,
	};
}

/*
 * Return the GraphQL structure edit represented by one context-menu action.
 */
function getSheetStructureOperationFromContextMenuAction(action: SheetContextMenuStructureAction): SheetStructureOperationEnum {
	switch (action) {
		case 'DELETE_COLUMN':
			return 'DELETE_COLUMN';
		case 'DELETE_ROW':
			return 'DELETE_ROW';
		case 'INSERT_COLUMN_LEFT':
			return 'INSERT_COLUMN_LEFT';
		case 'INSERT_ROW_ABOVE':
		default:
			return 'INSERT_ROW_ABOVE';
	}
}

/*
 * Return the row or column index affected by one context-menu structure action.
 */
function getSheetStructureIndexFromContextMenuTarget(target: SheetContextMenuTarget, action: SheetContextMenuStructureAction) {
	return action === 'DELETE_COLUMN' || action === 'INSERT_COLUMN_LEFT'
		? getSheetCanvasColumnIndexFromKey(target.cellKey)
		: getSheetCanvasRowIndexFromId(target.rowId);
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
	const pendingCellEdits = useAtomValue(p.stateAtoms.pendingCellEditsByCoordAtom);
	const remotePendingCells = useAtomValue(p.stateAtoms.remotePendingCellsByCoordAtom);
	const pendingPreviewCellsByCoord = useMemo(() => {
		const next = new Map<string, SheetCellGQL>();
		pendingCellEdits.forEach((pendingEdit, coordKey) => {
			next.set(coordKey, pendingEdit.previewCell);
		});
		return next;
	}, [pendingCellEdits]);
	const pendingPreviewsRef = useRef(pendingPreviewCellsByCoord);
	/*
	 * Cells whose pending preview awaits a server-computed formula value get
	 * the animated loading outline.
	 */
	const loadingCellCoords = useMemo(() => {
		const coords: Array<{ rowIndex: number; columnIndex: number }> = [];
		pendingCellEdits.forEach((pendingEdit) => {
			const previewCell = pendingEdit.previewCell as SheetCellGQL & { __formulaLoading?: boolean };
			const rowIndex = Math.floor(Number(previewCell.rowIndex || 0));
			const columnIndex = Math.floor(Number(previewCell.columnIndex || 0));
			if (previewCell.__formulaLoading && rowIndex && columnIndex) {
				coords.push({ rowIndex, columnIndex });
			}
		});
		return coords;
	}, [pendingCellEdits]);
	const [localColumnWidths, setLocalColumnWidths] = useAtom(p.stateAtoms.localColumnWidthsAtom);
	const [localRowHeights, setLocalRowHeights] = useAtom(p.stateAtoms.localRowHeightsAtom);
	// Optimistic copy of the axis design maps from the latest local design
	// patch; line styles render instantly while the saved design round-trips
	// (mirrors the localColumnWidths pattern)
	const [localAxisDesign, setLocalAxisDesign] = useState<{
		columns?: Record<string, SheetAxisDesignObj>;
		rows?: Record<string, SheetAxisDesignObj>;
	}>({});
	const [resizeState, setResizeState] = useAtom(p.stateAtoms.resizeStateAtom);
	const [rowResizeState, setRowResizeState] = useAtom(p.stateAtoms.rowResizeStateAtom);
	const remoteSelections = p.remoteSelections;
	const presenceRoster = p.presenceRoster || [];
	const [hoveredCellState, setHoveredCellState] = useState<SheetUISelectedCellState | null>(null);
	const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
	const [formulaInputFocused, setFormulaInputFocused] = useState(false);
	const [colorPickerState, setColorPickerState] = useState<SheetColorPickerState | null>(null);
	const [displayRulesEditorState, setDisplayRulesEditorState] = useState<SheetDisplayRulesEditorState | null>(null);
	const dragSelectionRef = useRef<SheetCanvasDragSelectionState | null>(null);
	const fillDragStateRef = useRef<SheetCanvasFillDragState | null>(null);
	const fillDragRangeRef = useRef<SheetMergedRangeObj | null>(null);
	const [fillDragRange, setFillDragRange] = useState<SheetMergedRangeObj | null>(null);
	// Copied or cut source range; renders the marching-ants border until pasted or dismissed
	const [copySourceRange, setCopySourceRange] = useState<SheetMergedRangeObj | null>(null);

	// Sheet-coordinate bounds of the current selection, for the fill handle dot.
	// Cmd/Ctrl+click can punch holes in a selection; range-driven features (fill
	// handle, fill shortcuts) only run when the selection is one solid rectangle.
	const fillHandleBounds = useMemo(() => {
		if (p.disabled) {
			return null;
		}

		const selectedMap = getGridResolvedSelectedCellKeyMap({
			selectedCellKeyMap,
			selectedCellState,
		});
		const selectedCells = selectedMap ? getGridSelectedCellsFromKeyMap(selectedMap) : [];
		const bounds = selectedCells.length ? getSheetSelectedCellsBounds(selectedCells) : null;

		if (!bounds) {
			return null;
		}

		const boundsArea = (bounds.endRowIndex - bounds.startRowIndex + 1) * (bounds.endColumnIndex - bounds.startColumnIndex + 1);

		return selectedCells.length === boundsArea ? bounds : null;
	}, [p.disabled, selectedCellKeyMap, selectedCellState]);

	const openedDataTableCellPointerDownRef = useRef<SheetUISelectedCellState | null>(null);
	const colorPickerPointerDownInsideRef = useRef(false);
	const displayRulesEditorPointerDownInsideRef = useRef(false);
	const designRef = useRef(p.design);
	const localAxisDesignRef = useRef(localAxisDesign);
	const localColumnWidthsRef = useRef(localColumnWidths);
	const localRowHeightsRef = useRef(localRowHeights);
	const onUpdateSheetDesignRef = useRef(p.onUpdateSheetDesign);
	const resizeStateRef = useRef<SheetCanvasResizeState | null>(null);
	const rowResizeStateRef = useRef<SheetCanvasRowResizeState | null>(null);
	const committingEditorRef = useRef(false);
	const {
		pushUndoEntry: pushSheetUndoEntry,
		rebaseEntries: rebaseSheetUndoEntries,
		runApplyingHistory: runApplyingSheetHistory,
		takeRedoEntry: takeSheetRedoEntry,
		takeUndoEntry: takeSheetUndoEntry,
	} = useSheetUndoRedo();
	const runtimeRef = useRef<{
		calculatedCellsByCoord: Map<string, SheetCellGQL>;
		cellLookup: Map<string, SheetCanvasCell>;
		columnMetrics: SheetColumnMetric[];
		columnMetricsByKey: Map<string, SheetColumnMetric>;
		columnOffsets: number[];
		editBaseCellsByCoord: Map<string, SheetCellGQL>;
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

	pendingPreviewsRef.current = pendingPreviewCellsByCoord;
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
		if (!pendingCellEdits.size && !remotePendingCells.size) {
			return p.cellsByCoord;
		}

		const next = new Map(p.cellsByCoord);

		// Layering: confirmed < remote-pending < own-pending previews
		remotePendingCells.forEach((remotePending, key) => {
			next.set(key, remotePending.cell);
		});
		pendingCellEdits.forEach((pendingEdit, key) => {
			next.set(key, pendingEdit.previewCell);
		});

		return next;
	}, [pendingCellEdits, p.cellsByCoord, remotePendingCells]);
	// Edit-time base: confirmed + own pending only. Peer previews are unconfirmed
	// presentation hints — building an edit snapshot on one would capture the
	// peer's preview value into our own save and clobber or revert their edit
	const editBaseCellsByCoord = useMemo(() => {
		if (!pendingCellEdits.size) {
			return p.cellsByCoord;
		}

		const next = new Map(p.cellsByCoord);

		pendingCellEdits.forEach((pendingEdit, key) => {
			next.set(key, pendingEdit.previewCell);
		});

		return next;
	}, [pendingCellEdits, p.cellsByCoord]);
	const dataTablesById = useMemo(() => {
		return getSheetDataTablesById(p.dataTables);
	}, [p.dataTables]);
	const dataTableLabelsById = useMemo(() => {
		return getSheetRegionSourceLabelsById(p.dataTables, p.operation);
	}, [p.dataTables, p.operation]);
	const designCellsByDataTableId = useMemo(() => {
		return getSheetDataTableDesignCellsByTableId(p.dataTables);
	}, [p.dataTables]);
	const regionsById = useMemo(() => {
		return getSheetRegionsById(p.regions);
	}, [p.regions]);
	/*
	 * Merged cell ranges: an optimistic local override gives instant feedback
	 * for merge/unmerge actions until the saved design round-trips.
	 */
	const [optimisticMergedRanges, setOptimisticMergedRanges] = useState<SheetMergedRangeObj[] | null>(null);
	const designMergedRanges = useMemo(() => {
		return getSheetMergedRanges(p.design.metadata);
	}, [p.design.metadata]);
	const mergedRanges = optimisticMergedRanges || designMergedRanges;
	const mergedRangesRef = useRef(mergedRanges);
	mergedRangesRef.current = mergedRanges;

	useEffect(() => {
		// The saved design caught up to the optimistic merge state
		if (optimisticMergedRanges && JSON.stringify(designMergedRanges) === JSON.stringify(optimisticMergedRanges)) {
			setOptimisticMergedRanges(null);
		}
	}, [designMergedRanges, optimisticMergedRanges]);

	useEffect(() => {
		setOptimisticMergedRanges(null);
	}, [p.sheetId]);

	/*
	 * Return one cell remapped to its merge anchor when it sits inside a
	 * merged range; clicking or navigating into a merge targets the anchor.
	 */
	const remapSheetCellToMergeAnchor = useCallback((cell: SheetUISelectedCellState): SheetUISelectedCellState => {
		const merges = mergedRangesRef.current;
		if (!merges.length) {
			return cell;
		}

		const rowIndex = Math.floor(Number(cell.rowId || 0));
		const columnIndex = Math.floor(Number(cell.cellKey || 0));
		const merge = rowIndex && columnIndex ? getSheetMergedRangeAtCell(merges, rowIndex, columnIndex) : null;
		if (!merge || isSheetMergedRangeAnchor(merge, rowIndex, columnIndex)) {
			return cell;
		}

		return {
			cellKey: String(merge.startColumnIndex),
			rowId: String(merge.startRowIndex),
		};
	}, []);
	const sourceCellsByTargetKey = useMemo(() => {
		return getSourceDataTableCellsByTargetKey(p.sourceDataTableCells);
	}, [p.sourceDataTableCells]);
	/*
	 * Pending DataTable values derived from the unified pending-edit store;
	 * editor state and comparisons read the latest unsaved source value here.
	 */
	const optimisticDataTableValues = useMemo(() => {
		const next: Record<string, string | null> = {};
		pendingCellEdits.forEach((pendingEdit) => {
			const sourceKey = getSheetPendingEditDataTableSourceKey(pendingEdit);
			if (sourceKey) {
				next[sourceKey] = pendingEdit.dataTableTarget?.value ?? null;
			}
		});
		return next;
	}, [pendingCellEdits]);

	/*
	 * Apply DataTable source cell changes: build instant previews for every
	 * region coordinate mirroring each source cell and hand them to the
	 * unified save queue. Used by editor commits and undo/redo.
	 */
	const applySheetDataTableCellChanges = useCallback(async (
		changes: SheetDataTableCellHistoryChange[],
		direction: 'after' | 'before',
	) => {
		if (!changes.length) {
			return;
		}

		const edits = changes.flatMap((change) => {
			const dataTableId = String(change.target.dataTable.id || '');
			if (!dataTableId) {
				return [];
			}

			const value = change[direction];
			const sourceKey = getSheetDataTableSourceCellKey(dataTableId, change.target.sourceRowId, change.target.sourceCellKey);
			const designCell = designCellsByDataTableId.get(dataTableId)?.get(change.target.sourceCellKey) ||
				change.target.lookup.designCell || null;
			const valueFields = getSheetCellValueFieldsFromDataTableOptimisticValue(value, designCell);
			const previews: Array<{ coordKey: string; previewCell: SheetCellGQL }> = [];

			p.cellsByCoord.forEach((cell, coordKey) => {
				if (getSheetCellDataTableSourceKey(cell, regionsById) === sourceKey) {
					previews.push({
						coordKey,
						previewCell: {
							...cell,
							...valueFields,
						} as SheetCellGQL,
					});
				}
			});

			return [{
				cellKey: change.target.sourceCellKey,
				dataTableId,
				dataTableRowId: change.target.sourceRowId,
				organizationId: change.target.dataTable.organizationId || null,
				previews,
				target: change.target,
				value,
			}];
		});

		p.onBroadcastCellEdits?.(edits.flatMap((edit) => edit.previews));
		p.onSaveDataTableCellEdits(edits);
	}, [designCellsByDataTableId, p.cellsByCoord, p.onBroadcastCellEdits, p.onSaveDataTableCellEdits, regionsById]);

	const clearOptimisticDataTableValue = useCallback((sourceKey: string) => {
		p.onClearDataTablePendingEdits(sourceKey);
	}, [p.onClearDataTablePendingEdits]);
	const calculatedCellsByCoord = useMemo(() => {
		const next = new Map<string, SheetCellGQL>();

		effectiveCellsByCoord.forEach((cell, key) => {
			if (!sheetCellCanClientCalculateFormula(cell)) {
				next.set(key, cell);
				return;
			}

			next.set(key, getClientCalculatedSheetFormulaCell({
				cell,
				cellsByCoord: effectiveCellsByCoord,
				timeZone: p.timeZone,
			}));
		});

		return next;
	}, [effectiveCellsByCoord, p.timeZone]);

	// Style resolution reads the optimistic axis maps so line styles from a
	// just-applied design patch paint before the saved design round-trips
	const styleResolutionDesign = useMemo(() => {
		if (!localAxisDesign.columns && !localAxisDesign.rows) {
			return p.design;
		}

		return {
			...p.design,
			...(localAxisDesign.columns ? { columns: localAxisDesign.columns } : {}),
			...(localAxisDesign.rows ? { rows: localAxisDesign.rows } : {}),
		};
	}, [localAxisDesign, p.design]);

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
				const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
				const cell = calculatedCellsByCoord.get(coordKey) || effectiveCellsByCoord.get(coordKey) || null;
				const hasCell = Boolean(cell);
				const hasFormatting = isSheetCanvasFormattedEmptyCell({
					cell,
					columnIndex,
					design: styleResolutionDesign,
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
					design: styleResolutionDesign,
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
	}, [calculatedCellsByCoord, columnMetricsData.metrics, dataTablesById, designCellsByDataTableId, effectiveCellsByCoord, optimisticDataTableValues, p.disabled, p.ranges, p.timeZone, regionsById, rowMetricsData.metrics, sourceCellsByTargetKey, styleResolutionDesign, visibleRange.columnEnd, visibleRange.columnStart, visibleRange.rowEnd, visibleRange.rowStart]);
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
			cellLookup,
			columnMetricsByKey,
			columnMetrics: columnMetricsData.metrics,
			editState,
			mergedRanges,
			rowMetricsByKey,
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyColumnCount,
		});
	}, [cellLookup, columnMetricsByKey, columnMetricsData.metrics, editState, mergedRanges, rowMetricsByKey, scrollState.scrollLeft, scrollState.scrollTop, stickyColumnCount]);
	/*
	 * The resolved style of the cell being edited (design + ranges + pending
	 * preview), so the DOM editor mirrors the canvas cell instantly.
	 */
	const activeEditorCellStyle = useMemo(() => {
		if (!editState) {
			return null;
		}

		return cellLookup.get(getSheetCellKey(editState.rowId, editState.cellKey))?.style || null;
	}, [cellLookup, editState]);
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
	const displayRulesEditorPosition = useMemo(() => {
		if (!displayRulesEditorState) {
			return null;
		}

		return getSheetCanvasEditorPosition({
			columnMetricsByKey,
			editState: {
				cellKey: displayRulesEditorState.target.cellKey,
				draftValue: '',
				rowId: displayRulesEditorState.target.rowId,
			},
			rowMetricsByKey,
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyColumnCount,
		});
	}, [displayRulesEditorState, columnMetricsByKey, rowMetricsByKey, scrollState.scrollLeft, scrollState.scrollTop, stickyColumnCount]);
	/*
	 * The display rules saved for the editor target's value type, read from the
	 * resolved cell format (inherited line/range rules included) so the editor
	 * prefills with exactly what currently paints.
	 */
	const displayRulesEditorValue = useMemo(() => {
		const target = displayRulesEditorState?.target;

		if (!target?.valueType) {
			return null;
		}

		const canvasCell = cellLookup.get(getSheetCellKey(target.rowId, target.cellKey));

		return canvasCell?.format.displayRules?.[target.valueType] || null;
	}, [cellLookup, displayRulesEditorState]);
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

		if (!isSheetSelectEditorFieldType(activeDataTableFieldType) && !isDataTableDateEditorFieldType(activeDataTableFieldType) && !isDataTableInboundContactOpenLookup(activeDataTableEditTarget.lookup) && !isDataTableSiteLocationOpenLookup(activeDataTableEditTarget.lookup)) {
			return null;
		}

		const width = isDataTableDateEditorFieldType(activeDataTableFieldType)
			? DATA_TABLE_DATE_EDITOR_WIDTH
			: isDataTableInboundContactOpenLookup(activeDataTableEditTarget.lookup)
				? Math.max(editorPosition.width, DATA_TABLE_INBOUND_CONTACT_EDITOR_MIN_WIDTH)
				: isDataTableSiteLocationOpenLookup(activeDataTableEditTarget.lookup)
					? Math.max(editorPosition.width, DATA_TABLE_SITE_LOCATION_EDITOR_MIN_WIDTH)
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
			const optimisticKey = getSheetDataTableSourceCellKey(
				String(dataTableTarget.dataTable.id || ''),
				dataTableTarget.sourceRowId,
				dataTableTarget.sourceCellKey,
			);

			return {
				column: {
					...getDataTableSheetUIColumn(dataTableTarget.lookup.designCell),
					id: selectedCellState.cellKey,
					key: selectedCellState.cellKey,
				},
				error: null,
				value: getSheetEditorDraftValue(
					dataTableTarget.lookup.cell,
					dataTableTarget.lookup.designCell,
					optimisticDataTableValues[optimisticKey],
				),
			};
		}

		if (getSheetDataTableRegionAtCellFromMap(rowIndex, columnIndex, regionsById)) {
			return {
				column,
				error: null,
				value: '',
			};
		}

		const sourceCell = effectiveCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex));

		return {
			column,
			error: null,
			value: getSheetCanvasCellDraftValue(sourceCell),
		};
	}, [activeEditorColumn, columnMetricsByKey, dataTablesById, designCellsByDataTableId, editState, effectiveCellsByCoord, optimisticDataTableValues, regionsById, selectedCellState, sourceCellsByTargetKey]);
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

		if (isSheetDataTableRegionCellWithoutEditTarget(rowIndex, columnIndex, regionsById, dataTableTarget)) {
			return false;
		}

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
			placeInsideCell: isSheetDataTableRegionFirstCell(target),
			rowMetric: rowMetricsByKey.get(selectedCellState.rowId),
			rowWidth: Math.max(totalWidth, viewportWidth),
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyColumnCount,
		});
	}, [columnMetricsByKey, dataTablesById, designCellsByDataTableId, editState, effectiveCellsByCoord, p.disabled, regionsById, rowMetricsByKey, scrollState.scrollLeft, scrollState.scrollTop, selectedCellState, sourceCellsByTargetKey, stickyColumnCount, totalWidth, viewportWidth]);
	const selectedFormulaErrorOverlay = useMemo<SheetFormulaErrorOverlayState | null>(() => {
		if (!selectedCellState || editState) {
			return null;
		}

		const rowIndex = getSheetCanvasRowIndexFromId(selectedCellState.rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(selectedCellState.cellKey);
		if (!rowIndex || !columnIndex) {
			return null;
		}

		const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
		const formulaError = (calculatedCellsByCoord.get(coordKey) || effectiveCellsByCoord.get(coordKey))?.formula?.error;
		const message = formulaError?.message?.trim();
		if (!message) {
			return null;
		}

		const position = getSheetFormulaErrorOverlayPosition({
			columnMetric: columnMetricsByKey.get(selectedCellState.cellKey),
			rowMetric: rowMetricsByKey.get(selectedCellState.rowId),
			rowWidth: Math.max(totalWidth, viewportWidth),
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
			stickyColumnCount,
		});
		if (!position) {
			return null;
		}

		return {
			message,
			position,
		};
	}, [calculatedCellsByCoord, columnMetricsByKey, editState, effectiveCellsByCoord, rowMetricsByKey, scrollState.scrollLeft, scrollState.scrollTop, selectedCellState, stickyColumnCount, totalWidth, viewportWidth]);
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
		localColumnWidthsRef.current = localColumnWidths;
		localRowHeightsRef.current = localRowHeights;
		onUpdateSheetDesignRef.current = p.onUpdateSheetDesign;
		resizeStateRef.current = resizeState;
		rowResizeStateRef.current = rowResizeState;
	});

	// A collaborator's structure op shifts coordinates without entering this
	// client's history: rebase both undo/redo stacks over the shift so older
	// entries keep targeting the right cells. Own structure ops skip this —
	// they push their own history entry, and undoing it restores the layout
	// older entries were recorded against.
	const appliedRemoteStructureShiftSeqRef = useRef(0);
	useEffect(() => {
		const shift = p.remoteStructureShift;

		if (!shift || shift.seq === appliedRemoteStructureShiftSeqRef.current) {
			return;
		}

		appliedRemoteStructureShiftSeqRef.current = shift.seq;
		rebaseSheetUndoEntries((entries) => {
			return applySheetStructureShiftToUndoEntries(entries, shift.operation, shift.index);
		});
	}, [p.remoteStructureShift, rebaseSheetUndoEntries]);

	useEffect(() => {
		runtimeRef.current = {
			calculatedCellsByCoord,
			cellLookup,
			columnMetrics: columnMetricsData.metrics,
			columnMetricsByKey,
			columnOffsets: columnMetricsData.offsets,
			editBaseCellsByCoord,
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

	/*
	 * The full sheet is loaded once through sheetView and held in memory, so
	 * scrolling requires no viewport fetches: the canvas just redraws the
	 * visible range from the in-memory cell map.
	 */

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
	 * Close the active editor for real selection changes unless the local dev keep-edit flag is enabled.
	 */
	const closeSheetCellEditorForSelection = useCallback((nextCell?: SheetUISelectedCellState | null) => {
		if (!keepEditModeForDev) {
			if (
				nextCell &&
				editState?.cellKey === nextCell.cellKey &&
				editState.rowId === nextCell.rowId
			) {
				return;
			}

			setEditState(null);
		}
	}, [editState?.cellKey, editState?.rowId, keepEditModeForDev]);

	const selectSheetCell = useCallback((cell_: SheetUISelectedCellState, selectedMap?: SheetUISelectedCellKeyMap | null) => {
		const cell = remapSheetCellToMergeAnchor(cell_);

		closeSheetCellEditorForSelection(cell);
		setFormulaInputFocused(false);
		setHeaderSelection(null);
		setSelectedCellState(cell);
		setSelectedCellKeyMap(selectedMap || getGridSelectedCellKeyMapFromCells([cell]));
		scrollCellIntoView(cell);
	}, [closeSheetCellEditorForSelection, remapSheetCellToMergeAnchor, scrollCellIntoView, setHeaderSelection]);

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

	/*
	 * Toggle one cell in or out of the current selection (Cmd/Ctrl+click).
	 * Removing the active cell hands the active state to another selected cell.
	 */
	const toggleSheetCellInSelection = useCallback((cell_: SheetUISelectedCellState) => {
		const cell = remapSheetCellToMergeAnchor(cell_);
		const currentMap = getGridResolvedSelectedCellKeyMap({
			selectedCellKeyMap,
			selectedCellState,
		}) || {};
		const nextMap = getGridSelectedCellKeyMapWithCellToggled(currentMap, cell);
		const toggledKey = getSheetCellKey(cell.rowId, cell.cellKey);

		closeSheetCellEditorForSelection();
		setHeaderSelection(null);

		if (nextMap[toggledKey]) {
			// Added to the selection: the clicked cell becomes the active cell
			setSelectedCellState(cell);
			setSelectedCellKeyMap(nextMap);
			return;
		}

		const remainingCells = getGridSelectedCellsFromKeyMap(nextMap);

		if (!remainingCells.length) {
			// Removing the last cell collapses the selection onto the clicked cell
			setSelectedCellState(cell);
			setSelectedCellKeyMap(getGridSelectedCellKeyMapFromCells([cell]));
			return;
		}

		if (selectedCellState && getSheetCellKey(selectedCellState.rowId, selectedCellState.cellKey) === toggledKey) {
			setSelectedCellState(remainingCells[remainingCells.length - 1]);
		}

		setSelectedCellKeyMap(nextMap);
	}, [closeSheetCellEditorForSelection, remapSheetCellToMergeAnchor, selectedCellKeyMap, selectedCellState, setHeaderSelection]);

	const openSheetCellEditor = useCallback((cell_?: SheetUISelectedCellState | null, initialValue?: string, selectAllOnFocus = true) => {
		const cell = cell_ ? remapSheetCellToMergeAnchor(cell_) : cell_;
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
			if (isDataTableOrganizationProfileLookup(dataTableTarget.lookup)) {
				p.onOpenOrganizationProfile?.(
					String(dataTableTarget.lookup.cell?.relatedId || ''),
					getSheetChildOrganizationSourceOrgId(dataTableTarget.lookup.cell),
				);
				setEditState(null);
				scrollCellIntoView(targetCell);
				return;
			}

			// Contact/site overlays are viewers as much as editors: like the
			// DataTable module, they open even for non-editable columns
			const opensLocalDocumentOverlay = isDataTableInboundContactOpenLookup(dataTableTarget.lookup) ||
				isDataTableSiteLocationOpenLookup(dataTableTarget.lookup);

			if (!opensLocalDocumentOverlay && !canEditSheetDataTableCellTarget(dataTableTarget, p.disabled)) {
				setEditState(null);
				scrollCellIntoView(targetCell);
				return;
			}

			if (!opensLocalDocumentOverlay && handleDataTableRelatedDocumentCellEdit(dataTableTarget.lookup, p.setFloatingMessage)) {
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
			const localEditor = isDataTableLocalEditorFieldType(fieldType) || opensLocalDocumentOverlay;
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

		if (getSheetDataTableRegionAtCellFromMap(rowIndex, columnIndex, regionsById)) {
			setEditState(null);
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
	}, [remapSheetCellToMergeAnchor, dataTablesById, designCellsByDataTableId, optimisticDataTableValues, p.disabled, p.onOpenOrganizationProfile, p.setFloatingMessage, regionsById, scrollCellIntoView, selectedCellState, setHeaderSelection, sourceCellsByTargetKey]);

	/*
	 * Open a clickable dataTable-backed Sheet cell through its local editor or link action.
	 */
	const openSheetOpenableDataTableCell = useCallback((target: SheetDataTableCellEditTarget, cell: SheetUISelectedCellState) => {
		selectSheetCell(cell);

		if (isDataTableInboundContactOpenLookup(target.lookup) || isDataTableSiteLocationOpenLookup(target.lookup)) {
			openSheetCellEditor(cell, undefined, false);
			return;
		}

		p.onOpenDataTableCellLink?.({
			cell: target.lookup.cell,
			clickSource: 'CELL_LINK',
			dataTable: target.dataTable,
			designCell: target.lookup.designCell,
			row: target.lookup.row,
		});
	}, [openSheetCellEditor, p.onOpenDataTableCellLink, selectSheetCell]);

	const applySheetCellInputs = useCallback(async (inputs: SheetCellEditInput[]) => {
		const runtime = runtimeRef.current;

		if (!inputs.length) {
			return;
		}

		const nextTransition = getSheetOptimisticCellEditTransition({
			baseCellsByCoord: runtime?.editBaseCellsByCoord || new Map(),
			currentOptimisticCellsByCoord: pendingPreviewsRef.current,
			inputs,
			timeZone: p.timeZone,
		});

		// Keep the synchronous ref fresh for rapid successive edits; the
		// pending store updates when the save queue records the entries
		pendingPreviewsRef.current = nextTransition.optimisticCellsByCoord;

		const entries = nextTransition.saveInputs.flatMap((input) => {
			const coordKey = getSheetCanvasCoordKey(input.cell.rowIndex, input.cell.columnIndex);
			const previewCell = nextTransition.optimisticCellsByCoord.get(coordKey);

			return previewCell ? [{ input, previewCell }] : [];
		});

		p.onBroadcastCellEdits?.(entries.map(({ input, previewCell }) => ({
			coordKey: getSheetCanvasCoordKey(input.cell.rowIndex, input.cell.columnIndex),
			previewCell,
		})));

		await p.onSaveCells(entries);
	}, [p.onBroadcastCellEdits, p.onSaveCells, p.timeZone]);

	const applySheetDesignPatch = useCallback(async (patch: SheetDesignPatchInput) => {
		const previousColumnWidths = localColumnWidthsRef.current;
		const previousRowHeights = localRowHeightsRef.current;
		const previousMergedRanges = mergedRangesRef.current;
		const previousAxisDesign = localAxisDesignRef.current;

		if (patch.metadata !== undefined) {
			// Merged ranges render from the optimistic override until the
			// saved design round-trips
			const metadata = parseSheetJSONObject(patch.metadata, {});
			setOptimisticMergedRanges(getSheetMergedRanges(metadata));
		}

		if (patch.columns) {
			const columns = parseSheetJSONObject(patch.columns, {});
			const nextColumnWidths = getSheetCanvasColumnWidths({
				...designRef.current,
				columns,
			});

			localColumnWidthsRef.current = nextColumnWidths;
			setLocalColumnWidths(nextColumnWidths);
		}

		if (patch.rows) {
			const rows = parseSheetJSONObject(patch.rows, {});
			const nextRowHeights = getSheetCanvasRowHeights({
				...designRef.current,
				rows,
			}, rowCount);

			localRowHeightsRef.current = nextRowHeights;
			setLocalRowHeights(nextRowHeights);
		}

		// The full patched axis maps render immediately so whole-line styles
		// appear before the saved design round-trips
		if (patch.columns || patch.rows) {
			const nextAxisDesign = {
				...previousAxisDesign,
				...(patch.columns ? { columns: parseSheetJSONObject(patch.columns, {}) as Record<string, SheetAxisDesignObj> } : {}),
				...(patch.rows ? { rows: parseSheetJSONObject(patch.rows, {}) as Record<string, SheetAxisDesignObj> } : {}),
			};

			localAxisDesignRef.current = nextAxisDesign;
			setLocalAxisDesign(nextAxisDesign);
		}

		try {
			await p.onUpdateSheetDesign(patch);
		} catch (error) {
			if (patch.columns) {
				localColumnWidthsRef.current = previousColumnWidths;
				setLocalColumnWidths(previousColumnWidths);
			}

			if (patch.rows) {
				localRowHeightsRef.current = previousRowHeights;
				setLocalRowHeights(previousRowHeights);
			}

			if (patch.columns || patch.rows) {
				localAxisDesignRef.current = previousAxisDesign;
				setLocalAxisDesign(previousAxisDesign);
			}

			if (patch.metadata !== undefined) {
				setOptimisticMergedRanges(previousMergedRanges);
			}

			throw error;
		}
	}, [p.onUpdateSheetDesign, rowCount, setLocalColumnWidths, setLocalRowHeights]);

	const applySheetHistoryEntry = useCallback(async (entry: SheetUndoRedoEntry, direction: 'after' | 'before') => {
		await runApplyingSheetHistory(async () => {
			// Structure replays first so cell and design changes recorded against
			// the restored layout land on the right coordinates
			if (entry.structure && p.onEditSheetStructure) {
				const step = entry.structure[direction];

				await p.onEditSheetStructure(step.operation, step.index);

				if (step.restoreCells?.length) {
					await applySheetCellInputs(step.restoreCells);
				}
			}

			if (entry.regions?.length) {
				for (const change of entry.regions) {
					if (direction === 'before' && change.before && p.onRestoreDataTableRegion) {
						// Undo recreates the region under a NEW id; the entry's
						// redo side updates in place so redo deletes the live one
						const restoredRegion = await p.onRestoreDataTableRegion(change.before);

						if (restoredRegion?.id) {
							change.after = { regionId: String(restoredRegion.id) };
						}
					} else if (direction === 'after' && change.after?.regionId) {
						await p.onRemoveDataTableRegion?.(change.after.regionId, { skipConfirmation: true });
					}
				}
			}

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
	}, [applySheetCellInputs, applySheetDataTableCellChanges, applySheetDesignPatch, p.onEditSheetStructure, p.onRemoveDataTableRegion, p.onRestoreDataTableRegion, runApplyingSheetHistory]);

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

		if (getSheetDataTableRegionAtCellFromMap(rowIndex, columnIndex, regionsById)) {
			return;
		}

		const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
		const currentCell = runtimeRef.current?.editBaseCellsByCoord.get(coordKey) || null;

		if (sheetCellDraftValueIsEqual(currentCell, value)) {
			return;
		}

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
	}, [applySheetCellInputs, pushSheetUndoEntry, regionsById]);

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
			clearOptimisticDataTableValue(optimisticKey);

			throw error;
		}
	}, [applySheetDataTableCellChanges, clearOptimisticDataTableValue, optimisticDataTableValues, pushSheetUndoEntry]);

	const commitEditorElement = useCallback(async (editorElement: HTMLElement, options?: { keepEditState?: boolean; selectAfterCommit?: boolean }) => {
		if (committingEditorRef.current) {
			return false;
		}

		const cellKey = editorElement.dataset.cellKey;
		const rowId = editorElement.dataset.rowId;
		const keepEditState = options?.keepEditState === true;
		const selectAfterCommit = options?.selectAfterCommit !== false;

		if (!cellKey || !rowId) {
			setEditState(null);
			return false;
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
				return false;
			}

			try {
				committingEditorRef.current = true;
				await saveDataTableCellValue(dataTableTarget, parsedValue.value);
				setEditState((current) => keepEditState
					? current?.cellKey === cellKey && current.rowId === rowId
						? {
							...current,
							error: null,
						}
						: {
							cellKey,
							draftValue,
							rowId,
						}
					: null);
				if (selectAfterCommit) {
					selectSheetCell(nextCell);
				}
				return true;
			} catch (error) {
				setEditState((current) => keepEditState && current?.cellKey === cellKey && current.rowId === rowId
					? {
						...current,
						error: error instanceof Error ? error.message : 'Unable to save cell',
					}
					: {
						cellKey,
						draftValue,
						error: error instanceof Error ? error.message : 'Unable to save cell',
						rowId,
					});
				return false;
			} finally {
				committingEditorRef.current = false;
			}
		}

		const draftValue = getSheetEditorElementValue(editorElement);

		try {
			committingEditorRef.current = true;
			await saveSheetCellValue(nextCell, draftValue);
			setEditState((current) => keepEditState
				? current?.cellKey === cellKey && current.rowId === rowId
					? {
						...current,
						error: null,
					}
					: {
						cellKey,
						draftValue,
						rowId,
					}
				: null);
			if (selectAfterCommit) {
				selectSheetCell(nextCell);
			}
			return true;
		} catch (error) {
			setEditState((current) => keepEditState && current?.cellKey === cellKey && current.rowId === rowId
				? {
					...current,
					error: error instanceof Error ? error.message : 'Unable to save cell',
				}
				: {
					cellKey,
					draftValue,
					error: error instanceof Error ? error.message : 'Unable to save cell',
					rowId,
				});
			return false;
		} finally {
			committingEditorRef.current = false;
		}
	}, [dataTablesById, designCellsByDataTableId, regionsById, saveDataTableCellValue, saveSheetCellValue, selectSheetCell, sourceCellsByTargetKey]);

	/*
	 * Commit keyboard editor saves while keeping the focused formula input editable.
	 */
	const commitKeyboardEditorElement = useCallback((editorElement: HTMLElement) => {
		return commitEditorElement(editorElement, editorElement.matches(GRID_FORMULA_INPUT_SELECTOR)
			? {
				keepEditState: true,
				selectAfterCommit: false,
			}
			: undefined);
	}, [commitEditorElement]);

	/*
	 * Clear selected Sheet cells while optionally deleting selected data table view connections.
	 */
	const clearSelectedSheetCellsWithOptions = useCallback(async (options: SheetClearSelectedCellsOptions = {}) => {
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
		const selectedDataTableRegionIds = getSheetDataTableRegionIdsForSelectedCells({
			regionsById,
			selectedCells,
		});
		const shouldProtectDataTableRegionCells = gridSelectedCellKeyMapHasMultipleCells(selectedMap) &&
			selectedDataTableRegionIds.length > 0;

		if (
			options.promptForDataTableRegions &&
			shouldProtectDataTableRegionCells &&
			p.onRemoveDataTableRegion &&
			!p.disabled
		) {
			openModalPopUp({
				name: 'delete_selected_data_table_regions',
				props: {
					cancelText: i18n.t('sheet.no_keep_data_table_views'),
					confirmText: i18n.t('sheet.yes_delete_data_table_views'),
					iconName: 'layers-grid-subtract',
					isWarning: true,
					message: i18n.t('sheet.delete_views_msg'),
					onCancel: () => {
						void clearSelectedSheetCellsWithOptions({
							promptForDataTableRegions: false,
						});
					},
					onConfirm: () => {
						void clearSelectedSheetCellsWithOptions({
							deleteDataTableRegions: true,
							promptForDataTableRegions: false,
						});
					},
					title: i18n.t('sheet.delete_views_'),
				},
			});
			return;
		}

		const sheetCellChanges: SheetCellHistoryChange[] = [];
		const dataTableCellChanges: SheetDataTableCellHistoryChange[] = [];

		selectedCells.forEach((cell) => {
			const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
			const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

			if (!rowIndex || !columnIndex) {
				return;
			}

			const dataTableRegion = getSheetDataTableRegionAtCellFromMap(rowIndex, columnIndex, regionsById);

			if (shouldProtectDataTableRegionCells && dataTableRegion && !options.deleteDataTableRegions) {
				return;
			}

			if (!(shouldProtectDataTableRegionCells && dataTableRegion && options.deleteDataTableRegions)) {
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
			}

			if (dataTableRegion && !options.deleteDataTableRegions) {
				return;
			}

			const key = getSheetCanvasCoordKey(rowIndex, columnIndex);
			const currentCell = runtime.editBaseCellsByCoord.get(key);
			const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, currentCell);
			// Delete clears content only: cells with saved formatting keep it
			// (Google Sheets parity); unformatted cells drop their sparse row
			const after = sheetCellHasSavedDesign(currentCell) && !options.clearDesign
				? getSheetValueEditInput(rowIndex, columnIndex, '')
				: getSheetClearEditInput(rowIndex, columnIndex);

			if (!sheetCellEditInputsAreEqual(before, after) && !sheetCellEditInputMatchesCell(after, currentCell)) {
				sheetCellChanges.push({
					after,
					before,
				});
			}
		});

		if (
			!sheetCellChanges.length &&
			!dataTableCellChanges.length &&
			(!options.deleteDataTableRegions || !selectedDataTableRegionIds.length)
		) {
			return;
		}

		// Deleted regions join the same history entry as the cleared cells so
		// one undo restores the whole gesture
		const regionChanges: SheetRegionHistoryChange[] = options.deleteDataTableRegions
			? selectedDataTableRegionIds.flatMap((regionId) => {
				const region = regionsById.get(regionId);

				return region ? [{ after: { regionId }, before: region }] : [];
			})
			: [];

		if (sheetCellChanges.length || dataTableCellChanges.length || regionChanges.length) {
			pushSheetUndoEntry({
				dataTableCells: dataTableCellChanges,
				...(regionChanges.length ? { regions: regionChanges } : {}),
				sheetCells: sheetCellChanges,
			});
		}

		if (options.deleteDataTableRegions) {
			for (const regionId of selectedDataTableRegionIds) {
				await p.onRemoveDataTableRegion?.(regionId, { skipConfirmation: true });
			}
		}

		if (sheetCellChanges.length) {
			await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
		}

		if (dataTableCellChanges.length) {
			await applySheetDataTableCellChanges(dataTableCellChanges, 'after');
		}
	}, [applySheetCellInputs, applySheetDataTableCellChanges, dataTablesById, designCellsByDataTableId, optimisticDataTableValues, openModalPopUp, p.disabled, p.onRemoveDataTableRegion, pushSheetUndoEntry, regionsById, selectedCellKeyMap, selectedCellState, sourceCellsByTargetKey]);

	/*
	 * Clear selected Sheet cells from the keyboard shortcut, asking before deleting selected data table views.
	 */
	const clearSelectedSheetCells = useCallback(() => {
		return clearSelectedSheetCellsWithOptions({
			promptForDataTableRegions: true,
		});
	}, [clearSelectedSheetCellsWithOptions]);

	/*
	 * Clear formatting (style and number format) on the selected Sheet cells
	 * while keeping their values and notes (Cmd/Ctrl+\).
	 */
	const clearSelectedSheetCellFormatting = useCallback(async () => {
		const runtime = runtimeRef.current;
		const selectedMap = getGridResolvedSelectedCellKeyMap({
			selectedCellKeyMap,
			selectedCellState,
		});

		if (!runtime || !selectedMap || p.disabled) {
			return;
		}

		const selectedCells = getOrderedGridSelectedCells({
			columnMetrics: runtime.columnMetrics,
			rowIds: runtime.rowIds,
			selectedCellKeyMap: selectedMap,
		});
		const sheetCellChanges: SheetCellHistoryChange[] = [];

		selectedCells.forEach((cell) => {
			const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
			const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);

			if (!rowIndex || !columnIndex) {
				return;
			}

			const key = getSheetCanvasCoordKey(rowIndex, columnIndex);
			const currentCell = runtime.editBaseCellsByCoord.get(key);

			// Only cells carrying saved design (style, format, or note-free style)
			// produce a change; untouched cells need no mutation
			if (!sheetCellHasSavedDesign(currentCell)) {
				return;
			}

			sheetCellChanges.push({
				after: {
					cell: {
						columnIndex,
						format: null,
						rowIndex,
						style: null,
					},
				},
				before: getSheetCellSnapshotEditInput(rowIndex, columnIndex, currentCell),
			});
		});

		// Whole-line selections also drop their saved line styles in the same entry
		const fullLineTarget = getSheetFullLineFormatTarget({
			columnCount: runtime.columnMetrics.length,
			headerSelection,
			rowCount: runtime.rowIds.length,
			targetCellCount: selectedCells.length,
		});
		let designChange: SheetDesignHistoryChange | null = null;

		if (fullLineTarget) {
			const vertical = fullLineTarget.type === 'COLUMN';
			const currentAxis = (vertical ? designRef.current.columns : designRef.current.rows) || {};
			const lineDeltas = fullLineTarget.lineIndexes
				.map((lineIndex) => {
					const key = vertical ? getSheetColumnDesignKey(lineIndex) : getSheetRowDesignKey(lineIndex);
					const lineStyle = normalizeSheetCellStyle(currentAxis[key]?.style) as Record<string, unknown>;
					const delta: Record<string, unknown> = {};

					Object.keys(lineStyle).forEach((prop) => {
						delta[prop] = null;
					});

					return { delta, key };
				})
				.filter((lineDelta) => Object.keys(lineDelta.delta).length);

			if (lineDeltas.length) {
				const nextAxis = mergeSheetAxisDesignLineStyles(currentAxis, lineDeltas);

				designChange = vertical
					? { after: { columns: JSON.stringify(nextAxis) }, before: { columns: JSON.stringify(currentAxis) } }
					: { after: { rows: JSON.stringify(nextAxis) }, before: { rows: JSON.stringify(currentAxis) } };
			}
		}

		if (!sheetCellChanges.length && !designChange) {
			return;
		}

		pushSheetUndoEntry({
			...(designChange ? { design: designChange } : {}),
			...(sheetCellChanges.length ? { sheetCells: sheetCellChanges } : {}),
		});

		if (sheetCellChanges.length) {
			await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
		}

		if (designChange) {
			await applySheetDesignPatch(designChange.after);
		}
	}, [applySheetCellInputs, applySheetDesignPatch, headerSelection, p.disabled, pushSheetUndoEntry, selectedCellKeyMap, selectedCellState]);

	/*
	 * Copy the current selection to the system clipboard as TSV and stash the
	 * full-fidelity payload (source coords, raw values, formatting) on the
	 * internal clipboard. A cut marks the payload so the next in-app paste
	 * moves the source cells instead of duplicating them.
	 */
	const copySelectedSheetCellsWithOptions = useCallback((options: { cut?: boolean } = {}) => {
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
		const rows = new Map<string, GridInternalClipboardCell[]>();

		selectedCells.forEach((cell) => {
			const rowValues = rows.get(cell.rowId) || [];
			const rowIndex = getSheetCanvasRowIndexFromId(cell.rowId);
			const columnIndex = getSheetCanvasColumnIndexFromKey(cell.cellKey);
			const coordKey = rowIndex && columnIndex ? getSheetCanvasCoordKey(rowIndex, columnIndex) : null;
			const sourceCell = coordKey ? runtime.calculatedCellsByCoord.get(coordKey) : null;
			// Formatting reads from the presentation overlay so pending style
			// edits copy along with the confirmed state
			const presentationCell = coordKey ? runtime.effectiveCellsByCoord.get(coordKey) : null;
			const style = normalizeSheetCellStyle(presentationCell?.style);

			rowValues.push({
				columnIndex: columnIndex || 0,
				format: presentationCell?.format ?? null,
				note: presentationCell?.note ?? null,
				rowIndex: rowIndex || 0,
				style: Object.keys(style).length ? style : null,
				value: getSheetCanvasCellDraftValue(sourceCell),
			});
			rows.set(cell.rowId, rowValues);
		});

		const grid = Array.from(rows.values());
		const text = grid.map((row) => row.map((entry) => getSheetClipboardEscapedValue(entry.value)).join('\t')).join('\n');

		// Keep the copy source payload so an in-app paste can shift formula
		// references, carry formatting, and move cut sources
		setInternalGridClipboard({ cut: options.cut, grid, text });
		setCopySourceRange(getSheetSelectedCellsBounds(selectedCells));
		void copyTextToClipboard(text);
	}, [selectedCellKeyMap, selectedCellState]);

	const copySelectedSheetCells = useCallback(() => {
		copySelectedSheetCellsWithOptions();
	}, [copySelectedSheetCellsWithOptions]);

	/*
	 * Cut the current selection: same payload as copy, marked so the next
	 * in-app paste moves the cells (values and formatting) and clears the source.
	 */
	const cutSelectedSheetCells = useCallback(() => {
		if (!p.disabled) {
			copySelectedSheetCellsWithOptions({ cut: true });
		}
	}, [copySelectedSheetCellsWithOptions, p.disabled]);

	/*
	 * Drop the copied-range marker and any pending cut payload (Escape).
	 */
	const dismissSheetCopyState = useCallback(() => {
		if (!copySourceRange) {
			return false;
		}

		setCopySourceRange(null);
		setInternalGridClipboard(null);
		return true;
	}, [copySourceRange]);

	/*
	 * Paste clipboard text from the top-left selected cell or an explicit context-menu selection target.
	 */
	const pasteSelectedSheetCells = useCallback(async (
		clipboardText: string,
		targetCell?: SheetUISelectedCellState | null,
		targetSelectedCellKeyMap?: SheetUISelectedCellKeyMap | null,
	) => {
		const runtime = runtimeRef.current;
		const selectedMap = targetSelectedCellKeyMap || (targetCell
			? getGridSelectedCellKeyMapFromCells([targetCell])
			: getGridResolvedSelectedCellKeyMap({
				selectedCellKeyMap,
				selectedCellState,
			}));
		const pasteStartCell = getGridTopLeftSelectedCell({
			columnMetrics: runtime?.columnMetrics || [],
			fallbackCell: targetCell || selectedCellState,
			rowIds: runtime?.rowIds || [],
			selectedCellKeyMap: selectedMap,
		});

		if (!runtime || !pasteStartCell) {
			return;
		}

		// An in-app copy carries source coordinates and formatting for relative
		// formula shifting and style transfer; external clipboard text falls
		// back to plain TSV parsing
		const internalClipboard = getInternalGridClipboard(clipboardText);
		const clipboardGrid = internalClipboard
			? internalClipboard.grid.map((row) => row.map((entry) => entry.value))
			: parseGridClipboardText(clipboardText);
		const startRowIndex = runtime.rowIds.indexOf(pasteStartCell.rowId);
		const startColumnIndex = runtime.columnMetrics.findIndex((metric) => {
			const canvasColumn = metric.column as SheetCanvasColumn;

			return String(canvasColumn.sheetColumnIndex) === pasteStartCell.cellKey;
		});
		const sheetCellChanges: SheetCellHistoryChange[] = [];
		const dataTableCellChanges: SheetDataTableCellHistoryChange[] = [];

		if (startRowIndex < 0 || startColumnIndex < 0) {
			return;
		}

		// Tile the clipboard across a larger selection when the selection is one
		// solid rectangle and an exact multiple of the clipboard dimensions
		const clipboardRowCount = clipboardGrid.length;
		const clipboardColumnCount = clipboardGrid.reduce((max, row) => Math.max(max, row.length), 0);
		let tileRowCount = 1;
		let tileColumnCount = 1;

		if (!targetCell && selectedMap && clipboardRowCount && clipboardColumnCount) {
			const selectedCells = getGridSelectedCellsFromKeyMap(selectedMap);
			const bounds = getSheetSelectedCellsBounds(selectedCells);
			const boundsHeight = bounds ? bounds.endRowIndex - bounds.startRowIndex + 1 : 0;
			const boundsWidth = bounds ? bounds.endColumnIndex - bounds.startColumnIndex + 1 : 0;

			if (
				bounds &&
				selectedCells.length === boundsHeight * boundsWidth &&
				boundsHeight % clipboardRowCount === 0 &&
				boundsWidth % clipboardColumnCount === 0 &&
				(boundsHeight > clipboardRowCount || boundsWidth > clipboardColumnCount)
			) {
				tileRowCount = boundsHeight / clipboardRowCount;
				tileColumnCount = boundsWidth / clipboardColumnCount;
			}
		}

		for (let tileRow = 0; tileRow < tileRowCount; tileRow += 1) {
			for (let tileColumn = 0; tileColumn < tileColumnCount; tileColumn += 1) {
				clipboardGrid.forEach((rowValues, rowOffset) => {
					const rowId = runtime.rowIds[startRowIndex + tileRow * clipboardRowCount + rowOffset];
					const rowIndex = getSheetCanvasRowIndexFromId(rowId);

					if (!rowIndex) {
						return;
					}

					rowValues.forEach((value, columnOffset) => {
						const metric = runtime.columnMetrics[startColumnIndex + tileColumn * clipboardColumnCount + columnOffset];
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

							if (getSheetDataTableRegionAtCellFromMap(rowIndex, canvasColumn.sheetColumnIndex, regionsById)) {
								return;
							}

							// Shift formula references by the distance from the copy source cell
							const sourceEntry = internalClipboard?.grid[rowOffset]?.[columnOffset];
							const pasteValue = sourceEntry && sourceEntry.rowIndex && sourceEntry.columnIndex
								? shiftSheetFormulaReferences(
									value,
									rowIndex - sourceEntry.rowIndex,
									canvasColumn.sheetColumnIndex - sourceEntry.columnIndex,
								).text
								: value;
							const key = getSheetCanvasCoordKey(rowIndex, canvasColumn.sheetColumnIndex);
							const before = getSheetCellSnapshotEditInput(rowIndex, canvasColumn.sheetColumnIndex, runtime.editBaseCellsByCoord.get(key));
							// In-app pastes carry the source cell's formatting along
							// with the value, Google Sheets style
							const after: SheetCellEditInput = sourceEntry
								? {
									cell: {
										columnIndex: canvasColumn.sheetColumnIndex,
										format: sourceEntry.format ?? null,
										note: sourceEntry.note ?? null,
										rawInput: pasteValue,
										rowIndex,
										style: sourceEntry.style ?? null,
										value: pasteValue,
									},
								}
								: getSheetValueEditInput(rowIndex, canvasColumn.sheetColumnIndex, pasteValue);

							if (!sheetCellEditInputsAreEqual(before, after)) {
								sheetCellChanges.push({
									after,
									before,
								});
							}
						}
					});
				});
			}
		}

		// A cut moves its source: clear every source cell the paste target does
		// not overwrite, then retire the cut payload so it pastes only once
		if (internalClipboard?.cut) {
			const pastedCoordKeys = new Set(sheetCellChanges.map((change) => {
				return getSheetCanvasCoordKey(change.after.cell.rowIndex, change.after.cell.columnIndex);
			}));

			internalClipboard.grid.forEach((row) => {
				row.forEach((entry) => {
					if (!entry.rowIndex || !entry.columnIndex) {
						return;
					}

					const key = getSheetCanvasCoordKey(entry.rowIndex, entry.columnIndex);

					// Cut only moves plain sheet cells; region-backed cells stay
					if (pastedCoordKeys.has(key) || getSheetDataTableRegionAtCellFromMap(entry.rowIndex, entry.columnIndex, regionsById)) {
						return;
					}

					const before = getSheetCellSnapshotEditInput(entry.rowIndex, entry.columnIndex, runtime.editBaseCellsByCoord.get(key));
					const after = getSheetClearEditInput(entry.rowIndex, entry.columnIndex);

					if (!sheetCellEditInputsAreEqual(before, after)) {
						sheetCellChanges.push({
							after,
							before,
						});
					}
				});
			});

			setInternalGridClipboard(null);
			setCopySourceRange(null);
		}

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

	/*
	 * Apply autofill values into the target range when a fill-handle drag ends,
	 * then grow the selection over the source plus filled cells.
	 */
	const applySheetFillRange = useCallback(async (source: SheetMergedRangeObj, target: SheetMergedRangeObj) => {
		const runtime = runtimeRef.current;

		if (!runtime || p.disabled) {
			return;
		}

		const vertical = target.startColumnIndex === source.startColumnIndex && target.endColumnIndex === source.endColumnIndex;
		const backward = vertical ? target.endRowIndex < source.startRowIndex : target.endColumnIndex < source.startColumnIndex;
		const sheetCellChanges: SheetCellHistoryChange[] = [];

		// One run per column for vertical fills, one per row for horizontal fills
		const runCount = vertical
			? source.endColumnIndex - source.startColumnIndex + 1
			: source.endRowIndex - source.startRowIndex + 1;

		for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
			const sourceCells: SheetAutofillCell[] = [];
			const targetCells: Array<{ columnIndex: number; rowIndex: number }> = [];

			if (vertical) {
				const columnIndex = source.startColumnIndex + runIndex;

				for (let rowIndex = source.startRowIndex; rowIndex <= source.endRowIndex; rowIndex += 1) {
					sourceCells.push({
						columnIndex,
						rowIndex,
						value: getSheetCanvasCellDraftValue(runtime.calculatedCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex))),
					});
				}

				// Target cells ordered nearest-to-source first
				if (backward) {
					for (let rowIndex = target.endRowIndex; rowIndex >= target.startRowIndex; rowIndex -= 1) {
						targetCells.push({ columnIndex, rowIndex });
					}
				} else {
					for (let rowIndex = target.startRowIndex; rowIndex <= target.endRowIndex; rowIndex += 1) {
						targetCells.push({ columnIndex, rowIndex });
					}
				}
			} else {
				const rowIndex = source.startRowIndex + runIndex;

				for (let columnIndex = source.startColumnIndex; columnIndex <= source.endColumnIndex; columnIndex += 1) {
					sourceCells.push({
						columnIndex,
						rowIndex,
						value: getSheetCanvasCellDraftValue(runtime.calculatedCellsByCoord.get(getSheetCanvasCoordKey(rowIndex, columnIndex))),
					});
				}

				if (backward) {
					for (let columnIndex = target.endColumnIndex; columnIndex >= target.startColumnIndex; columnIndex -= 1) {
						targetCells.push({ columnIndex, rowIndex });
					}
				} else {
					for (let columnIndex = target.startColumnIndex; columnIndex <= target.endColumnIndex; columnIndex += 1) {
						targetCells.push({ columnIndex, rowIndex });
					}
				}
			}

			const values = getSheetAutofillValues({
				backward,
				sourceCells,
				targetCells,
			});

			targetCells.forEach((targetCell, index) => {
				// Autofill writes plain sheet cells only; data-table-backed cells are skipped
				const dataTableTarget = getSheetDataTableCellEditTarget({
					columnIndex: targetCell.columnIndex,
					dataTablesById,
					designCellsByDataTableId,
					effectiveCellsByCoord: runtime.effectiveCellsByCoord,
					regionsById,
					rowIndex: targetCell.rowIndex,
					sourceCellsByTargetKey,
				});

				if (dataTableTarget || getSheetDataTableRegionAtCellFromMap(targetCell.rowIndex, targetCell.columnIndex, regionsById)) {
					return;
				}

				const key = getSheetCanvasCoordKey(targetCell.rowIndex, targetCell.columnIndex);
				const before = getSheetCellSnapshotEditInput(targetCell.rowIndex, targetCell.columnIndex, runtime.editBaseCellsByCoord.get(key));
				const after = getSheetValueEditInput(targetCell.rowIndex, targetCell.columnIndex, values[index]);

				if (!sheetCellEditInputsAreEqual(before, after)) {
					sheetCellChanges.push({
						after,
						before,
					});
				}
			});
		}

		// Grow the selection over the source plus filled range, like spreadsheets do
		const unionKeyMap: SheetUISelectedCellKeyMap = {};
		const unionStartRowIndex = Math.min(source.startRowIndex, target.startRowIndex);
		const unionEndRowIndex = Math.max(source.endRowIndex, target.endRowIndex);
		const unionStartColumnIndex = Math.min(source.startColumnIndex, target.startColumnIndex);
		const unionEndColumnIndex = Math.max(source.endColumnIndex, target.endColumnIndex);

		for (let rowIndex = unionStartRowIndex; rowIndex <= unionEndRowIndex; rowIndex += 1) {
			for (let columnIndex = unionStartColumnIndex; columnIndex <= unionEndColumnIndex; columnIndex += 1) {
				unionKeyMap[getSheetCellKey(String(rowIndex), String(columnIndex))] = true;
			}
		}

		setHeaderSelection(null);
		setSelectedCellKeyMap(unionKeyMap);

		if (!sheetCellChanges.length) {
			return;
		}

		pushSheetUndoEntry({
			dataTableCells: [],
			sheetCells: sheetCellChanges,
		});

		await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
	}, [applySheetCellInputs, dataTablesById, designCellsByDataTableId, p.disabled, pushSheetUndoEntry, regionsById, setHeaderSelection, setSelectedCellKeyMap, sourceCellsByTargetKey]);

	/*
	 * Fill the selected range from its leading row or column (Cmd/Ctrl+D and
	 * Cmd/Ctrl+R). A single-line selection fills from the neighboring row above
	 * (or column to the left), Google Sheets style. Values copy with relative
	 * formula shifting, and formatting copies along.
	 */
	const fillSelectedSheetCellsFromEdge = useCallback(async (direction: GridFillShortcutDirection) => {
		const runtime = runtimeRef.current;
		const bounds = fillHandleBounds;

		if (!runtime || !bounds || p.disabled) {
			return;
		}

		const vertical = direction === 'down';
		const boundsStart = vertical ? bounds.startRowIndex : bounds.startColumnIndex;
		const boundsEnd = vertical ? bounds.endRowIndex : bounds.endColumnIndex;
		let sourceIndex = boundsStart;
		let targetStart = boundsStart + 1;

		if (boundsStart === boundsEnd) {
			// Single-line selection: fill from the neighbor just outside it
			if (boundsStart <= 1) {
				return;
			}

			sourceIndex = boundsStart - 1;
			targetStart = boundsStart;
		}

		const lineStart = vertical ? bounds.startColumnIndex : bounds.startRowIndex;
		const lineEnd = vertical ? bounds.endColumnIndex : bounds.endRowIndex;
		const sheetCellChanges: SheetCellHistoryChange[] = [];

		for (let line = lineStart; line <= lineEnd; line += 1) {
			const sourceRowIndex = vertical ? sourceIndex : line;
			const sourceColumnIndex = vertical ? line : sourceIndex;
			const sourceKey = getSheetCanvasCoordKey(sourceRowIndex, sourceColumnIndex);
			const sourceValue = getSheetCanvasCellDraftValue(runtime.calculatedCellsByCoord.get(sourceKey));
			const sourcePresentation = runtime.editBaseCellsByCoord.get(sourceKey);
			const sourceStyle = normalizeSheetCellStyle(sourcePresentation?.style);

			for (let target = targetStart; target <= boundsEnd; target += 1) {
				const rowIndex = vertical ? target : line;
				const columnIndex = vertical ? line : target;

				// Fill writes plain sheet cells only; data-table-backed cells are skipped
				const dataTableTarget = getSheetDataTableCellEditTarget({
					columnIndex,
					dataTablesById,
					designCellsByDataTableId,
					effectiveCellsByCoord: runtime.effectiveCellsByCoord,
					regionsById,
					rowIndex,
					sourceCellsByTargetKey,
				});

				if (dataTableTarget || getSheetDataTableRegionAtCellFromMap(rowIndex, columnIndex, regionsById)) {
					continue;
				}

				const shiftedValue = shiftSheetFormulaReferences(
					sourceValue,
					rowIndex - sourceRowIndex,
					columnIndex - sourceColumnIndex,
				).text;
				const key = getSheetCanvasCoordKey(rowIndex, columnIndex);
				const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, runtime.editBaseCellsByCoord.get(key));
				const after: SheetCellEditInput = {
					cell: {
						columnIndex,
						format: sourcePresentation?.format ?? null,
						note: sourcePresentation?.note ?? null,
						rawInput: shiftedValue,
						rowIndex,
						style: Object.keys(sourceStyle).length ? sourceStyle : null,
						value: shiftedValue,
					},
				};

				if (!sheetCellEditInputsAreEqual(before, after)) {
					sheetCellChanges.push({
						after,
						before,
					});
				}
			}
		}

		if (!sheetCellChanges.length) {
			return;
		}

		pushSheetUndoEntry({
			sheetCells: sheetCellChanges,
		});

		await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
	}, [applySheetCellInputs, dataTablesById, designCellsByDataTableId, fillHandleBounds, p.disabled, pushSheetUndoEntry, regionsById, sourceCellsByTargetKey]);

	const selectAllSheetCells = useCallback(() => {
		const runtime = runtimeRef.current;

		if (!runtime) {
			return;
		}

		const usedRange = getSheetCanvasUsedRange({
			cellsByCoord: runtime.calculatedCellsByCoord,
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

	/*
	 * Return whether one Sheet cell coordinate holds visible content; drives
	 * Cmd/Ctrl+arrow jumps to the edge of the surrounding data block.
	 */
	const sheetCellCoordHasContent = useCallback((rowId: string, cellKey: string) => {
		const runtime = runtimeRef.current;
		const rowIndex = getSheetCanvasRowIndexFromId(rowId);
		const columnIndex = getSheetCanvasColumnIndexFromKey(cellKey);

		if (!runtime || !rowIndex || !columnIndex) {
			return false;
		}

		const coordKey = getSheetCanvasCoordKey(rowIndex, columnIndex);
		const cell = runtime.calculatedCellsByCoord.get(coordKey) || runtime.effectiveCellsByCoord.get(coordKey);

		return getSheetCanvasCellDraftValue(cell) !== '' || getSheetCanvasCellDisplayValue(cell) !== '';
	}, []);

	const navigateSheetArrow = useCallback((direction: GridArrowDirection, extendSelection: boolean, toDataEdge?: boolean) => {
		const runtime = runtimeRef.current;

		if (!runtime) {
			return;
		}

		if (extendSelection && selectedCellState) {
			// Shift+arrow keeps the active cell anchored and moves the range's
			// opposite corner, Google Sheets style
			const anchorCell = selectedCellState;
			const selectedMap = getGridResolvedSelectedCellKeyMap({
				selectedCellKeyMap,
				selectedCellState,
			});
			const selectedCells = selectedMap ? getGridSelectedCellsFromKeyMap(selectedMap) : [];
			const bounds = selectedCells.length ? getSheetSelectedCellsBounds(selectedCells) : null;
			const anchorRowIndex = getSheetCanvasRowIndexFromId(anchorCell.rowId) || 0;
			const anchorColumnIndex = getSheetCanvasColumnIndexFromKey(anchorCell.cellKey) || 0;
			const rangeEndCell = bounds
				? {
					cellKey: String(anchorColumnIndex === bounds.startColumnIndex ? bounds.endColumnIndex : bounds.startColumnIndex),
					rowId: String(anchorRowIndex === bounds.startRowIndex ? bounds.endRowIndex : bounds.startRowIndex),
				}
				: anchorCell;
			const nextEnd = toDataEdge
				? getGridDataEdgeNavigationSelection({
					columnMetrics: runtime.columnMetrics,
					direction,
					hasCellContent: sheetCellCoordHasContent,
					rowIds: runtime.rowIds,
					selectedCellState: rangeEndCell,
				})
				: getGridArrowNavigationSelection({
					columnMetrics: runtime.columnMetrics,
					direction,
					rowIds: runtime.rowIds,
					selectedCellState: rangeEndCell,
				});

			if (!nextEnd) {
				return;
			}

			const selection = getGridRangeSelection({
				activeCell: nextEnd,
				anchorCell,
				columnMetrics: runtime.columnMetrics,
				rowIds: runtime.rowIds,
				selectedActiveCell: anchorCell,
			});

			closeSheetCellEditorForSelection();
			setHeaderSelection(null);
			setSelectedCellState(selection.activeCell);
			setSelectedCellKeyMap(selection.selectedCellKeyMap);
			scrollCellIntoView(nextEnd);
			return;
		}

		let nextCell = toDataEdge
			? getGridDataEdgeNavigationSelection({
				columnMetrics: runtime.columnMetrics,
				direction,
				hasCellContent: sheetCellCoordHasContent,
				rowIds: runtime.rowIds,
				selectedCellState,
			})
			: getGridArrowNavigationSelection({
				columnMetrics: runtime.columnMetrics,
				direction,
				rowIds: runtime.rowIds,
				selectedCellState,
			});

		if (!nextCell) {
			return;
		}

		// Arrow moves step out of the current merged range instead of cycling
		// back onto its anchor
		const merges = mergedRangesRef.current;
		if (merges.length && selectedCellState && !toDataEdge) {
			const activeRowIndex = Math.floor(Number(selectedCellState.rowId || 0));
			const activeColumnIndex = Math.floor(Number(selectedCellState.cellKey || 0));
			const activeMerge = activeRowIndex && activeColumnIndex
				? getSheetMergedRangeAtCell(merges, activeRowIndex, activeColumnIndex)
				: null;
			const nextRowIndex = Math.floor(Number(nextCell.rowId || 0));
			const nextColumnIndex = Math.floor(Number(nextCell.cellKey || 0));

			if (activeMerge && nextRowIndex && nextColumnIndex && isSheetCellInMergedRange(activeMerge, nextRowIndex, nextColumnIndex)) {
				const exitRowIndex = direction === 'down'
					? activeMerge.endRowIndex + 1
					: direction === 'up'
						? activeMerge.startRowIndex - 1
						: nextRowIndex;
				const exitColumnIndex = direction === 'right'
					? activeMerge.endColumnIndex + 1
					: direction === 'left'
						? activeMerge.startColumnIndex - 1
						: nextColumnIndex;

				if (
					exitRowIndex < 1 || exitColumnIndex < 1 ||
					exitRowIndex > runtime.rowIds.length || exitColumnIndex > runtime.columnMetrics.length
				) {
					return;
				}

				nextCell = {
					cellKey: String(exitColumnIndex),
					rowId: String(exitRowIndex),
				};
			}
		}

		selectSheetCell(nextCell);
	}, [closeSheetCellEditorForSelection, scrollCellIntoView, selectSheetCell, selectedCellKeyMap, selectedCellState, setHeaderSelection, sheetCellCoordHasContent]);

	/*
	 * Move the active selection down (or up for Shift+Enter) one row after
	 * committing an editor with Enter.
	 */
	const navigateSheetEditorEnter = useCallback((editorElement: HTMLElement, direction: 'down' | 'up' = 'down') => {
		const runtime = runtimeRef.current;
		const cellKey = editorElement.dataset.cellKey;
		const rowId = editorElement.dataset.rowId;
		const nextCell = runtime && cellKey && rowId ? getGridArrowNavigationSelection({
			columnMetrics: runtime.columnMetrics,
			direction,
			rowIds: runtime.rowIds,
			selectedCellState: {
				cellKey,
				rowId,
			},
		}) : null;

		if (nextCell) {
			selectSheetCell(nextCell);
		}
	}, [selectSheetCell]);

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

	/*
	 * Move (or Shift-extend) the selection for Home/End: row start or row end,
	 * and with Cmd/Ctrl the top-left cell or the used range's last cell.
	 */
	const navigateSheetHomeEnd = useCallback((edge: GridHomeEndEdge, metaKey: boolean, extendSelection: boolean) => {
		const runtime = runtimeRef.current;

		if (!runtime || !selectedCellState) {
			return;
		}

		let targetCell: SheetUISelectedCellState | null = null;
		const firstColumn = runtime.columnMetrics[0]?.column as SheetCanvasColumn | undefined;

		if (metaKey) {
			if (edge === 'start') {
				targetCell = firstColumn
					? { cellKey: String(firstColumn.sheetColumnIndex), rowId: '1' }
					: null;
			} else {
				const usedRange = getSheetCanvasUsedRange({
					cellsByCoord: runtime.calculatedCellsByCoord,
					columns: runtime.columnMetrics,
					design: p.design,
					loadedRowCount: runtime.rowIds.length,
					ranges: p.ranges,
				});

				targetCell = usedRange.maxRowIndex && usedRange.maxColumnIndex
					? {
						cellKey: String(usedRange.maxColumnIndex),
						rowId: String(Math.min(runtime.rowIds.length, usedRange.maxRowIndex)),
					}
					: null;
			}
		} else if (edge === 'start') {
			targetCell = firstColumn
				? { cellKey: String(firstColumn.sheetColumnIndex), rowId: selectedCellState.rowId }
				: null;
		} else {
			// End jumps to the last filled cell of the current row, or the row
			// start when the row is empty
			const rowIndex = getSheetCanvasRowIndexFromId(selectedCellState.rowId) || 0;
			let lastFilledColumnIndex = 0;

			runtime.columnMetrics.forEach((metric) => {
				const canvasColumn = metric.column as SheetCanvasColumn;

				if (rowIndex && sheetCellCoordHasContent(selectedCellState.rowId, String(canvasColumn.sheetColumnIndex))) {
					lastFilledColumnIndex = Math.max(lastFilledColumnIndex, canvasColumn.sheetColumnIndex);
				}
			});

			targetCell = {
				cellKey: String(lastFilledColumnIndex || (firstColumn?.sheetColumnIndex ?? 1)),
				rowId: selectedCellState.rowId,
			};
		}

		if (!targetCell) {
			return;
		}

		if (extendSelection) {
			selectSheetCellRangeToTarget(targetCell);
			return;
		}

		selectSheetCell(targetCell);
	}, [p.design, p.ranges, selectSheetCell, selectSheetCellRangeToTarget, selectedCellState, sheetCellCoordHasContent]);

	/*
	 * Move (or Shift-extend) the selection by one viewport height for PageUp/PageDown.
	 */
	const navigateSheetPage = useCallback((direction: GridPageDirection, extendSelection: boolean) => {
		const runtime = runtimeRef.current;

		if (!runtime || !selectedCellState) {
			return;
		}

		const currentRowPosition = runtime.rowIds.indexOf(selectedCellState.rowId);

		if (currentRowPosition < 0) {
			return;
		}

		const pageHeight = Math.max(SHEET_ROW_HEIGHT, runtime.viewportHeight - SHEET_HEADER_HEIGHT);
		const currentTop = runtime.rowOffsets[currentRowPosition] || 0;
		const targetTop = direction === 'down' ? currentTop + pageHeight : currentTop - pageHeight;
		let targetRowPosition = currentRowPosition;

		if (direction === 'down') {
			while (targetRowPosition < runtime.rowIds.length - 1 && (runtime.rowOffsets[targetRowPosition + 1] || 0) <= targetTop) {
				targetRowPosition += 1;
			}
		} else {
			while (targetRowPosition > 0 && (runtime.rowOffsets[targetRowPosition - 1] || 0) >= targetTop) {
				targetRowPosition -= 1;
			}
		}

		const targetRowId = runtime.rowIds[targetRowPosition];

		if (!targetRowId || targetRowId === selectedCellState.rowId) {
			return;
		}

		const targetCell = {
			cellKey: selectedCellState.cellKey,
			rowId: targetRowId,
		};

		if (extendSelection) {
			selectSheetCellRangeToTarget(targetCell);
			return;
		}

		selectSheetCell(targetCell);
	}, [selectSheetCell, selectSheetCellRangeToTarget, selectedCellState]);

	/*
	 * Select the active cell's whole row (Shift+Space).
	 */
	const selectActiveSheetRow = useCallback(() => {
		const runtime = runtimeRef.current;
		const rowMetric = selectedCellState ? runtime?.rowMetricsByKey.get(selectedCellState.rowId) : null;

		if (rowMetric) {
			selectSheetRow(rowMetric);
		}
	}, [selectSheetRow, selectedCellState]);

	/*
	 * Select the active cell's whole column (Ctrl+Space).
	 */
	const selectActiveSheetColumn = useCallback(() => {
		const runtime = runtimeRef.current;
		const columnMetric = selectedCellState ? runtime?.columnMetricsByKey.get(selectedCellState.cellKey) : null;

		if (columnMetric) {
			selectSheetColumn(columnMetric);
		}
	}, [selectSheetColumn, selectedCellState]);

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
		if (!(target.canFormatCells ?? target.canEdit)) {
			return;
		}

		setDisplayRulesEditorState(null);
		setColorPickerState({
			formatName,
			target,
		});
	}, []);

	/*
	 * Open the in-sheet display rules editor for one Sheet context-menu target.
	 * DataTable region cells are excluded: their typed field renderers own the
	 * displayed text, so rules would never paint there.
	 */
	const handleSheetContextMenuEditDisplayRules = useCallback((target: SheetContextMenuTarget) => {
		if (!(target.canFormatCells ?? target.canEdit) || target.dataTableRegionId || !target.valueType) {
			return;
		}

		setColorPickerState(null);
		setDisplayRulesEditorState({ target });
	}, []);

	/*
	 * Apply one format action to whole selected columns or rows as a single
	 * design patch: the uniform style delta merges into the saved line styles,
	 * with per-cell edits only for border boundary cells and cells whose own
	 * saved style would override the new line style. One updateSheet mutation
	 * replaces one cell write per covered coordinate, which matters when a
	 * data table region fills the line with thousands of materialized cells.
	 */
	const applySheetFullLineFormat = useCallback(async (params: {
		borderColor: string | null;
		borderPreset: SheetBorderStylePresetValue | null;
		format: SheetContextMenuFormat;
		lineIndexes: number[];
		rowHeightDesignChange: SheetDesignHistoryChange | null;
		type: 'COLUMN' | 'ROW';
	}) => {
		const runtime = runtimeRef.current;

		if (!runtime || !params.lineIndexes.length) {
			return;
		}

		const vertical = params.type === 'COLUMN';
		const lineIndexSet = new Set(params.lineIndexes);
		const crossEnd = vertical ? runtime.rowIds.length : runtime.columnMetrics.length;
		const lineDeltas: Array<{ delta: Record<string, unknown>; key: string }> = [];
		const deltasByLineIndex = new Map<number, Record<string, unknown>>();

		params.lineIndexes.forEach((lineIndex) => {
			let delta: Record<string, unknown>;

			if (params.borderPreset) {
				// Interior cells always have along-axis neighbors; cross-axis
				// neighbors depend on the adjacent line being selected too
				delta = getSheetBorderPresetStyleDeltaForNeighbors(params.borderPreset, vertical
					? { bottom: true, left: lineIndexSet.has(lineIndex - 1), right: lineIndexSet.has(lineIndex + 1), top: true }
					: { bottom: lineIndexSet.has(lineIndex + 1), left: true, right: true, top: lineIndexSet.has(lineIndex - 1) });
			} else if (params.borderColor !== null) {
				const lineDesign = vertical
					? getSheetCanvasColumnDesign(designRef.current, lineIndex)
					: getSheetCanvasRowDesign(designRef.current, lineIndex);

				delta = getSheetBorderColorStyleDelta({ ...normalizeSheetCellStyle(lineDesign.style) }, params.borderColor) || {};
			} else {
				delta = { [String(params.format.name)]: params.format.value ?? null };
			}

			deltasByLineIndex.set(lineIndex, delta);
			lineDeltas.push({
				delta,
				key: vertical ? getSheetColumnDesignKey(lineIndex) : getSheetRowDesignKey(lineIndex),
			});
		});

		// Border presets enable extra sides on the first and last cross-axis
		// cells (e.g. the top border of an outline); those few cells carry the
		// extra sides as per-cell styles layered over the line style
		const boundaryExtrasByCoordKey = new Map<string, Record<string, unknown>>();

		if (params.borderPreset && params.borderPreset !== 'outlineNone' && crossEnd > 0) {
			const boundaryCrossIndexes = crossEnd > 1 ? [1, crossEnd] : [1];

			boundaryCrossIndexes.forEach((crossIndex) => {
				params.lineIndexes.forEach((lineIndex) => {
					const uniformDelta = deltasByLineIndex.get(lineIndex) || {};
					const cellDelta = getSheetBorderPresetStyleDeltaForNeighbors(params.borderPreset!, vertical
						? { bottom: crossIndex < crossEnd, left: lineIndexSet.has(lineIndex - 1), right: lineIndexSet.has(lineIndex + 1), top: crossIndex > 1 }
						: { bottom: lineIndexSet.has(lineIndex + 1), left: crossIndex > 1, right: crossIndex < crossEnd, top: lineIndexSet.has(lineIndex - 1) });
					const extraProps: Record<string, unknown> = {};

					Object.entries(cellDelta).forEach(([prop, value]) => {
						if (value !== null && value !== undefined && (uniformDelta[prop] === null || uniformDelta[prop] === undefined)) {
							extraProps[prop] = value;
						}
					});

					if (Object.keys(extraProps).length) {
						const rowIndex = vertical ? crossIndex : lineIndex;
						const columnIndex = vertical ? lineIndex : crossIndex;

						boundaryExtrasByCoordKey.set(getSheetCanvasCoordKey(rowIndex, columnIndex), extraProps);
					}
				});
			});
		}

		const sheetCellChanges: SheetCellHistoryChange[] = [];
		const pushStyleChange = (rowIndex: number, columnIndex: number, currentCell: SheetCellGQL | undefined, nextStyle: Record<string, unknown>) => {
			const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, currentCell);
			const after: SheetCellEditInput = {
				cell: {
					columnIndex,
					rowIndex,
					style: normalizeSheetCellStyle(nextStyle),
				},
			};

			if (!sheetCellEditInputsAreEqual(before, after)) {
				sheetCellChanges.push({ after, before });
			}
		};

		// Saved per-cell styles override line styles at paint time: only cells
		// whose style sets an affected property need an edit (drop the property
		// so the line style shows; a border color repaints their own sides).
		// The sparse stored-cell map drives this scan, not the selection size.
		runtime.editBaseCellsByCoord.forEach((cell, coordKey) => {
			const rowIndex = Math.floor(Number(cell.rowIndex || 0));
			const columnIndex = Math.floor(Number(cell.columnIndex || 0));
			const lineIndex = vertical ? columnIndex : rowIndex;

			if (!rowIndex || !columnIndex || !lineIndexSet.has(lineIndex)) {
				return;
			}

			const currentStyle = normalizeSheetCellStyle(cell.style) as Record<string, unknown>;
			const boundaryExtras = boundaryExtrasByCoordKey.get(coordKey);

			if (params.borderColor !== null && !params.borderPreset) {
				// Color applies to the cell's own enabled sides, like the per-cell path
				const cellColorDelta = getSheetBorderColorStyleDelta(currentStyle, params.borderColor);

				if (cellColorDelta) {
					const nextStyle = { ...currentStyle };

					Object.entries(cellColorDelta).forEach(([prop, value]) => {
						if (value === null) {
							delete nextStyle[prop];
						} else {
							nextStyle[prop] = value;
						}
					});

					pushStyleChange(rowIndex, columnIndex, cell, nextStyle);
				}

				boundaryExtrasByCoordKey.delete(coordKey);
				return;
			}

			const affectedKeys = Object.keys(deltasByLineIndex.get(lineIndex) || {});
			const hasConflict = affectedKeys.some((prop) => currentStyle[prop] !== undefined);

			if (!hasConflict && !boundaryExtras) {
				return;
			}

			const nextStyle = { ...currentStyle };

			affectedKeys.forEach((prop) => {
				delete nextStyle[prop];
			});
			Object.assign(nextStyle, boundaryExtras || {});
			pushStyleChange(rowIndex, columnIndex, cell, nextStyle);
			boundaryExtrasByCoordKey.delete(coordKey);
		});

		// Remaining boundary cells have no stored cell yet: create style-only rows
		boundaryExtrasByCoordKey.forEach((extraProps, coordKey) => {
			const [rowPart, columnPart] = coordKey.split(':');
			const rowIndex = Math.floor(Number(rowPart));
			const columnIndex = Math.floor(Number(columnPart));

			if (rowIndex && columnIndex) {
				pushStyleChange(rowIndex, columnIndex, undefined, extraProps);
			}
		});

		// One design change carries the line styles (plus the auto-grown row
		// heights of a font-size change) for a single updateSheet mutation
		const currentAxis = (vertical ? designRef.current.columns : designRef.current.rows) || {};
		const nextAxis = mergeSheetAxisDesignLineStyles(currentAxis, lineDeltas);
		const designBefore: SheetDesignPatchInput = {};
		const designAfter: SheetDesignPatchInput = {};

		if (vertical) {
			designBefore.columns = JSON.stringify(currentAxis);
			designAfter.columns = JSON.stringify(nextAxis);

			if (params.rowHeightDesignChange) {
				designBefore.rows = params.rowHeightDesignChange.before.rows;
				designAfter.rows = params.rowHeightDesignChange.after.rows;
			}
		} else if (params.rowHeightDesignChange) {
			// Row styles and the auto-grown row heights merge into one rows map
			designBefore.rows = params.rowHeightDesignChange.before.rows;
			designAfter.rows = JSON.stringify(mergeSheetAxisDesignLineStyles(
				parseSheetJSONObject(params.rowHeightDesignChange.after.rows, {}) as Record<string, SheetAxisDesignObj>,
				lineDeltas,
			));
		} else {
			designBefore.rows = JSON.stringify(currentAxis);
			designAfter.rows = JSON.stringify(nextAxis);
		}

		pushSheetUndoEntry({
			design: { after: designAfter, before: designBefore },
			...(sheetCellChanges.length ? { sheetCells: sheetCellChanges } : {}),
		});

		if (sheetCellChanges.length) {
			await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
		}

		await applySheetDesignPatch(designAfter);
	}, [applySheetCellInputs, applySheetDesignPatch, pushSheetUndoEntry]);

	/*
	 * Apply one display-rules edit to whole selected columns or rows as a single
	 * design patch: the rules merge into the saved line formats, with per-cell
	 * edits only for cells whose own saved format would override the new line
	 * rules at paint time. One updateSheet mutation replaces one cell write per
	 * covered coordinate.
	 */
	const applySheetFullLineDisplayRules = useCallback(async (params: {
		lineIndexes: number[];
		rules: SheetDisplayRulesForTypeObj | null;
		type: 'COLUMN' | 'ROW';
		valueType: SheetCellValueTypeEnum;
	}) => {
		const runtime = runtimeRef.current;

		if (!runtime || !params.lineIndexes.length) {
			return;
		}

		const vertical = params.type === 'COLUMN';
		const lineIndexSet = new Set(params.lineIndexes);
		const lineDeltas = params.lineIndexes.map((lineIndex) => ({
			key: vertical ? getSheetColumnDesignKey(lineIndex) : getSheetRowDesignKey(lineIndex),
			rules: params.rules,
			valueType: params.valueType,
		}));

		// Saved per-cell rules override line rules at paint time: cells whose own
		// format defines the target value type drop that key so the line rule
		// shows. The sparse stored-cell map drives this scan, not the selection.
		const sheetCellChanges: SheetCellHistoryChange[] = [];

		runtime.editBaseCellsByCoord.forEach((cell, coordKey) => {
			const rowIndex = Math.floor(Number(cell.rowIndex || 0));
			const columnIndex = Math.floor(Number(cell.columnIndex || 0));
			const lineIndex = vertical ? columnIndex : rowIndex;

			if (!rowIndex || !columnIndex || !lineIndexSet.has(lineIndex)) {
				return;
			}

			const ownedFormat = getSheetCellOwnedDisplayRulesFormat({
				cell,
				columnIndex,
				design: designRef.current,
				ranges: p.ranges,
				rowIndex,
			});

			if (!ownedFormat.displayRules?.[params.valueType]) {
				return;
			}

			const displayRules: SheetDisplayRulesObj = { ...ownedFormat.displayRules };
			delete displayRules[params.valueType];

			const nextFormat: SheetCellFormatObj = { ...ownedFormat };

			if (Object.keys(displayRules).length) {
				nextFormat.displayRules = displayRules;
			} else {
				delete nextFormat.displayRules;
			}

			const after: SheetCellEditInput = {
				cell: {
					columnIndex,
					format: JSON.stringify(nextFormat),
					rowIndex,
				},
			};
			const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, cell);

			if (!sheetCellEditInputsAreEqual(before, after)) {
				sheetCellChanges.push({ after, before });
			}
		});

		// One design change carries the line rules for a single updateSheet mutation
		const currentAxis = (vertical ? designRef.current.columns : designRef.current.rows) || {};
		const nextAxis = mergeSheetAxisDesignLineFormats(currentAxis, lineDeltas);
		const designBefore: SheetDesignPatchInput = vertical
			? { columns: JSON.stringify(currentAxis) }
			: { rows: JSON.stringify(currentAxis) };
		const designAfter: SheetDesignPatchInput = vertical
			? { columns: JSON.stringify(nextAxis) }
			: { rows: JSON.stringify(nextAxis) };

		pushSheetUndoEntry({
			design: { after: designAfter, before: designBefore },
			...(sheetCellChanges.length ? { sheetCells: sheetCellChanges } : {}),
		});

		if (sheetCellChanges.length) {
			await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
		}

		await applySheetDesignPatch(designAfter);
	}, [applySheetCellInputs, applySheetDesignPatch, p.ranges, pushSheetUndoEntry]);

	const handleSheetContextMenuFormatCells = useCallback(async (target: SheetContextMenuTarget, format: SheetContextMenuFormat) => {
		const runtime = runtimeRef.current;
		const sheetCellChanges: SheetCellHistoryChange[] = [];
		const formatName = format.name;
		const borderPreset = formatName === 'borderStyle' && isSheetBorderStylePresetValue(format.value)
			? format.value
			: null;
		const borderColor = formatName === 'borderStyle' && typeof format.borderColor === 'string'
			? format.borderColor
			: null;
		const fontSize = formatName === 'fontSize' ? Number(format.value) : null;

		if (!runtime || !formatName) {
			return;
		}

		if (formatName === 'borderStyle' && !borderPreset && borderColor === null) {
			return;
		}

		const cellCoords = getSheetBorderStyleCellCoords(target.cells);
		const selectedCellCoordKeys = new Set(cellCoords.map((cellCoord) => cellCoord.coordKey));
		const rowHeightDesignChange = fontSize && Number.isFinite(fontSize) && fontSize > 0
			? getSheetAutoRowHeightPatchForFontSize({
				cellCoords,
				cellLookup: runtime.cellLookup,
				columnMetricsByKey: runtime.columnMetricsByKey,
				designRows: designRef.current.rows,
				fontSize,
				rowMetricsByKey: runtime.rowMetricsByKey,
			})
			: null;

		// Whole-column/row selections format through one design patch instead
		// of one edit per covered cell
		const fullLineTarget = getSheetFullLineFormatTarget({
			columnCount: runtime.columnMetrics.length,
			headerSelection,
			rowCount: runtime.rowIds.length,
			targetCellCount: cellCoords.length,
		});

		if (fullLineTarget) {
			await applySheetFullLineFormat({
				borderColor,
				borderPreset,
				format,
				lineIndexes: fullLineTarget.lineIndexes,
				rowHeightDesignChange,
				type: fullLineTarget.type,
			});
			return;
		}

		cellCoords.forEach((cellCoord) => {
			const { columnIndex, coordKey, rowIndex } = cellCoord;
			const currentCell = runtime.editBaseCellsByCoord.get(coordKey);

			const currentStyle = parseSheetJSONObject(currentCell?.style, {}) as Record<string, unknown>;
			const nextStyle = { ...currentStyle };

			if (formatName === 'borderStyle') {
				if (borderPreset) {
					applySheetBorderPresetStyleToCell({
						cell: cellCoord,
						preset: borderPreset,
						selectedCellCoordKeys,
						style: nextStyle,
					});
				} else if (borderColor !== null) {
					applySheetBorderColorToEnabledSides(nextStyle, borderColor);
				}
			} else if (format.value === null || format.value === undefined) {
				delete nextStyle[formatName];
			} else {
				nextStyle[formatName] = format.value;
			}

			const after = {
				cell: {
					columnIndex,
					rowIndex,
					style: normalizeSheetCellStyle(nextStyle),
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

		if (!sheetCellChanges.length && !rowHeightDesignChange) {
			return;
		}

		pushSheetUndoEntry({
			...(rowHeightDesignChange ? { design: rowHeightDesignChange } : {}),
			...(sheetCellChanges.length ? { sheetCells: sheetCellChanges } : {}),
		});

		if (sheetCellChanges.length) {
			await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
		}

		if (rowHeightDesignChange) {
			await applySheetDesignPatch(rowHeightDesignChange.after);
		}
	}, [applySheetCellInputs, applySheetDesignPatch, applySheetFullLineFormat, headerSelection, pushSheetUndoEntry]);

	/*
	 * Save one display-rules edit from the in-sheet editor for its target value
	 * type. Whole-column/row selections persist through one design patch (line
	 * rules merge under per-cell rules at paint time); other selections write
	 * per-cell formats. Saving null clears the value type's rules.
	 */
	const handleSheetDisplayRulesSave = useCallback(async (rules: SheetDisplayRulesForTypeObj | null) => {
		const runtime = runtimeRef.current;
		const target = displayRulesEditorState?.target;
		const valueType = target?.valueType;

		if (!runtime || !target || !valueType) {
			return;
		}

		const cellCoords = getSheetBorderStyleCellCoords(target.cells);

		// Whole-column/row selections persist through one design patch instead
		// of one edit per covered cell
		const fullLineTarget = getSheetFullLineFormatTarget({
			columnCount: runtime.columnMetrics.length,
			headerSelection,
			rowCount: runtime.rowIds.length,
			targetCellCount: cellCoords.length,
		});

		if (fullLineTarget) {
			await applySheetFullLineDisplayRules({
				lineIndexes: fullLineTarget.lineIndexes,
				rules,
				type: fullLineTarget.type,
				valueType,
			});
			return;
		}

		const sheetCellChanges: SheetCellHistoryChange[] = [];

		cellCoords.forEach(({ columnIndex, coordKey, rowIndex }) => {
			const currentCell = runtime.editBaseCellsByCoord.get(coordKey);
			const nextFormat = getSheetCellOwnedDisplayRulesFormat({
				cell: currentCell,
				columnIndex,
				design: designRef.current,
				ranges: p.ranges,
				rowIndex,
			});
			const displayRules: SheetDisplayRulesObj = { ...(nextFormat.displayRules || {}) };

			if (rules) {
				displayRules[valueType] = rules;
			} else {
				delete displayRules[valueType];
			}

			if (Object.keys(displayRules).length) {
				nextFormat.displayRules = displayRules;
			} else {
				delete nextFormat.displayRules;
			}

			const after: SheetCellEditInput = {
				cell: {
					columnIndex,
					format: JSON.stringify(nextFormat),
					rowIndex,
				},
			};
			const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, currentCell);

			if (!sheetCellEditInputsAreEqual(before, after)) {
				sheetCellChanges.push({ after, before });
			}
		});

		if (!sheetCellChanges.length) {
			return;
		}

		pushSheetUndoEntry({
			sheetCells: sheetCellChanges,
		});

		await applySheetCellInputs(sheetCellChanges.map((change) => change.after));
	}, [applySheetCellInputs, applySheetFullLineDisplayRules, displayRulesEditorState, headerSelection, p.ranges, pushSheetUndoEntry]);

	const handleSheetContextMenuPopulateDataTable = useCallback((target: SheetContextMenuTarget) => {
		const request = getSheetInsertViewTableRequest(target);

		if (request) {
			p.onPopulateFromDataTable?.(request);
		}
	}, [p.onPopulateFromDataTable]);

	/*
	 * Open the backing data table route for one generated Sheet region.
	 */
	const handleSheetContextMenuOpenDataTable = useCallback((target: SheetContextMenuTarget) => {
		if (target.dataTableRoute) {
			p.onOpenDataTable?.(target.dataTableRoute);
		}
	}, [p.onOpenDataTable]);

	const handleSheetContextMenuRemoveDataTableRegion = useCallback(async (target: SheetContextMenuTarget) => {
		if (!target.dataTableRegionId) {
			return;
		}

		// Capture the region before the delete so undo can recreate it; the
		// entry pushes only once the (possibly confirmation-gated) delete runs
		const region = regionsById.get(target.dataTableRegionId) || null;

		await p.onRemoveDataTableRegion?.(target.dataTableRegionId, {
			onDeleted: region
				? (regionId) => {
					pushSheetUndoEntry({
						regions: [{
							after: { regionId },
							before: region,
						}],
					});
				}
				: undefined,
		});
	}, [p.onRemoveDataTableRegion, pushSheetUndoEntry, regionsById]);

	/*
	 * Run one row or column structure edit from the Sheet context menu. The
	 * undo entry is captured before the operation (a delete destroys the line's
	 * content) and pushed only after the operation succeeds.
	 */
	const handleSheetContextMenuEditStructure = useCallback(async (target: SheetContextMenuTarget, action: SheetContextMenuStructureAction) => {
		const index = getSheetStructureIndexFromContextMenuTarget(target, action);

		if (!index || !p.onEditSheetStructure) {
			return;
		}

		const operation = getSheetStructureOperationFromContextMenuAction(action);
		const structureChange = getSheetStructureHistoryChange(
			operation,
			index,
			runtimeRef.current?.editBaseCellsByCoord || new Map(),
		);

		await p.onEditSheetStructure(operation, index);

		pushSheetUndoEntry({
			structure: structureChange,
		});
	}, [p.onEditSheetStructure, pushSheetUndoEntry]);

	/*
	 * Paste clipboard text through the same Sheet mutation path used by keyboard shortcuts.
	 */
	const handleSheetContextMenuPasteCells = useCallback(async (target: SheetContextMenuTarget, clipboardText: string) => {
		await pasteSelectedSheetCells(clipboardText, {
			cellKey: target.cellKey,
			rowId: target.rowId,
		}, getGridSelectedCellKeyMapFromCells(target.cells));
	}, [pasteSelectedSheetCells]);

	/*
	 * Increase or decrease the selected Sheet cells' font size from the keyboard shortcut.
	 */
	const adjustSelectedSheetCellFontSize = useCallback(async (direction: -1 | 1) => {
		const runtime = runtimeRef.current;

		if (!runtime) {
			return;
		}

		const target = getSheetKeyboardFormatTarget({
			cellLookup: runtime.cellLookup,
			columnMetricsByKey: runtime.columnMetricsByKey,
			designCellsByDataTableId,
			disabled: p.disabled,
			effectiveCellsByCoord: runtime.effectiveCellsByCoord,
			regions: p.regions,
			rowMetricsByKey: runtime.rowMetricsByKey,
			selectedCellKeyMap,
			selectedCellState,
		});

		if (!target || !(target.canFormatCells ?? target.canEdit)) {
			return;
		}

		const currentFontSize = target.fontSize || SHEET_KEYBOARD_DEFAULT_FONT_SIZE;
		const fontSizeDelta = Math.max(1, Math.round(currentFontSize * SHEET_KEYBOARD_FONT_SIZE_CHANGE_RATIO));
		const nextFontSize = normalizeSheetCellFontSize(currentFontSize + fontSizeDelta * direction);

		if (!nextFontSize || nextFontSize === target.fontSize) {
			return;
		}

		await handleSheetContextMenuFormatCells(target, {
			name: 'fontSize',
			value: nextFontSize,
		});
	}, [designCellsByDataTableId, handleSheetContextMenuFormatCells, p.disabled, p.regions, selectedCellKeyMap, selectedCellState]);

	/*
	 * Toggle the selected Sheet cells' full-cell text style from the keyboard shortcut.
	 */
	const toggleSelectedSheetCellTextStyle = useCallback(async (name: GridTextStyleShortcutName) => {
		const runtime = runtimeRef.current;

		if (!runtime) {
			return;
		}

		const target = getSheetKeyboardFormatTarget({
			cellLookup: runtime.cellLookup,
			columnMetricsByKey: runtime.columnMetricsByKey,
			designCellsByDataTableId,
			disabled: p.disabled,
			effectiveCellsByCoord: runtime.effectiveCellsByCoord,
			regions: p.regions,
			rowMetricsByKey: runtime.rowMetricsByKey,
			selectedCellKeyMap,
			selectedCellState,
		});

		if (!target || !(target.canFormatCells ?? target.canEdit)) {
			return;
		}

		await handleSheetContextMenuFormatCells(target, {
			name,
			value: target[name] !== true,
		});
	}, [designCellsByDataTableId, handleSheetContextMenuFormatCells, p.disabled, p.regions, selectedCellKeyMap, selectedCellState]);

	/*
	 * Open the in-sheet display rules editor on the current selection from the
	 * formula bar button.
	 */
	const openSheetDisplayRulesEditorFromSelection = useCallback(() => {
		const runtime = runtimeRef.current;

		if (!runtime) {
			return;
		}

		const target = getSheetKeyboardFormatTarget({
			cellLookup: runtime.cellLookup,
			columnMetricsByKey: runtime.columnMetricsByKey,
			designCellsByDataTableId,
			disabled: p.disabled,
			effectiveCellsByCoord: runtime.effectiveCellsByCoord,
			regions: p.regions,
			rowMetricsByKey: runtime.rowMetricsByKey,
			selectedCellKeyMap,
			selectedCellState,
		});

		if (target) {
			handleSheetContextMenuEditDisplayRules(target);
		}
	}, [designCellsByDataTableId, handleSheetContextMenuEditDisplayRules, p.disabled, p.regions, selectedCellKeyMap, selectedCellState]);

	/*
	 * Apply the custom Sheet color picker value to the active color format target.
	 */
	const handleSheetColorPickerValue = useCallback((value: string) => {
		if (!colorPickerState) {
			return;
		}

		void handleSheetContextMenuFormatCells(colorPickerState.target, {
			borderColor: colorPickerState.formatName === 'borderStyle' ? value : undefined,
			name: colorPickerState.formatName,
			value: colorPickerState.formatName === 'borderStyle' ? undefined : value,
		});
	}, [colorPickerState, handleSheetContextMenuFormatCells]);

	/*
	 * Close the active in-sheet color picker.
	 */
	const closeSheetColorPicker = useCallback(() => {
		if (!colorPickerState) {
			return false;
		}

		setColorPickerState(null);
		return true;
	}, [colorPickerState]);

	/*
	 * Close the active in-sheet display rules editor.
	 */
	const closeSheetDisplayRulesEditor = useCallback(() => {
		if (!displayRulesEditorState) {
			return false;
		}

		setDisplayRulesEditorState(null);
		return true;
	}, [displayRulesEditorState]);

	/*
	 * Apply one merged-ranges change: instant local feedback through the
	 * optimistic override, persisted as a sheet design metadata patch.
	 */
	const applySheetMergedRangesChange = useCallback(async (nextMerges: SheetMergedRangeObj[], clearChanges: SheetCellHistoryChange[]) => {
		const currentMerges = mergedRangesRef.current;
		const baseMetadata = parseSheetJSONObject(designRef.current.metadata, {});
		const designChange = {
			before: { metadata: JSON.stringify({ ...baseMetadata, merges: currentMerges }) },
			after: { metadata: JSON.stringify({ ...baseMetadata, merges: nextMerges }) },
		};

		pushSheetUndoEntry({
			design: designChange,
			...(clearChanges.length ? { sheetCells: clearChanges } : {}),
		});

		if (clearChanges.length) {
			await applySheetCellInputs(clearChanges.map((change) => change.after));
		}

		await applySheetDesignPatch(designChange.after);
	}, [applySheetCellInputs, applySheetDesignPatch, pushSheetUndoEntry]);

	/*
	 * Merge the target selection with the selected mode: each merge anchor keeps
	 * its value; every other covered cell with content is cleared (undoable).
	 */
	const handleSheetContextMenuMergeCells = useCallback(async (target: SheetContextMenuTarget, mode: SheetContextMenuMergeMode) => {
		const runtime = runtimeRef.current;
		const bounds = getSheetSelectedCellsBounds(target.cells);

		if (!runtime || !bounds || !canApplySheetContextMenuMergeMode(target, mode)) {
			return;
		}

		const mergeRanges = getSheetMergeRangesForMode(bounds, mode);
		if (!mergeRanges.length) {
			return;
		}

		const nextMerges = mergeRanges.reduce((merges, range) => {
			return addSheetMergedRange(merges, range);
		}, mergedRangesRef.current);
		const clearChanges: SheetCellHistoryChange[] = [];

		// The confirmed/edit-base map is sparse: scan it instead of the bounds
		runtime.editBaseCellsByCoord.forEach((cell) => {
			const rowIndex = Math.floor(Number(cell.rowIndex || 0));
			const columnIndex = Math.floor(Number(cell.columnIndex || 0));
			const mergeRange = mergeRanges.find((range) => isSheetCellInMergedRange(range, rowIndex, columnIndex));

			if (
				!rowIndex || !columnIndex ||
				!mergeRange ||
				isSheetMergedRangeAnchor(mergeRange, rowIndex, columnIndex)
			) {
				return;
			}

			const before = getSheetCellSnapshotEditInput(rowIndex, columnIndex, cell);
			const after = getSheetClearEditInput(rowIndex, columnIndex);

			if (!sheetCellEditInputsAreEqual(before, after)) {
				clearChanges.push({ after, before });
			}
		});

		// Selection collapses to the merge anchor
		selectSheetCell({
			cellKey: String(bounds.startColumnIndex),
			rowId: String(bounds.startRowIndex),
		});

		await applySheetMergedRangesChange(nextMerges, clearChanges);
	}, [applySheetMergedRangesChange, selectSheetCell]);

	/*
	 * Remove every merged range intersecting the target selection.
	 */
	const handleSheetContextMenuUnmergeCells = useCallback(async (target: SheetContextMenuTarget) => {
		const bounds = getSheetSelectedCellsBounds(target.cells);

		if (!bounds || !(target.canUnmergeCells ?? false)) {
			return;
		}

		const nextMerges = removeSheetMergedRangesIntersecting(mergedRangesRef.current, bounds);
		if (nextMerges.length === mergedRangesRef.current.length) {
			return;
		}

		await applySheetMergedRangesChange(nextMerges, []);
	}, [applySheetMergedRangesChange]);

	const {
		closeSheetContextMenu,
		openSheetContextMenu,
	} = useSheetContextMenu({
		onCustomizeCells: handleSheetContextMenuCustomizeCells,
		onEditCell: handleSheetContextMenuEditCell,
		onEditDisplayRules: handleSheetContextMenuEditDisplayRules,
		onEditStructure: handleSheetContextMenuEditStructure,
		onFormatCells: handleSheetContextMenuFormatCells,
		onMergeCells: handleSheetContextMenuMergeCells,
		onOpenDataTable: handleSheetContextMenuOpenDataTable,
		onPasteCells: handleSheetContextMenuPasteCells,
		onPopulateFromDataTable: handleSheetContextMenuPopulateDataTable,
		onRemoveCellsFromDataTable: handleSheetContextMenuRemoveDataTableRegion,
		onUnmergeCells: handleSheetContextMenuUnmergeCells,
		readClipboardText: readSheetClipboardText,
	});

	/*
	 * Close the topmost dismissible Sheet overlay from keyboard shortcuts.
	 */
	const dismissSheetKeyboardOverlay = useCallback(() => {
		return closeSheetDisplayRulesEditor() || closeSheetColorPicker() || closeSheetContextMenu();
	}, [closeSheetColorPicker, closeSheetContextMenu, closeSheetDisplayRulesEditor]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const elements = getGridKeyboardElements(event, {
				editorSelector: SHEET_GRID_EDITOR_SELECTOR,
			});

			handleGridKeyboardEvent(event, elements, {
				blocked: keyDown.alert || keyDown.modal || isGridShortcutBlockedByActiveInput(SHEET_GRID_EDITOR_SELECTOR),
				hasActiveCell: Boolean(selectedCellState),
				hasActiveEditState: Boolean(editState),
				isTextInputKey: isGridTextInputKey(event),
				onAdjustFontSize: adjustSelectedSheetCellFontSize,
				onArrow: navigateSheetArrow,
				onClear: clearSelectedSheetCells,
				onClearFormatting: clearSelectedSheetCellFormatting,
				onCopy: copySelectedSheetCells,
				onCut: cutSelectedSheetCells,
				onDismissActiveEditor: () => {
					setEditState(null);
				},
				onDismissContextMenu: dismissSheetKeyboardOverlay,
				onDismissEditor: () => {
					setEditState(null);
				},
				onEditorCommit: commitKeyboardEditorElement,
				onEditorCommitEnter: navigateSheetEditorEnter,
				onEnter: () => {
					openSheetCellEditor(selectedCellState, undefined, false);
				},
				onEscapeSelection: () => {
					// Escape first cancels a pending copy or cut, then collapses
					// the selection to the active cell
					if (dismissSheetCopyState()) {
						return;
					}

					setSelectedCellKeyMap(getGridResolvedSelectedCellKeyMap({
						selectedCellState,
					}));
				},
				onFill: fillSelectedSheetCellsFromEdge,
				onHomeEnd: navigateSheetHomeEnd,
				onPage: navigateSheetPage,
				onPaste: pasteSelectedSheetCells,
				onRedo: redoSheetHistory,
				onSelectAll: selectAllSheetCells,
				onSelectColumn: selectActiveSheetColumn,
				onSelectRow: selectActiveSheetRow,
				onTab: navigateSheetTab,
				onTextInput: (pressed) => {
					openSheetCellEditor(selectedCellState, pressed, false);
				},
				onToggleTextStyle: toggleSelectedSheetCellTextStyle,
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
		adjustSelectedSheetCellFontSize,
		clearSelectedSheetCellFormatting,
		clearSelectedSheetCells,
		dismissSheetCopyState,
		dismissSheetKeyboardOverlay,
		commitKeyboardEditorElement,
		copySelectedSheetCells,
		cutSelectedSheetCells,
		editState,
		fillSelectedSheetCellsFromEdge,
		keyDown.alert,
		keyDown.modal,
		navigateSheetArrow,
		navigateSheetEditorEnter,
		navigateSheetHomeEnd,
		navigateSheetPage,
		navigateSheetTab,
		openSheetCellEditor,
		pasteSelectedSheetCells,
		redoSheetHistory,
		selectActiveSheetColumn,
		selectActiveSheetRow,
		selectAllSheetCells,
		selectedCellState,
		toggleSelectedSheetCellTextStyle,
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
	 * Dismiss the color picker and display rules editor from the sheet's
	 * centralized pointer capture path.
	 */
	const handlePointerDownCapture = useCallback((event: PointerEvent<HTMLDivElement>) => {
		const insideColorPicker = isSheetColorPickerEventTarget(event.target);
		const insideDisplayRulesEditor = isSheetDisplayRulesEditorEventTarget(event.target);

		colorPickerPointerDownInsideRef.current = insideColorPicker;
		displayRulesEditorPointerDownInsideRef.current = insideDisplayRulesEditor;

		if (!insideColorPicker && colorPickerState) {
			closeSheetColorPicker();
		}

		if (!insideDisplayRulesEditor && displayRulesEditorState) {
			closeSheetDisplayRulesEditor();
		}
	}, [closeSheetColorPicker, closeSheetDisplayRulesEditor, colorPickerState, displayRulesEditorState]);

	const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
		dismissGridContextMenuOnPointerDown(event.nativeEvent, closeSheetContextMenu);

		const target = getSheetEventElementTarget(event.target);
		const startedInsideColorPicker = colorPickerPointerDownInsideRef.current || isSheetColorPickerEventTarget(event.target);
		const startedInsideDisplayRulesEditor = displayRulesEditorPointerDownInsideRef.current || isSheetDisplayRulesEditorEventTarget(event.target);

		colorPickerPointerDownInsideRef.current = false;
		displayRulesEditorPointerDownInsideRef.current = false;

		if (startedInsideColorPicker || startedInsideDisplayRulesEditor) {
			return;
		}

		if (p.disabled || event.button !== 0 || target?.closest(SHEET_GRID_EDITOR_SELECTOR)) {
			return;
		}

		const scrollRect = event.currentTarget.getBoundingClientRect();
		const isVerticalScrollbarClick = event.clientX >= scrollRect.right - SHEET_CANVAS_APP_SCROLLBAR_SIZE;
		const isHorizontalScrollbarClick = event.clientY >= scrollRect.bottom - SHEET_CANVAS_APP_SCROLLBAR_SIZE;

		if (isVerticalScrollbarClick || isHorizontalScrollbarClick) {
			return;
		}

		const activeEditorElement = event.currentTarget.querySelector(SHEET_TEXT_EDITOR_SELECTOR) as HTMLElement | null;
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

		// Fill-handle drag: the selection's corner dot wins over cell selection
		const fillHandlePoint = runtime && fillHandleBounds
			? getSheetCanvasFillHandlePoint({
				bounds: fillHandleBounds,
				columnMetrics: runtime.columnMetrics,
				rowMetrics: runtime.rowMetrics,
				scrollLeft: runtime.scrollLeft,
				scrollTop: runtime.scrollTop,
				stickyColumnCount,
			})
			: null;

		if (runtime && hit.cell && fillHandleBounds && fillHandlePoint && isSheetCanvasFillHandleHit({
			clientX: event.clientX,
			clientY: event.clientY,
			point: fillHandlePoint,
			scrollNode: runtime.scrollNode,
		})) {
			event.preventDefault();
			fillDragStateRef.current = {
				pointerId: event.pointerId,
				source: fillHandleBounds,
			};
			fillDragRangeRef.current = null;

			const previousBodyCursor = setSheetCanvasBodyCursor('crosshair');
			const onFillPointerMove = (moveEvent: globalThis.PointerEvent) => {
				const dragState = fillDragStateRef.current;
				const currentRuntime = runtimeRef.current;

				if (!dragState || dragState.pointerId !== moveEvent.pointerId || !currentRuntime) {
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

				const pointerRowIndex = getSheetCanvasRowIndexFromId(nextHit.cell.rowId);
				const pointerColumnIndex = getSheetCanvasColumnIndexFromKey(nextHit.cell.cellKey);

				if (!pointerRowIndex || !pointerColumnIndex) {
					return;
				}

				moveEvent.preventDefault();
				const nextRange = getSheetFillTargetRange(dragState.source, pointerRowIndex, pointerColumnIndex);

				fillDragRangeRef.current = nextRange;
				setFillDragRange((currentRange) => {
					return currentRange?.startRowIndex === nextRange?.startRowIndex &&
							currentRange?.startColumnIndex === nextRange?.startColumnIndex &&
							currentRange?.endRowIndex === nextRange?.endRowIndex &&
							currentRange?.endColumnIndex === nextRange?.endColumnIndex
						? currentRange
						: nextRange;
				});
			};
			const onFillPointerUp = (upEvent: globalThis.PointerEvent) => {
				restoreSheetCanvasBodyCursor(previousBodyCursor);

				if (fillDragStateRef.current?.pointerId === upEvent.pointerId) {
					const dragState = fillDragStateRef.current;
					const targetRange = fillDragRangeRef.current;

					fillDragStateRef.current = null;
					fillDragRangeRef.current = null;
					setFillDragRange(null);

					if (dragState && targetRange) {
						void applySheetFillRange(dragState.source, targetRange);
					}
				}

				window.removeEventListener('pointermove', onFillPointerMove);
				window.removeEventListener('pointerup', onFillPointerUp);
				window.removeEventListener('pointercancel', onFillPointerUp);
			};

			window.addEventListener('pointermove', onFillPointerMove);
			window.addEventListener('pointerup', onFillPointerUp);
			window.addEventListener('pointercancel', onFillPointerUp);
			return;
		}

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

		// Click on the corner box above the row numbers selects the whole sheet
		if (runtime && !hit.cell) {
			const scrollRect = runtime.scrollNode?.getBoundingClientRect();
			const cornerX = scrollRect ? event.clientX - scrollRect.left : -1;
			const cornerY = scrollRect ? event.clientY - scrollRect.top : -1;

			if (cornerX >= 0 && cornerX < SHEET_ROW_NUMBER_WIDTH && cornerY >= 0 && cornerY < SHEET_HEADER_HEIGHT) {
				event.preventDefault();
				selectAllSheetCells();
				return;
			}
		}

		if (!runtime || !hit.cell) {
			return;
		}

		const anchorCell = {
			cellKey: hit.cell.cellKey,
			rowId: hit.cell.rowId,
		};

		// Cmd/Ctrl+click toggles single cells in and out of the selection.
		// macOS Ctrl+click stays the system context-menu gesture (it does not
		// reach here as a primary-button pointerdown).
		if ((event.metaKey || event.ctrlKey) && selectedCellState) {
			event.preventDefault();
			toggleSheetCellInSelection(anchorCell);
			return;
		}

		if (event.shiftKey && selectedCellState) {
			event.preventDefault();
			selectSheetCellRangeToTarget(anchorCell);
			return;
		}

		const openableDataTableTarget = getSheetOpenableDataTableCellTarget({
			dataTablesById,
			designCellsByDataTableId,
			effectiveCellsByCoord: runtime.effectiveCellsByCoord,
			hit,
			regionsById,
			sourceCellsByTargetKey,
		});

		if (openableDataTableTarget) {
			const canOpenFromPointerDown = isSameSheetSelectedCellState(selectedCellState, anchorCell) || event.detail > 1;

			event.preventDefault();

			if (!canOpenFromPointerDown) {
				openedDataTableCellPointerDownRef.current = null;
				selectSheetCell(anchorCell);
				return;
			}

			if (event.detail > 1 && isSameSheetSelectedCellState(openedDataTableCellPointerDownRef.current, anchorCell)) {
				return;
			}

			openedDataTableCellPointerDownRef.current = anchorCell;
			openSheetOpenableDataTableCell(openableDataTableTarget, anchorCell);
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
	}, [applySheetFillRange, closeSheetCellEditorForSelection, closeSheetContextMenu, commitEditorElement, dataTablesById, designCellsByDataTableId, fillHandleBounds, openSheetOpenableDataTableCell, p.disabled, regionsById, selectAllSheetCells, selectSheetCell, selectSheetCellRangeToTarget, selectSheetColumn, selectSheetColumnRange, selectedCellState, selectSheetRow, selectSheetRowRange, setHeaderSelection, sourceCellsByTargetKey, startColumnResize, startRowResize, stickyColumnCount, toggleSheetCellInSelection]);

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
		const openableDataTableTarget = runtime ? getSheetOpenableDataTableCellTarget({
			dataTablesById,
			designCellsByDataTableId,
			effectiveCellsByCoord: runtime.effectiveCellsByCoord,
			hit,
			regionsById,
			sourceCellsByTargetKey,
		}) : null;
		// The fill handle dot shows a crosshair over every other cursor
		const fillHandlePoint = runtime && fillHandleBounds
			? getSheetCanvasFillHandlePoint({
				bounds: fillHandleBounds,
				columnMetrics: runtime.columnMetrics,
				rowMetrics: runtime.rowMetrics,
				scrollLeft: runtime.scrollLeft,
				scrollTop: runtime.scrollTop,
				stickyColumnCount,
			})
			: null;
		const fillHandleHovered = Boolean(hit.cell && fillHandlePoint && isSheetCanvasFillHandleHit({
			clientX: event.clientX,
			clientY: event.clientY,
			point: fillHandlePoint,
			scrollNode: runtime?.scrollNode || null,
		}));
		const cursor = fillHandleHovered ? 'crosshair' : getSheetCanvasPointerCursor(hit, p.disabled, Boolean(openableDataTableTarget));
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
		setHoveredCellState((currentCellState) => {
			const nextCellState = dataTableRegion && hit.cell
				? {
					cellKey: hit.cell.cellKey,
					rowId: hit.cell.rowId,
				}
				: null;

			return currentCellState?.cellKey === nextCellState?.cellKey && currentCellState?.rowId === nextCellState?.rowId
				? currentCellState
				: nextCellState;
		});
	}, [dataTablesById, designCellsByDataTableId, fillHandleBounds, p.disabled, p.regions, regionsById, sourceCellsByTargetKey, stickyColumnCount]);

	const handlePointerLeave = useCallback((event: PointerEvent<HTMLDivElement>) => {
		if (event.currentTarget.style.cursor) {
			event.currentTarget.style.cursor = '';
		}

		setHoveredRegionId(null);
		setHoveredCellState(null);
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
			const anchorCell = {
				cellKey: hit.cell.cellKey,
				rowId: hit.cell.rowId,
			};
			const openableDataTableTarget = runtime ? getSheetOpenableDataTableCellTarget({
				dataTablesById,
				designCellsByDataTableId,
				effectiveCellsByCoord: runtime.effectiveCellsByCoord,
				hit,
				regionsById,
				sourceCellsByTargetKey,
			}) : null;

			if (openableDataTableTarget) {
				event.preventDefault();

				if (isSameSheetSelectedCellState(openedDataTableCellPointerDownRef.current, anchorCell)) {
					openedDataTableCellPointerDownRef.current = null;
					return;
				}

				openedDataTableCellPointerDownRef.current = null;
				openSheetOpenableDataTableCell(openableDataTableTarget, anchorCell);
				return;
			}

			openedDataTableCellPointerDownRef.current = null;
			openSheetCellEditor(anchorCell);
		}
	}, [dataTablesById, designCellsByDataTableId, openSheetCellEditor, openSheetOpenableDataTableCell, regionsById, sourceCellsByTargetKey, stickyColumnCount]);

	/*
	 * Open the Sheet cell context menu unless the event belongs to an in-sheet overlay.
	 */
	const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
		if (isSheetContextMenuOverlayEventTarget(event.target)) {
			event.stopPropagation();
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

		const contextMenuTarget = runtime ? getSheetCanvasContextMenuHitTarget({
			columnMetrics: runtime.columnMetrics,
			headerSelection,
			hit,
			rowIds: runtime.rowIds,
			rowMetrics: runtime.rowMetrics,
			selectedCellKeyMap,
		}) : null;

		if (!contextMenuTarget) {
			return;
		}

		event.preventDefault();
		if (contextMenuTarget.headerSelection) {
			closeSheetCellEditorForSelection();
			setHeaderSelection(contextMenuTarget.headerSelection);
			setSelectedCellState(contextMenuTarget.selectedCell);
			setSelectedCellKeyMap(contextMenuTarget.selectedCellKeyMap);
		} else {
			selectSheetCell(contextMenuTarget.selectedCell, contextMenuTarget.selectedCellKeyMap);
		}
		openSheetContextMenu(event.nativeEvent, getSheetCanvasContextMenuTarget({
			canOpenDataTable: Boolean(p.onOpenDataTable),
			canPopulateFromDataTable: Boolean(p.onPopulateFromDataTable),
			canRemoveCellsFromDataTable: Boolean(p.onRemoveDataTableRegion) && !p.disabled,
			cell: contextMenuTarget.cell,
			cellLookup,
			designCellsByDataTableId,
			disabled: p.disabled,
			effectiveCellsByCoord,
			mergedRanges,
			regions: p.regions,
			selectedCellKeyMap: contextMenuTarget.selectedCellKeyMap,
			selectedCellState: contextMenuTarget.selectedCell,
		}));
	}, [cellLookup, closeSheetCellEditorForSelection, effectiveCellsByCoord, headerSelection, mergedRanges, openSheetContextMenu, p.disabled, p.onOpenDataTable, p.onPopulateFromDataTable, p.onRemoveDataTableRegion, p.regions, selectSheetCell, selectedCellKeyMap, setHeaderSelection, setSelectedCellKeyMap, setSelectedCellState, stickyColumnCount]);

	const handleFocusOut = useCallback((event: FocusEvent<HTMLDivElement>) => {
		if (keepEditModeForDev) {
			return;
		}

		const editorElement = event.target instanceof HTMLElement && event.target.closest(SHEET_TEXT_EDITOR_SELECTOR) as HTMLElement | null;
		const nextEditorElement = event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest(SHEET_TEXT_EDITOR_SELECTOR) as HTMLElement | null;

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

		const nextEditorElement = event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest(SHEET_TEXT_EDITOR_SELECTOR) as HTMLElement | null;

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
		const editorElement = event.target instanceof HTMLElement && event.target.closest(SHEET_TEXT_EDITOR_SELECTOR) as HTMLElement | null;

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

	// Highlights the formula-bar display-rules button when the selected cell's
	// resolved format defines rules for any value type (dormant types included)
	const selectedCellHasDisplayRules = useMemo(() => {
		if (!selectedCellState) {
			return false;
		}

		const canvasCell = cellLookup.get(getSheetCellKey(selectedCellState.rowId, selectedCellState.cellKey));

		return sheetCellFormatHasDisplayRules(canvasCell?.format);
	}, [cellLookup, selectedCellState]);

	const formulaInputContent = <SheetFormulaInput
		canEdit={formulaInputCanStartEdit}
		column={formulaInputState.column}
		dataTables={p.dataTables}
		editState={formulaInputCanEdit ? editState : null}
		error={formulaInputState.error}
		hasDisplayRules={selectedCellHasDisplayRules}
		onBlur={handleFormulaInputBlur}
		onCommit={(input) => {
			void commitEditorElement(input, {
				keepEditState: true,
				selectAfterCommit: false,
			});
		}}
		onDraftValue={updateSheetEditorDraftValue}
		onEditStart={handleFormulaInputFocus}
		onOpenDisplayRules={p.disabled ? undefined : openSheetDisplayRulesEditorFromSelection}
		readOnly={!formulaInputCanStartEdit}
		value={formulaInputCanEdit ? editState?.draftValue || '' : formulaInputState.value}
	/>;

	// Other viewers' avatars dock at the right end of the formula bar row
	const formulaContent = presenceRoster.length
		? <div className='h_item no_shrink'>
			<div className='f'>
				{formulaInputContent}
			</div>
			<div className='px_sm no_shrink'>
				<SheetPresenceRoster roster={presenceRoster} />
			</div>
		</div>
		: formulaInputContent;

	const overlayContent = <>
		{selectedFormulaErrorOverlay
			? <SheetFormulaErrorOverlay
				message={selectedFormulaErrorOverlay.message}
				position={selectedFormulaErrorOverlay.position}
			/>
			: null}
		{activeEditorColumn && editState && editorPosition && !editState.disableInlineEditor && !activeDataTableLocalEditorPosition
			? <SheetEditorOverlay
				column={activeEditorColumn}
				autoFocus={!formulaInputFocused}
				cellStyle={activeEditorCellStyle}
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
		{activeDataTableEditTarget && activeDataTableLocalEditorPosition && isDataTableInboundContactOpenLookup(activeDataTableEditTarget.lookup)
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
		{activeDataTableEditTarget && activeDataTableLocalEditorPosition && isDataTableSiteLocationOpenLookup(activeDataTableEditTarget.lookup)
			? <DataTableLocalEditorContainer position={activeDataTableLocalEditorPosition}>
				<DataTableSiteLocationEditor
					clickSource={editState?.clickSource}
					displayValue={getSheetCellDisplayValue(activeDataTableEditTarget.lookup.cell, activeDataTableEditTarget.lookup.designCell, undefined, p.timeZone)}
					onClose={() => {
						setEditState(null);
						selectSheetCell({
							cellKey: activeDataTableEditTarget.cellKey,
							rowId: activeDataTableEditTarget.rowId,
						});
					}}
					openModalPopUp={openModalPopUp}
					organizationId={String(activeDataTableEditTarget.dataTable.organizationId || '')}
					siteLocationId={String(activeDataTableEditTarget.lookup.cell?.relatedId || '')}
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
				value={colorPickerState.formatName === 'textColor'
					? colorPickerState.target.textColor
					: colorPickerState.formatName === 'fillColor'
						? colorPickerState.target.fillColor
						: null}
			/>
			: null}
		{displayRulesEditorState?.target.valueType && displayRulesEditorPosition
			? <SheetDisplayRulesEditor
				key={`${displayRulesEditorState.target.rowId}:${displayRulesEditorState.target.cellKey}:${displayRulesEditorState.target.valueType}`}
				onClose={closeSheetDisplayRulesEditor}
				onSave={(rules) => {
					void handleSheetDisplayRulesSave(rules);
				}}
				position={displayRulesEditorPosition}
				scrollLeft={scrollState.scrollLeft}
				scrollTop={scrollState.scrollTop}
				value={displayRulesEditorValue}
				valueType={displayRulesEditorState.target.valueType}
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
		hoveredCellState={hoveredCellState}
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
		regionDataTableLabelsById={dataTableLabelsById}
		remoteSelections={remoteSelections}
		mergedRanges={mergedRanges}
		copyRange={copySourceRange}
		fillPreviewRange={fillDragRange}
		showFillHandle={!p.disabled}
		loadingCellCoords={loadingCellCoords}
		loadingRegionRects={p.loadingRegionRects}
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
