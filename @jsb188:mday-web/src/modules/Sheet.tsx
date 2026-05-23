import { useEditSheetCell, useEditSheetDesign } from '@jsb188/graphql/hooks/use-sheet-mtn';
import { useReactiveSheetRows, useSheetRows } from '@jsb188/graphql/hooks/use-sheet-qry';
import { COLORS } from '@jsb188/app/constants/app.ts';
import { getReadableCalDate } from '@jsb188/app/utils/datetime.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import type {
  SheetCellGQL,
  SheetDesignGQL,
  SheetDesignCellGQL,
  SheetDesignViewGQL,
  SheetDesignViewColumnGQL,
  SheetFieldTypeGQL,
  SheetGQL,
  SheetRowGQL,
} from '@jsb188/mday/types/sheet.d.ts';
import { SHEET_HUMAN_LABEL_MAX_LENGTH } from '@jsb188/mday/constants/sheet.ts';
import {
  getOrderedSheetDesignViewColumns,
  getOrderedSheetDesignViews,
  moveVisibleSheetColumnKeyInOrder,
  mapSheetDesignViewColumnToCell,
} from '@jsb188/mday/utils/sheet.ts';
import type { FloatingMessageObj } from '@jsb188/react-web/modules/Layout';
import { useIsomorphicLayoutEffect } from '@jsb188/react-web/utils/dom';
import {
	SHEET_COLUMN_WIDTH,
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	SheetUI,
  clampSheetColumnWidth,
  getSheetCellKey,
  getSheetColumnMetrics,
  getSheetMinimumRowCount,
  getSheetVisibleRange,
  type SheetColumnMetric,
  type SheetColumnWidths,
  type SheetUICell,
  type SheetUIColumn,
  type SheetUIEditState,
  type SheetUIFieldType,
  type SheetUIHeaderEditState,
  type SheetUIColumnReorderDrag,
  type SheetUIColumnReorderDisplacements,
  type SheetUIColumnReorderGuide,
  type SheetUIResizeGuide,
  type SheetUIRowSlot,
  type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
	getInitialSheetDesignReducerState,
	getInitialSheetRowsState,
	getSheetRowsSourceKey,
	mergeSheetDesignPatch,
	mergeSheetDesignWithPatch,
	mergeSheetRowsState,
	sheetCellValueReducer,
	sheetDesignReducer,
	useElementSize,
	useFloatingMessageForSheetRowsReset,
	type SheetDesignPatchInput,
	type SheetRowsState,
} from './use-sheet-states.ts';

/**
 * Dev code
 */

const __DISABLE_EDIT_STATE_RESET__ = globalThis?.location?.hostname === 'localhost' &&
	globalThis?.location?.search.includes('disable_sheet_edit_state_reset=true');

/**
 * Types
 */

export interface SheetProps {
	sheet: SheetGQL;
	children?: ReactNode;
	className?: string;
	limit?: number;
	bufferRows?: number;
	bufferColumns?: number;
	disabled?: boolean;
	allowEdit?: boolean;
	onOpenCell?: (params: SheetOpenCellParams) => void;
	setFloatingMessage?: (message: FloatingMessageObj | null) => void;
}

type SheetParsedEditorValue = {
	value: string | null;
	error?: string;
};

type SheetCellLookup = {
	cell?: SheetCellGQL | null;
	designCell: SheetRuntimeDesignCell;
	row: SheetRowGQL;
};

type SheetOpenCellParams = {
	cell?: SheetCellGQL | null;
	designCell: SheetDesignCellGQL;
	row: SheetRowGQL;
	sheet: SheetGQL;
};

type SheetRuntimeState = {
	columnMetricsByKey: Map<string, SheetColumnMetric>;
	designCellsByKey: Map<string, SheetRuntimeDesignCell>;
	designEditable: boolean;
	disabled?: boolean;
	editState?: SheetUIEditState | null;
	optimisticValues: Record<string, string | null>;
	openCell: (params: SheetOpenCellParams) => void;
	rowCellsById: Map<string, Map<string, SheetCellGQL>>;
	rowsById: Map<string, SheetRowGQL>;
	saveCellValue: (lookup: SheetCellLookup, value: string | null) => Promise<void>;
	sheet: SheetGQL;
	startColumnResize: (columnKey: string, clientX: number) => void;
	startColumnReorder: (columnKey: string, clientX: number) => void;
};

type SheetRuntimeDesignCell = SheetDesignCellGQL & {
	viewSource?: SheetDesignViewColumnGQL['source'] | null;
};

type SheetResizeState = {
	columnKey: string;
	latestWidth?: number;
	startClientX: number;
	startWidth: number;
};

type SheetColumnReorderRuntime = {
	activeViewId: string | null;
	allColumnKeys: string[];
	metrics: SheetColumnMetric[];
	savedOrder?: string[] | null;
	visibleColumnKeys: string[];
};

type SheetColumnReorderState = {
	columnKey: string;
	latestClientX: number;
	latestToVisibleIndex: number;
	startClientX: number;
	startColumnIndex: number;
	startLeft: number;
	startWidth: number;
	started: boolean;
};

type SheetColumnReorderVisualState = {
	columnKey: string;
	dragLeft: number;
	toVisibleIndex: number;
};

type SheetPaginationState = {
	hasMoreRows: boolean;
	lastCursor: string | null;
};

type SheetDesignMutationRuntime = {
	editSheetDesign: (params: {
		variables: {
			organizationId: string;
			sheetId: string;
			design: SheetDesignPatchInput;
		};
	}) => Promise<unknown> | unknown;
	organizationId: string;
	sheetId: string;
};

type SheetTab = {
	id: string | null;
	name: string;
	view?: SheetDesignViewGQL | null;
};

/**
 * Constants
 */

const SHEET_ROWS_LIMIT = 200;
const SHEET_BUFFER_ROWS = 8;
const SHEET_BUFFER_COLUMNS = 3;
const SHEET_FETCH_BUFFER_ROWS = 12;
const SHEET_ROW_RIGHT_PADDING = 64;
const SHEET_MOCK_ROW_COUNT = 5;
const SHEET_MOCK_CELL_TEXT = '... ... ...';
const SHEET_MOCK_ROW_OPACITY_CLASSES = ['', 'op_80', 'op_60', 'op_40', 'op_20'];
const SHEET_COLUMN_REORDER_OVERLAP_THRESHOLD = 0.35;

/*
 * Return ordered design cells from immutable sheet design configuration.
 */

export function getOrderedSheetDesignCells(sheet: SheetGQL): SheetDesignCellGQL[] {
	const cells = sheet.design?.cells || [];
	const cellsByKey = new Map(cells.map((cell) => [cell.key, cell]));
	const orderedCells = (sheet.design?.cellsOrder || [])
		.map((key) => cellsByKey.get(key))
		.filter((cell) => cell && !cell.hidden) as SheetDesignCellGQL[];
	const orderedKeys = new Set(orderedCells.map((cell) => cell.key));
	const remainingCells = cells.filter((cell) => !cell.hidden && !orderedKeys.has(cell.key));

	return orderedCells.concat(remainingCells);
}

/*
 * Return the source master cell key that one runtime column should read and write.
 */

function getSheetRuntimeCellKey(designCell: SheetRuntimeDesignCell) {
	if (designCell.viewSource?.type === 'MASTER_CELL' && designCell.viewSource.cellKey) {
		return designCell.viewSource.cellKey;
	}

	return designCell.key;
}

/*
 * Return ordered view tabs, with the virtual master sheet first.
 */

function getSheetTabs(sheet: SheetGQL, views: SheetDesignViewGQL[]): SheetTab[] {
	const masterTab: SheetTab = {
		id: null,
		name: 'Database',
		view: null,
	};

	return [masterTab].concat(views.map((view) => ({
		id: view.id,
		name: view.name,
		view,
	})));
}

/*
 * Return the saved view matching a selected view id.
 */

function getSelectedSheetView(views: SheetDesignViewGQL[], selectedViewId: string | null) {
	return selectedViewId ? views.find((view) => view.id === selectedViewId) || null : null;
}

/*
 * Return the saved default view id when it still points at a valid view.
 */

function getValidDefaultSheetViewId(design: SheetDesignGQL | null | undefined) {
	const defaultViewId = design?.defaultViewId || null;
	if (!defaultViewId) {
		return null;
	}

	return getOrderedSheetDesignViews(design as any).some((view) => view.id === defaultViewId)
		? defaultViewId
		: null;
}

/*
 * Return whether one view column should be visible in the sheet grid.
 */

function isSheetViewColumnVisible(
	column: SheetDesignViewColumnGQL,
	masterCellsByKey: Map<string, SheetDesignCellGQL>,
) {
	if (column.source?.type !== 'MASTER_CELL' || !column.source.cellKey) {
		return true;
	}

	return !masterCellsByKey.get(column.source.cellKey)?.hidden;
}

/*
 * Convert saved view columns into runtime grid columns backed by master sheet cells.
 */

function getSheetViewRuntimeCells(
	view: SheetDesignViewGQL,
	masterCells: SheetDesignCellGQL[],
): SheetRuntimeDesignCell[] {
	const masterCellsByKey = new Map(masterCells.map((cell) => [cell.key, cell]));

	return getOrderedSheetDesignViewColumns(view as any)
		.filter((column) => isSheetViewColumnVisible(column as SheetDesignViewColumnGQL, masterCellsByKey))
		.map((column) => {
			return mapSheetDesignViewColumnToCell(column as any, masterCellsByKey as any) as SheetRuntimeDesignCell;
		});
}

/*
 * Return persisted column widths from ordered sheet design cells.
 */

function getSheetDesignColumnWidths(designCells: SheetRuntimeDesignCell[]) {
	const columnWidths: SheetColumnWidths = {};

	designCells.forEach((designCell) => {
		if (Number.isFinite(designCell.width)) {
			columnWidths[designCell.key] = clampSheetColumnWidth(Number(designCell.width));
		}
	});

	return columnWidths;
}

/*
 * Return every master sheet design cell key, including hidden cells.
 */

function getAllSheetDesignCellKeys(design: SheetDesignGQL | null | undefined) {
	return (design?.cells || []).map((cell) => cell.key).filter(Boolean);
}

/*
 * Return every column key stored on a sheet view, including currently hidden columns.
 */

function getAllSheetDesignViewColumnKeys(view: SheetDesignViewGQL | null | undefined) {
	return (view?.columns || []).map((column) => column.key).filter(Boolean);
}

/*
 * Return the current reorder persistence target for the active sheet tab.
 */

function getSheetColumnReorderRuntime(params: {
	activeView?: SheetDesignViewGQL | null;
	columnMetrics: SheetColumnMetric[];
	design: SheetDesignGQL;
	visibleColumnKeys: string[];
}) {
	if (params.activeView) {
		return {
			activeViewId: params.activeView.id,
			allColumnKeys: getAllSheetDesignViewColumnKeys(params.activeView),
			metrics: params.columnMetrics,
			savedOrder: params.activeView.columnsOrder,
			visibleColumnKeys: params.visibleColumnKeys,
		} satisfies SheetColumnReorderRuntime;
	}

	return {
		activeViewId: null,
		allColumnKeys: getAllSheetDesignCellKeys(params.design),
		metrics: params.columnMetrics,
		savedOrder: params.design.cellsOrder,
		visibleColumnKeys: params.visibleColumnKeys,
	} satisfies SheetColumnReorderRuntime;
}

/*
 * Return the horizontal rectangle for a dragged header at one pointer position.
 */

function getSheetColumnReorderDraggedRect(params: {
	clientX: number;
	startClientX: number;
	startLeft: number;
	width: number;
}) {
	const left = params.startLeft + params.clientX - params.startClientX;

	return {
		left,
		right: left + params.width,
	};
}

/*
 * Return the visual insertion index nearest to a pointer X coordinate.
 */

function getSheetColumnReorderTargetIndex(params: {
	clientX: number;
	draggedColumnIndex?: number;
	draggedRect?: {
		left: number;
		right: number;
	};
	metrics: SheetColumnMetric[];
	scrollLeft: number;
	scrollNode: HTMLElement;
	stickyColumnCount: number;
}) {
	const viewportRect = params.scrollNode.getBoundingClientRect();
	const targetLeft = params.clientX - viewportRect.left + params.scrollLeft;

	for (let index = 0; index < params.metrics.length; index += 1) {
		const metric = params.metrics[index];
		if (!metric) {
			continue;
		}

		const metricLeft = (metric.columnIndex < params.stickyColumnCount ? params.scrollLeft : 0) +
			SHEET_ROW_NUMBER_WIDTH +
			metric.left;
		const metricRight = metricLeft + metric.width;

		if (params.draggedRect && params.draggedColumnIndex !== undefined) {
			if (metric.columnIndex < params.draggedColumnIndex) {
				if (params.draggedRect.left < metricRight - metric.width * SHEET_COLUMN_REORDER_OVERLAP_THRESHOLD) {
					return index;
				}

				continue;
			}

			if (metric.columnIndex > params.draggedColumnIndex) {
				if (params.draggedRect.right < metricLeft + metric.width * SHEET_COLUMN_REORDER_OVERLAP_THRESHOLD) {
					return index;
				}

				continue;
			}
		}

		const thresholdCoordinate = params.draggedRect
			? (params.draggedRect.left + params.draggedRect.right) / 2
			: targetLeft;

		if (thresholdCoordinate < metricLeft + metric.width / 2) {
			return index;
		}
	}

	return params.metrics.length;
}

/*
 * Convert a raw insertion slot into the visible-key index used after removing the dragged key.
 */

function getSheetColumnReorderMoveIndex(visibleColumnKeys: string[], fromKey: string, toVisibleIndex: number) {
	const fromIndex = visibleColumnKeys.indexOf(fromKey);
	const boundedIndex = Math.max(0, Math.min(toVisibleIndex, visibleColumnKeys.length));

	if (fromIndex < 0) {
		return boundedIndex;
	}

	return boundedIndex > fromIndex ? boundedIndex - 1 : boundedIndex;
}

/*
 * Return the header-row left coordinate for one column metric.
 */

function getSheetColumnMetricHeaderLeft(metric: SheetColumnMetric, scrollLeft: number, stickyColumnCount: number) {
	return (metric.columnIndex < stickyColumnCount ? scrollLeft : 0) + SHEET_ROW_NUMBER_WIDTH + metric.left;
}

/*
 * Return the header-row insertion guide left coordinate for a reorder target.
 */

function getSheetColumnReorderGuideLeft(metrics: SheetColumnMetric[], toVisibleIndex: number, scrollLeft: number, stickyColumnCount: number) {
	const targetMetric = metrics[toVisibleIndex];
	if (targetMetric) {
		return getSheetColumnMetricHeaderLeft(targetMetric, scrollLeft, stickyColumnCount) - 1;
	}

	const lastMetric = metrics[metrics.length - 1];
	if (!lastMetric) {
		return SHEET_ROW_NUMBER_WIDTH;
	}

	return getSheetColumnMetricHeaderLeft(lastMetric, scrollLeft, stickyColumnCount) + lastMetric.width - 1;
}

/*
 * Return transform offsets that make header cells slide aside during a column drag.
 */

function getSheetColumnReorderHeaderDisplacements(params: {
	columnKey: string;
	metrics: SheetColumnMetric[];
	scrollLeft: number;
	stickyColumnCount: number;
	toVisibleIndex: number;
	visibleColumnKeys: string[];
}) {
	const fromIndex = params.visibleColumnKeys.indexOf(params.columnKey);
	if (fromIndex < 0) {
		return null;
	}

	const toIndex = getSheetColumnReorderMoveIndex(
		params.visibleColumnKeys,
		params.columnKey,
		params.toVisibleIndex,
	);
	if (fromIndex === toIndex) {
		return null;
	}

	const metricsByKey = new Map(params.metrics.map((metric) => [metric.column.key, metric]));
	const projectedOrder = params.visibleColumnKeys.slice(0);
	const [movedKey] = projectedOrder.splice(fromIndex, 1);
	if (!movedKey) {
		return null;
	}

	projectedOrder.splice(toIndex, 0, movedKey);

	const currentLefts = new Map(params.metrics.map((metric) => {
		return [
			metric.column.key,
			getSheetColumnMetricHeaderLeft(metric, params.scrollLeft, params.stickyColumnCount),
		];
	}));
	const displacements: SheetUIColumnReorderDisplacements = {};
	let nextLeft = 0;

	projectedOrder.forEach((columnKey, columnIndex) => {
		const metric = metricsByKey.get(columnKey);
		if (!metric) {
			return;
		}

		const projectedLeft = (
			columnIndex < params.stickyColumnCount ? params.scrollLeft : 0
		) + SHEET_ROW_NUMBER_WIDTH + nextLeft + (
			columnIndex >= params.stickyColumnCount ? SHEET_STICKY_SPACER_SIZE : 0
		);
		const currentLeft = currentLefts.get(columnKey);
		const displacement = currentLeft === undefined ? 0 : projectedLeft - currentLeft;

		if (columnKey !== params.columnKey && displacement) {
			displacements[columnKey] = displacement;
		}

		nextLeft += metric.width;
	});

	return Object.keys(displacements).length ? displacements : null;
}

/*
 * Return the human-facing header label for one sheet design cell.
 */

function getSheetDesignCellHeaderLabel(designCell: SheetDesignCellGQL) {
	return designCell.humanLabel || designCell.label || designCell.key;
}

/*
 * Convert a header editor draft into the stored human label patch value.
 */

function getSheetHeaderHumanLabelPatchValue(designCell: SheetDesignCellGQL, draftValue: string) {
	const value = draftValue.trim().slice(0, SHEET_HUMAN_LABEL_MAX_LENGTH);
	const fallbackLabel = designCell.label || designCell.key;

	return value && value !== fallbackLabel ? value : null;
}

/*
 * Convert a GraphQL design cell into an app-agnostic UI column.
 */

function getSheetUIColumn(designCell: SheetDesignCellGQL): SheetUIColumn {
	return {
		id: designCell.key,
		key: designCell.key,
		label: getSheetDesignCellHeaderLabel(designCell),
		fieldType: designCell.humanFieldType as SheetUIFieldType,
		options: designCell.options || [],
		openLink: designCell.openLink,
		humansCannotEdit: designCell.humansCannotEdit,
	};
}

/*
 * Parse one persisted sheet cell string into a displayable JavaScript value.
 */

function parseSheetRawValue(value?: unknown | null) {
	if (value === undefined || value === null || value === '') {
		return null;
	}

	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

/*
 * Convert any sheet value into the string shown inside a grid cell.
 */

function stringifySheetDisplayValue(value: unknown) {
	if (value === undefined || value === null) {
		return '';
	}

	if (typeof value === 'string') {
		return value;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	return JSON.stringify(value);
}

/*
 * Return the persisted cell value for a given field type.
 */

function getSheetCellSerializedValue(
	cell: SheetCellGQL | null | undefined,
	designCell: SheetDesignCellGQL,
	optimisticValue?: string | null,
) {
	if (optimisticValue !== undefined) {
		return optimisticValue;
	}

	if (!cell) {
		return null;
	}

	if (designCell.humanFieldType === 'NUMBER' && typeof cell.numberValue === 'number' && Number.isFinite(cell.numberValue)) {
		return String(cell.numberValue);
	}

	if (designCell.humanFieldType === 'BOOLEAN' && cell.booleanValue !== undefined && cell.booleanValue !== null) {
		return String(cell.booleanValue);
	}

	if (designCell.humanFieldType === 'DATE' && cell.dateValue) {
		return String(cell.dateValue).split('T')[0];
	}

	if (designCell.humanFieldType === 'DATETIME' && cell.datetimeValue) {
		return String(cell.datetimeValue);
	}

	return cell.value ?? cell.textValue ?? null;
}

/*
 * Find the sheet cell for one design column on a row.
 */

function getSheetCellForDesign(row: SheetRowGQL, designCell: SheetRuntimeDesignCell) {
	return row.cells?.find((cell) => cell.cellKey === getSheetRuntimeCellKey(designCell)) || null;
}

/*
 * Return one sheet cell's numeric value for client-side computed view fallback.
 */

function getSheetCellNumericValue(cell: SheetCellGQL | null | undefined) {
	if (!cell) {
		return 0;
	}

	if (typeof cell.numberValue === 'number' && Number.isFinite(cell.numberValue)) {
		return cell.numberValue;
	}

	const rawValue = parseSheetRawValue(cell.value ?? cell.textValue ?? null);
	const numberValue = Number(rawValue);

	return Number.isFinite(numberValue) ? numberValue : 0;
}

/*
 * Build a read-only computed cell when the server row is missing its synthetic computed cell.
 */

function getSheetComputedFallbackCell(
	row: SheetRowGQL,
	rowCellMap: Map<string, SheetCellGQL> | null | undefined,
	designCell: SheetRuntimeDesignCell,
) {
	if (designCell.viewSource?.type !== 'COMPUTED' || designCell.viewSource.operation !== 'SUM') {
		return null;
	}

	const value = (designCell.viewSource.sourceCellKeys || []).reduce((sum, cellKey) => {
		return sum + getSheetCellNumericValue(rowCellMap?.get(cellKey));
	}, 0);

	return {
		id: `synthetic:${row.id}:${designCell.key}`,
		sheetId: row.sheetId,
		sheetRowId: row.id,
		cellKey: designCell.key,
		value: String(value),
		textValue: String(value),
		numberValue: value,
		booleanValue: null,
		dateValue: null,
		datetimeValue: null,
		createdAt: '',
		updatedAt: '',
	} satisfies SheetCellGQL;
}

/*
 * Find the server cell for one design column or build a computed view fallback.
 */

function getSheetCellForRuntimeColumn(
	row: SheetRowGQL,
	rowCellMap: Map<string, SheetCellGQL> | null | undefined,
	designCell: SheetRuntimeDesignCell,
) {
	return rowCellMap?.get(getSheetRuntimeCellKey(designCell)) ||
		getSheetComputedFallbackCell(row, rowCellMap, designCell);
}

/*
 * Find the label for a select value from one design cell.
 */

function getSheetOptionLabel(designCell: SheetDesignCellGQL, value: string) {
	return designCell.options?.find((option) => option.value === value)?.label || value;
}

/*
 * Check whether one sheet field type should display select option styling.
 */

function isSheetSelectDisplayFieldType(humanFieldType: SheetFieldTypeGQL) {
	return humanFieldType === 'SELECT' || humanFieldType === 'SELECT_OR_TEXT';
}

/*
 * Return a safe sheet option color name for a select-style display pill.
 */

function getValidSheetOptionColor(color?: string | null) {
	return typeof color === 'string' && COLORS.includes(color as any) ? color : 'zinc';
}

/*
 * Return the background color class for one select-style sheet cell value.
 */

function getSheetSelectDisplayColorClassName(designCell: SheetDesignCellGQL, value: string) {
	const option = designCell.options?.find((item) => item.value === value);
	return `bg_${getValidSheetOptionColor(option?.color)}_md`;
}

/*
 * Return the hover background class for one select-style sheet cell with a valid option color.
 */

function getSheetSelectCellClassName(designCell: SheetDesignCellGQL, value: string) {
	const option = designCell.options?.find((item) => item.value === value);
	if (typeof option?.color !== 'string' || !COLORS.includes(option.color as any)) {
		return undefined;
	}

	return `bg_${option.color}_fd_hv`;
}

/*
 * Format one sheet DATE value for display in the grid.
 */

function getSheetDateDisplayValue(value: unknown) {
	if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
		return '';
	}

	return getReadableCalDate(value instanceof Date ? value : String(value)) || stringifySheetDisplayValue(value);
}

/*
 * Convert one cell and design column into the display string shown in the grid.
 */

function getSheetCellDisplayValue(
	cell: SheetCellGQL | null | undefined,
	designCell: SheetDesignCellGQL,
	optimisticValue?: string | null,
) {
	const rawValue = parseSheetRawValue(getSheetCellSerializedValue(cell, designCell, optimisticValue));

	if (designCell.humanFieldType === 'DATE') {
		return getSheetDateDisplayValue(rawValue);
	}

	if ((designCell.humanFieldType === 'SELECT' || designCell.humanFieldType === 'SELECT_OR_TEXT') && typeof rawValue === 'string') {
		return getSheetOptionLabel(designCell, rawValue);
	}

	if (designCell.humanFieldType === 'MULTI_SELECT') {
		const values = Array.isArray(rawValue)
			? rawValue
			: typeof rawValue === 'string'
				? rawValue.split(',').map((value) => value.trim()).filter(Boolean)
				: [];

		return values.map((value) => getSheetOptionLabel(designCell, String(value))).join(', ');
	}

	return stringifySheetDisplayValue(rawValue);
}

/*
 * Return the display class for one cell value shown in the grid.
 */

function getSheetCellDisplayClassName(
	cell: SheetCellGQL | null | undefined,
	designCell: SheetDesignCellGQL,
	optimisticValue?: string | null,
) {
	if (!isSheetSelectDisplayFieldType(designCell.humanFieldType)) {
		return undefined;
	}

	const rawValue = parseSheetRawValue(getSheetCellSerializedValue(cell, designCell, optimisticValue));
	if (typeof rawValue !== 'string' || !rawValue) {
		return undefined;
	}

	return [
		'ellip',
		'px_5',
		'py_2',
		'r_4',
		getSheetSelectDisplayColorClassName(designCell, rawValue),
	].join(' ');
}

/*
 * Return the container class for one cell value shown in the grid.
 */

function getSheetCellClassName(
	cell: SheetCellGQL | null | undefined,
	designCell: SheetDesignCellGQL,
	optimisticValue?: string | null,
) {
	if (!isSheetSelectDisplayFieldType(designCell.humanFieldType)) {
		return undefined;
	}

	const rawValue = parseSheetRawValue(getSheetCellSerializedValue(cell, designCell, optimisticValue));
	if (typeof rawValue !== 'string' || !rawValue) {
		return undefined;
	}

	return getSheetSelectCellClassName(designCell, rawValue);
}

/*
 * Convert one cell value into an editable draft string.
 */

function getSheetEditorDraftValue(
	cell: SheetCellGQL | null | undefined,
	designCell: SheetDesignCellGQL,
	optimisticValue?: string | null,
) {
	const serializedValue = getSheetCellSerializedValue(cell, designCell, optimisticValue);
	const rawValue = parseSheetRawValue(serializedValue);

	if (designCell.humanFieldType === 'MULTI_SELECT' && Array.isArray(rawValue)) {
		return rawValue.map((value) => String(value)).join(', ');
	}

	if (designCell.humanFieldType === 'DATETIME' && typeof rawValue === 'string') {
		return rawValue.slice(0, 16);
	}

	return stringifySheetDisplayValue(rawValue);
}

/*
 * Return a compact key for design options that affect rendered cell text.
 */

function getSheetDesignOptionsStateKey(designCell: SheetDesignCellGQL) {
	return (designCell.options || [])
		.map((option) => [option.label, option.value, option.color || ''].join('\u0001'))
		.join('\u0002');
}

/*
 * Return a stable comparison key for one rendered UI cell.
 */

function getSheetUICellSignature(p: {
	canEdit: boolean;
	canOpen: boolean;
	designCell: SheetDesignCellGQL;
	iconName?: string | null;
	serializedValue: string | null;
}) {
	return [
		p.serializedValue ?? '',
		p.iconName ?? '',
		p.canEdit ? '1' : '0',
		p.canOpen ? '1' : '0',
		p.designCell.humanFieldType,
		getSheetDesignOptionsStateKey(p.designCell),
	].join('\u0000');
}

/*
 * Build per-row cell maps once so visible row generation can use O(1) lookups.
 */

function getSheetRowCellsById(rows: SheetRowGQL[]) {
	return new Map(rows.map((row) => {
		return [
			row.id,
			new Map((row.cells || []).map((cell) => [cell.cellKey, cell])),
		];
	}));
}

/*
 * Return the opacity class used for one loading mock row.
 */

function getSheetMockRowOpacityClass(rowIndex: number) {
	return SHEET_MOCK_ROW_OPACITY_CLASSES[rowIndex] || '';
}

/*
 * Return whether the last visual row is viewport filler rather than sheet data.
 */

function hasSheetPlaceholderTail(isSheetRowsReady: boolean, renderedRowCount: number, visualRowCount: number) {
	return isSheetRowsReady && renderedRowCount < visualRowCount;
}

/*
 * Return the body height used by visual rows when the last row is viewport filler.
 */

function getSheetVisualRowsHeight(
	visualRowCount: number,
	viewportHeight: number,
	stickyHeaderHeight: number,
	hasPlaceholderTail_: boolean,
) {
	if (!hasPlaceholderTail_ || visualRowCount === 0) {
		return visualRowCount * SHEET_ROW_HEIGHT;
	}

	return Math.max(0, viewportHeight - stickyHeaderHeight);
}

/*
 * Return the rendered height for one visual row.
 */

function getSheetVisualRowHeight(
	rowIndex: number,
	visualRowCount: number,
	viewportHeight: number,
	stickyHeaderHeight: number,
	hasPlaceholderTail_: boolean,
) {
	if (!hasPlaceholderTail_ || rowIndex !== visualRowCount - 1) {
		return SHEET_ROW_HEIGHT;
	}

	const usedHeight = (visualRowCount - 1) * SHEET_ROW_HEIGHT;
	const remainingHeight = viewportHeight - stickyHeaderHeight - usedHeight;

	return Math.min(SHEET_ROW_HEIGHT, Math.max(0, remainingHeight));
}

/*
 * Build one mock cell for the loading rows shown before row data is ready.
 */

function getSheetMockUICell(cellKey: string, rowIndex: number): SheetUICell {
	return {
		cellKey,
		displayValue: SHEET_MOCK_CELL_TEXT,
		displayClassName: ['mock active bl min_w_50_pc', getSheetMockRowOpacityClass(rowIndex)].filter(Boolean).join(' '),
		draftValue: '',
	};
}

/*
 * Parse the current editor draft into the serialized value stored by GraphQL.
 */

function isValidSheetDateInputValue(value: string) {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) {
		return false;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));

	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/*
 * Return whether one editor datetime value can be parsed safely.
 */

function isValidSheetDateTimeInputValue(value: string) {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/);
	if (!match || !isValidSheetDateInputValue(`${match[1]}-${match[2]}-${match[3]}`)) {
		return false;
	}

	const hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = match[6] === undefined ? 0 : Number(match[6]);

	return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

/*
 * Return whether one editor value matches a saved sheet option.
 */

function isSheetEditorOptionValue(designCell: SheetDesignCellGQL, value: unknown) {
	return (designCell.options || []).some((option) => String(option.value) === String(value));
}

/*
 * Parse the current editor draft into the serialized value stored by GraphQL.
 */

export function parseSheetEditorValue(designCell: SheetDesignCellGQL, draftValue: string): SheetParsedEditorValue {
	const humanFieldType = designCell.humanFieldType;
	const value = draftValue.trim();

	if (!value) {
		return { value: null };
	}

	if (humanFieldType === 'NUMBER') {
		const numberValue = Number(value);

		if (!Number.isFinite(numberValue)) {
			return {
				error: 'Invalid number',
				value: null,
			};
		}

		return { value };
	}

	if (humanFieldType === 'BOOLEAN') {
		if (value !== 'true' && value !== 'false') {
			return {
				error: 'Invalid boolean',
				value: null,
			};
		}

		return { value };
	}

	if (humanFieldType === 'DATE') {
		if (!isValidSheetDateInputValue(value)) {
			return {
				error: 'Invalid date',
				value: null,
			};
		}

		return { value };
	}

	if (humanFieldType === 'DATETIME') {
		if (!isValidSheetDateTimeInputValue(value)) {
			return {
				error: 'Invalid datetime',
				value: null,
			};
		}

		return { value };
	}

	if (humanFieldType === 'SELECT' && designCell.options?.length && !isSheetEditorOptionValue(designCell, value)) {
		return {
			error: 'Invalid option',
			value: null,
		};
	}

	if (humanFieldType === 'MULTI_SELECT') {
		let values: string[];

		if (value.startsWith('[')) {
			try {
				const parsedValue = JSON.parse(value);

				if (!Array.isArray(parsedValue)) {
					return {
						error: 'Invalid list',
						value: null,
					};
				}

				values = parsedValue.map((item) => String(item));
			} catch {
				return {
					error: 'Invalid list',
					value: null,
				};
			}
		} else {
			values = value.split(',').map((item) => item.trim()).filter(Boolean);
		}

		if (designCell.options?.length) {
			const invalidValues = values.filter((item) => !isSheetEditorOptionValue(designCell, item));
			if (invalidValues.length) {
				return {
					error: 'Invalid option',
					value: null,
				};
			}
		}

		return { value: JSON.stringify(values) };
	}

	if (humanFieldType === 'JSON') {
		try {
			JSON.parse(value);
			return { value };
		} catch {
			return {
				error: 'Invalid JSON',
				value: null,
			};
		}
	}

	return { value: draftValue };
}

/*
 * Read the current value from an active sheet editor element.
 */

function getSheetEditorElementValue(element: HTMLElement) {
	if (
		element instanceof HTMLInputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	) {
		return element.value;
	}

	return '';
}

/*
 * Find the closest matching element from a delegated DOM event target.
 */

function getClosestSheetElement(target: EventTarget | null, selector: string) {
	if (!(target instanceof Element)) {
		return null;
	}

	return target.closest(selector) as HTMLElement | null;
}

/*
 * Read one cell lookup from the latest runtime state.
 */

function getSheetCellLookup(runtime: SheetRuntimeState, rowId?: string | null, cellKey?: string | null): SheetCellLookup | null {
	if (!rowId || !cellKey) {
		return null;
	}

	const row = runtime.rowsById.get(rowId);
	const designCell = runtime.designCellsByKey.get(cellKey);

	if (!row || !designCell) {
		return null;
	}

	return {
		cell: runtime.rowCellsById.get(row.id)?.get(getSheetRuntimeCellKey(designCell)) || null,
		designCell,
		row,
	};
}

/*
 * Build the active cell edit state for one resolved sheet cell lookup.
 */

function getSheetCellEditState(runtime: SheetRuntimeState, lookup: SheetCellLookup): SheetUIEditState {
	const optimisticKey = getSheetCellKey(lookup.row.id, lookup.designCell.key);

	return {
		cellKey: lookup.designCell.key,
		draftValue: getSheetEditorDraftValue(
			lookup.cell,
			lookup.designCell,
			runtime.optimisticValues[optimisticKey],
		),
		rowId: lookup.row.id,
	};
}

/*
 * Log a clickable sheet cell for the initial open-link behavior.
 */

function openSheetCellLink(params: SheetOpenCellParams) {
	console.log(params.cell);
}

/*
 * Render a GraphQL-backed spreadsheet for an immutable sheet design.
 */

export function Sheet(p: SheetProps) {
	const {
		allowEdit,
		bufferColumns = SHEET_BUFFER_COLUMNS,
		bufferRows = SHEET_BUFFER_ROWS,
		children,
		className,
		disabled,
		limit = SHEET_ROWS_LIMIT,
		setFloatingMessage,
		sheet,
	} = p;
	const sheetId = sheet.id;
	const organizationId = sheet.organizationId;
	const effectiveDisabled = disabled || !allowEdit;
	const scrollElement = useElementSize<HTMLDivElement>();
	const fetchingMoreRef = useRef(false);
	const runtimeRef = useRef<SheetRuntimeState | null>(null);
	const resizeStateRef = useRef<SheetResizeState | null>(null);
	const resizeFrameRef = useRef<number | null>(null);
	const resizeCleanupRef = useRef<(() => void) | null>(null);
	const columnReorderRuntimeRef = useRef<SheetColumnReorderRuntime | null>(null);
	const columnReorderStateRef = useRef<SheetColumnReorderState | null>(null);
	const columnReorderFrameRef = useRef<number | null>(null);
	const columnReorderCleanupRef = useRef<(() => void) | null>(null);
	const designSaveInFlightRef = useRef(false);
	const pendingDesignPatchRef = useRef<SheetDesignPatchInput | null>(null);
	const inFlightDesignPatchRef = useRef<{
		patch: SheetDesignPatchInput;
		sheetId: string;
	} | null>(null);
	const drainSheetDesignSaveRef = useRef<(() => void) | null>(null);
	const latestSavedColumnWidthsRef = useRef<SheetColumnWidths>({});
	const designMutationRuntimeRef = useRef<SheetDesignMutationRuntime | null>(null);
	const cellUICacheRef = useRef(new Map<string, {
		cell: SheetUICell;
		signature: string;
	}>());
	const committingEditorRef = useRef(false);
	const scrollFrameRef = useRef<number | null>(null);
	const pendingScrollRef = useRef({
		scrollLeft: 0,
		scrollTop: 0,
	});
	const paginationRef = useRef<SheetPaginationState>({
		hasMoreRows: true,
		lastCursor: null,
	});
	const [editState, setEditState] = useState<SheetUIEditState | null>(null);
	const [headerEditState, setHeaderEditState] = useState<SheetUIHeaderEditState | null>(null);
	const [columnReorderVisualState, setColumnReorderVisualState] = useState<SheetColumnReorderVisualState | null>(null);
	const [optimisticValues, dispatchOptimisticValues] = useReducer(sheetCellValueReducer, {});
	const [resizingColumnKey, setResizingColumnKey] = useState<string | null>(null);
	const [singleClickedCellState, setSingleClickedCellState] = useState<SheetUISelectedCellState | null>(null);
	const singleClickedCellStateRef = useRef<SheetUISelectedCellState | null>(null);
	const [selectedViewId, setSelectedViewId] = useState<string | null>(() => getValidDefaultSheetViewId(sheet.design));
	const [designState, dispatchDesignState] = useReducer(
		sheetDesignReducer,
		undefined,
		() => getInitialSheetDesignReducerState(sheetId, sheet.design),
	);
	const [scrollState, setScrollState] = useState({
		scrollLeft: 0,
		scrollTop: 0,
	});
	const { editSheetCell } = useEditSheetCell();
	const { editSheetDesign } = useEditSheetDesign();

	singleClickedCellStateRef.current = singleClickedCellState;

	const effectiveDesign = useMemo(() => {
		if (designState.sheetId !== sheetId) {
			return sheet.design;
		}

		return mergeSheetDesignWithPatch(designState.serverDesign, designState.localPatch);
	}, [designState.localPatch, designState.serverDesign, designState.sheetId, sheet.design, sheetId]);
	const effectiveSheet = useMemo(() => {
		return {
			...sheet,
			design: effectiveDesign,
		};
	}, [effectiveDesign, sheet]);
	const sheetViews = useMemo(() => {
		return getOrderedSheetDesignViews(effectiveDesign as any) as SheetDesignViewGQL[];
	}, [effectiveDesign]);
	const activeView = useMemo(() => {
		return getSelectedSheetView(sheetViews, selectedViewId);
	}, [selectedViewId, sheetViews]);
	const sheetRowsFilter = useMemo(() => {
		return activeView ? { viewId: activeView.id } : null;
	}, [activeView]);
	const rowSourceKey = useMemo(() => {
		return getSheetRowsSourceKey(sheetId, activeView?.id || null);
	}, [activeView?.id, sheetId]);
	const [rowState, setRowState] = useState<SheetRowsState>(() => getInitialSheetRowsState(rowSourceKey));
	const {
		sheetRows,
		fetchMore,
		resetOnlyTime,
		variables: sheetRowsVariables,
	} = useSheetRows(sheetId, organizationId, null, limit, sheetRowsFilter);
	useFloatingMessageForSheetRowsReset(resetOnlyTime, setFloatingMessage);
	const isSheetRowsDataCurrent = (
		String(sheetRowsVariables?.sheetId || '') === String(sheetId || '') &&
		String(sheetRowsVariables?.organizationId || '') === String(organizationId || '') &&
		(sheetRowsVariables?.filter?.viewId || null) === (sheetRowsFilter?.viewId || null)
	);
	const isSheetRowsReady = Array.isArray(sheetRows) && isSheetRowsDataCurrent;
	const masterDesignCells = useMemo(() => {
		return effectiveSheet.design?.cells || [];
	}, [effectiveSheet.design?.cells]);
	const masterColumns = useMemo(() => {
		return getOrderedSheetDesignCells(effectiveSheet);
	}, [effectiveSheet]);
	const serverColumns = useMemo(() => {
		return getOrderedSheetDesignCells({
			...sheet,
			design: designState.sheetId === sheetId ? designState.serverDesign : sheet.design,
		});
	}, [designState.serverDesign, designState.sheetId, sheet, sheet.design, sheetId]);
	const columns = useMemo(() => {
		return activeView ? getSheetViewRuntimeCells(activeView, masterDesignCells) : masterColumns;
	}, [activeView, masterColumns, masterDesignCells]);
	const columnKeys = useMemo(() => {
		return columns.map((column) => column.key);
	}, [columns]);
	const uiColumns = useMemo(() => {
		return columns.map(getSheetUIColumn);
	}, [columns]);
	const savedColumnWidths = useMemo(() => {
		return getSheetDesignColumnWidths(serverColumns);
	}, [serverColumns]);
	latestSavedColumnWidthsRef.current = savedColumnWidths;
	const mergedColumnWidths = useMemo(() => {
		return {
			...savedColumnWidths,
			...getSheetDesignColumnWidths(columns),
		};
	}, [columns, savedColumnWidths]);
	const columnMetricsData = useMemo(() => {
		return getSheetColumnMetrics(uiColumns, mergedColumnWidths);
	}, [mergedColumnWidths, uiColumns]);
	const stickyColumnCount = activeView?.stickyLeft ?? effectiveDesign.stickyLeft ?? 0;
	const columnReorderMetrics = useMemo(() => {
		return columnMetricsData.metrics.map((metric) => {
			if (metric.columnIndex < stickyColumnCount) {
				return metric;
			}

			return {
				...metric,
				left: metric.left + SHEET_STICKY_SPACER_SIZE,
			};
		});
	}, [columnMetricsData.metrics, stickyColumnCount]);
	const columnMetricsByKey = useMemo(() => {
		return new Map(columnMetricsData.metrics.map((metric) => [metric.column.key, metric]));
	}, [columnMetricsData.metrics]);
	const designCellsByKey = useMemo(() => {
		return new Map(columns.map((cell) => [cell.key, cell]));
	}, [columns]);

	columnReorderRuntimeRef.current = getSheetColumnReorderRuntime({
		activeView,
		columnMetrics: columnReorderMetrics,
		design: effectiveDesign,
		visibleColumnKeys: columnKeys,
	});

	useIsomorphicLayoutEffect(() => {
		setEditState(null);
		setHeaderEditState(null);
		setSingleClickedCellState(null);
		singleClickedCellStateRef.current = null;
		dispatchOptimisticValues({
			type: 'reset',
		});
		setColumnReorderVisualState(null);
		setRowState(getInitialSheetRowsState(rowSourceKey));
		setScrollState({
			scrollLeft: 0,
			scrollTop: 0,
		});
		cellUICacheRef.current.clear();
		pendingDesignPatchRef.current = null;
	}, [rowSourceKey]);

	useIsomorphicLayoutEffect(() => {
		setSelectedViewId(getValidDefaultSheetViewId(sheet.design));
	}, [sheetId]);

	useEffect(() => {
		if (selectedViewId && !sheetViews.some((view) => view.id === selectedViewId)) {
			setSelectedViewId(getValidDefaultSheetViewId(effectiveDesign));
		}
	}, [effectiveDesign, selectedViewId, sheetViews]);

	useEffect(() => {
		dispatchDesignState({
			design: sheet.design,
			sheetId,
			type: 'server_design_received',
		});
	}, [sheet.design, sheetId]);

	designMutationRuntimeRef.current = {
		editSheetDesign,
		organizationId,
		sheetId,
	};

	useIsomorphicLayoutEffect(() => {
		if (isSheetRowsReady) {
			setRowState((currentState) => mergeSheetRowsState(currentState, rowSourceKey, sheetRows as SheetRowGQL[], limit));
		}
	}, [isSheetRowsReady, limit, rowSourceKey, sheetRows]);

	useEffect(() => {
		const loadedRowIds = new Set(rowState.rowIds);
		const activeCellKeys = new Set(designCellsByKey.keys());

		cellUICacheRef.current.forEach((_, cacheKey) => {
			const [rowId, cellKey] = cacheKey.split(':');

			if (!loadedRowIds.has(rowId) || !activeCellKeys.has(cellKey || '')) {
				cellUICacheRef.current.delete(cacheKey);
			}
		});
	}, [designCellsByKey, rowState.rowIds]);

	const rowStateMatchesSource = rowState.sourceKey === rowSourceKey;
	const rows = useMemo(() => {
		if (!rowStateMatchesSource) {
			return [];
		}

		return rowState.rowIds.map((rowId) => rowState.rowsById[rowId]).filter(Boolean);
	}, [rowState.rowIds, rowState.rowsById, rowStateMatchesSource]);
	const reactiveRows = useReactiveSheetRows(rows) as SheetRowGQL[] | null;
	const renderedRows = isSheetRowsReady && rowStateMatchesSource ? reactiveRows || rows : [];
	const rowsById = useMemo(() => {
		return new Map(renderedRows.map((row) => [row.id, row]));
	}, [renderedRows]);
	const rowCellsById = useMemo(() => {
		return getSheetRowCellsById(renderedRows);
	}, [renderedRows]);

	useEffect(() => {
		const confirmedKeys: string[] = [];

		Object.entries(optimisticValues).forEach(([optimisticKey, optimisticValue]) => {
			const [rowId, cellKey] = optimisticKey.split(':');
			const designCell = designCellsByKey.get(cellKey || '');
			if (!rowId || !designCell) {
				return;
			}

			const cell = rowCellsById.get(rowId)?.get(getSheetRuntimeCellKey(designCell));
			const serverValue = getSheetCellSerializedValue(cell, designCell);

			if (serverValue === optimisticValue) {
				confirmedKeys.push(optimisticKey);
			}
		});

		if (confirmedKeys.length) {
			dispatchOptimisticValues({
				confirmedKeys,
				type: 'server_values_received',
			});
		}
	}, [designCellsByKey, optimisticValues, rowCellsById]);

	paginationRef.current = {
		hasMoreRows: rowStateMatchesSource ? rowState.hasMoreRows : true,
		lastCursor: renderedRows[renderedRows.length - 1]?.cursor || null,
	};
	const saveCellValue = useCallback(async (lookup: SheetCellLookup, value: string | null) => {
		dispatchOptimisticValues({
			cellKey: lookup.designCell.key,
			rowId: lookup.row.id,
			type: 'local_value_queued',
			value,
		});

		try {
			await editSheetCell({
				variables: {
					organizationId,
					sheetId,
					sheetRowId: lookup.row.id,
					cellKey: getSheetRuntimeCellKey(lookup.designCell),
					viewId: activeView?.id || null,
					viewCellKey: activeView ? lookup.designCell.key : null,
					value,
				},
			});
		} catch (error) {
			dispatchOptimisticValues({
				cellKey: lookup.designCell.key,
				rowId: lookup.row.id,
				type: 'local_value_reverted',
			});
			throw error;
		}
	}, [activeView, editSheetCell, organizationId, sheetId]);
	const fetchMoreRows = useCallback(async () => {
		const pagination = paginationRef.current;

		if (fetchingMoreRef.current || !pagination.hasMoreRows || !pagination.lastCursor) {
			return;
		}

		fetchingMoreRef.current = true;

		try {
			const result = await fetchMore({
				variables: {
					sheetId,
					organizationId,
					cursor: pagination.lastCursor,
					limit,
					filter: sheetRowsFilter,
				},
			});
			const nextRows = result?.data?.sheetRows || result?.sheetRows || [];

			if (Array.isArray(nextRows)) {
				setRowState((currentState) => mergeSheetRowsState(currentState, rowSourceKey, nextRows as SheetRowGQL[], limit, true));
			}
		} finally {
			fetchingMoreRef.current = false;
		}
	}, [fetchMore, limit, organizationId, rowSourceKey, sheetId, sheetRowsFilter]);

	const drainSheetDesignSave = useCallback(() => {
		if (designSaveInFlightRef.current || !pendingDesignPatchRef.current) {
			return;
		}

		const runtime = designMutationRuntimeRef.current;
		const pendingPatch = pendingDesignPatchRef.current;

		if (!runtime) {
			return;
		}

		pendingDesignPatchRef.current = null;
		inFlightDesignPatchRef.current = {
			patch: pendingPatch,
			sheetId: runtime.sheetId,
		};
		designSaveInFlightRef.current = true;

		void (async () => {
			try {
				await runtime.editSheetDesign({
					variables: {
						organizationId: runtime.organizationId,
						sheetId: runtime.sheetId,
						design: pendingPatch,
					},
				});
			} catch (error) {
				console.error(error);
			} finally {
				designSaveInFlightRef.current = false;
				inFlightDesignPatchRef.current = null;

				if (pendingDesignPatchRef.current) {
					drainSheetDesignSaveRef.current?.();
				}
			}
		})();
	}, []);

	drainSheetDesignSaveRef.current = drainSheetDesignSave;

	const queueSheetDesignSave = useCallback((patch: SheetDesignPatchInput) => {
		pendingDesignPatchRef.current = mergeSheetDesignPatch(pendingDesignPatchRef.current, patch);
		drainSheetDesignSave();
	}, [drainSheetDesignSave]);

	const commitHeaderEditorElement = useCallback((editorElement: HTMLElement) => {
		const runtime = runtimeRef.current;
		const cellKey = editorElement.dataset.cellKey;
		const designCell = cellKey ? runtime?.designCellsByKey.get(cellKey) : null;

    if (!__DISABLE_EDIT_STATE_RESET__) {
      setHeaderEditState(null);
    }

		if (!runtime || runtime.disabled || !runtime.designEditable || !designCell || runtime.sheet.design?.humansCannotEdit || designCell.humansCannotEdit) {
			return;
		}

		const humanLabel = getSheetHeaderHumanLabelPatchValue(designCell, getSheetEditorElementValue(editorElement));
		const currentHumanLabel = designCell.humanLabel || null;

		if (currentHumanLabel === humanLabel) {
			return;
		}

		const patch = {
			cells: [{
				humanLabel,
				key: designCell.key,
			}],
		};

		dispatchDesignState({
			patch,
			type: 'local_patch_queued',
		});
		queueSheetDesignSave(patch);
	}, [queueSheetDesignSave]);

	const startColumnResize = useCallback((columnKey: string, clientX: number) => {
		const runtime = runtimeRef.current;
		const metric = runtime?.columnMetricsByKey.get(columnKey);

		if (!runtime || runtime.disabled || !runtime.designEditable || !metric || columnReorderStateRef.current?.started) {
			return;
		}

		resizeCleanupRef.current?.();
		resizeStateRef.current = {
			columnKey,
			startClientX: clientX,
			startWidth: metric.width,
		};
		setResizingColumnKey(columnKey);

		const finishResize = (clientX?: number) => {
			const resizeState = resizeStateRef.current;
			const latestWidth = resizeState
				? resizeState.latestWidth ?? (
					Number.isFinite(clientX)
						? clampSheetColumnWidth(resizeState.startWidth + Number(clientX) - resizeState.startClientX)
						: resizeState.startWidth
				)
				: null;

			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
				resizeFrameRef.current = null;
			}

			if (resizeState && latestWidth !== null) {
				dispatchDesignState({
					patch: {
						cells: [{
							key: resizeState.columnKey,
							width: latestWidth,
						}],
					},
					type: 'local_patch_queued',
				});

				const savedWidth = latestSavedColumnWidthsRef.current[resizeState.columnKey] || SHEET_COLUMN_WIDTH;
				const hasQueuedWidthPatch = Boolean(
					pendingDesignPatchRef.current?.cells?.some((cell) => cell.key === resizeState.columnKey) ||
					(
						inFlightDesignPatchRef.current?.sheetId === sheetId &&
						inFlightDesignPatchRef.current.patch.cells?.some((cell) => cell.key === resizeState.columnKey)
					)
				);
				if (savedWidth !== latestWidth || hasQueuedWidthPatch) {
					queueSheetDesignSave({
						cells: [{
							key: resizeState.columnKey,
							width: latestWidth,
						}],
					});
				}
			}

			resizeStateRef.current = null;
			resizeCleanupRef.current?.();
			resizeCleanupRef.current = null;
			setResizingColumnKey(null);
		};
		const onPointerMove = (event: PointerEvent) => {
			if (event.buttons !== 1) {
				finishResize(event.clientX);
				return;
			}

			const resizeState = resizeStateRef.current;
			if (!resizeState) {
				return;
			}

			const nextWidth = clampSheetColumnWidth(resizeState.startWidth + event.clientX - resizeState.startClientX);
			resizeState.latestWidth = nextWidth;

			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
			}

			resizeFrameRef.current = requestAnimationFrame(() => {
				resizeFrameRef.current = null;
				dispatchDesignState({
					patch: {
						cells: [{
							key: resizeState.columnKey,
							width: nextWidth,
						}],
					},
					type: 'local_patch_queued',
				});
			});
		};

		const onPointerUp = (event: PointerEvent) => {
			finishResize(event.clientX);
		};
		const onContextMenu = () => {
			finishResize();
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerUp);
		window.addEventListener('contextmenu', onContextMenu, true);
		resizeCleanupRef.current = () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
			window.removeEventListener('contextmenu', onContextMenu, true);
		};
	}, [queueSheetDesignSave, sheetId]);

	const startColumnReorder = useCallback((columnKey: string, clientX: number) => {
		const runtime = runtimeRef.current;
		const reorderRuntime = columnReorderRuntimeRef.current;
		const scrollNode = scrollElement.node;
		const metric = reorderRuntime?.metrics.find((item) => item.column.key === columnKey);

		if (!runtime || runtime.disabled || !reorderRuntime || !scrollNode || !metric || reorderRuntime.visibleColumnKeys.length < 2) {
			return;
		}

		columnReorderCleanupRef.current?.();

		const startLeft = getSheetColumnMetricHeaderLeft(metric, scrollState.scrollLeft, stickyColumnCount);
		const initialTargetIndex = getSheetColumnReorderTargetIndex({
			clientX,
			draggedColumnIndex: metric.columnIndex,
			draggedRect: getSheetColumnReorderDraggedRect({
				clientX,
				startClientX: clientX,
				startLeft,
				width: metric.width,
			}),
			metrics: reorderRuntime.metrics,
			scrollLeft: scrollState.scrollLeft,
			scrollNode,
			stickyColumnCount,
		});

		columnReorderStateRef.current = {
			columnKey,
			latestClientX: clientX,
			latestToVisibleIndex: initialTargetIndex,
			startClientX: clientX,
			startColumnIndex: metric.columnIndex,
			startLeft,
			startWidth: metric.width,
			started: false,
		};

		const updateVisualState = () => {
			const reorderState = columnReorderStateRef.current;
			if (!reorderState?.started) {
				return;
			}

			const dragLeft = reorderState.startLeft + reorderState.latestClientX - reorderState.startClientX;
			const nextState = {
				columnKey: reorderState.columnKey,
				dragLeft,
				toVisibleIndex: reorderState.latestToVisibleIndex,
			};

			setColumnReorderVisualState((currentState) => {
				if (
					currentState?.columnKey === nextState.columnKey &&
					currentState.dragLeft === nextState.dragLeft &&
					currentState.toVisibleIndex === nextState.toVisibleIndex
				) {
					return currentState;
				}

				return nextState;
			});
		};
		const scheduleVisualUpdate = () => {
			if (columnReorderFrameRef.current !== null) {
				return;
			}

			columnReorderFrameRef.current = requestAnimationFrame(() => {
				columnReorderFrameRef.current = null;
				updateVisualState();
			});
		};
		const finishReorder = (finishClientX?: number) => {
			const reorderState = columnReorderStateRef.current;
			const latestClientX = Number.isFinite(finishClientX) ? Number(finishClientX) : reorderState?.latestClientX;

			if (columnReorderFrameRef.current !== null) {
				cancelAnimationFrame(columnReorderFrameRef.current);
				columnReorderFrameRef.current = null;
			}

			if (reorderState && latestClientX !== undefined) {
				reorderState.latestClientX = latestClientX;
				reorderState.latestToVisibleIndex = getSheetColumnReorderTargetIndex({
					clientX: latestClientX,
					draggedColumnIndex: reorderState.startColumnIndex,
					draggedRect: getSheetColumnReorderDraggedRect({
						clientX: latestClientX,
						startClientX: reorderState.startClientX,
						startLeft: reorderState.startLeft,
						width: reorderState.startWidth,
					}),
					metrics: reorderRuntime.metrics,
					scrollLeft: scrollState.scrollLeft,
					scrollNode,
					stickyColumnCount,
				});
			}

			if (reorderState?.started) {
				const fromIndex = reorderRuntime.visibleColumnKeys.indexOf(reorderState.columnKey);
				const toVisibleIndex = getSheetColumnReorderMoveIndex(
					reorderRuntime.visibleColumnKeys,
					reorderState.columnKey,
					reorderState.latestToVisibleIndex,
				);

				if (fromIndex >= 0 && fromIndex !== toVisibleIndex) {
					const nextOrder = moveVisibleSheetColumnKeyInOrder({
						allColumnKeys: reorderRuntime.allColumnKeys,
						fromKey: reorderState.columnKey,
						savedOrder: reorderRuntime.savedOrder,
						toVisibleIndex,
						visibleColumnKeys: reorderRuntime.visibleColumnKeys,
					});
					const patch: SheetDesignPatchInput = reorderRuntime.activeViewId
						? {
							views: [{
								id: reorderRuntime.activeViewId,
								columnsOrder: nextOrder,
							}],
						}
						: {
							cellsOrder: nextOrder,
						};

					dispatchDesignState({
						patch,
						type: 'local_patch_queued',
					});
					queueSheetDesignSave(patch);
				}
			}

			columnReorderStateRef.current = null;
			columnReorderCleanupRef.current?.();
			columnReorderCleanupRef.current = null;
			setColumnReorderVisualState(null);
		};
		const onPointerMove = (event: PointerEvent) => {
			if (event.buttons !== 1) {
				finishReorder(event.clientX);
				return;
			}

			const reorderState = columnReorderStateRef.current;
			if (!reorderState) {
				return;
			}

			const distance = Math.abs(event.clientX - reorderState.startClientX);

			if (!reorderState.started && distance < 5) {
				return;
			}

			if (!reorderState.started) {
				reorderState.started = true;
				setEditState(null);
				setHeaderEditState(null);
				setSingleClickedCellState(null);
				singleClickedCellStateRef.current = null;
			}

			event.preventDefault();
			reorderState.latestClientX = event.clientX;
			reorderState.latestToVisibleIndex = getSheetColumnReorderTargetIndex({
				clientX: event.clientX,
				draggedColumnIndex: reorderState.startColumnIndex,
				draggedRect: getSheetColumnReorderDraggedRect({
					clientX: event.clientX,
					startClientX: reorderState.startClientX,
					startLeft: reorderState.startLeft,
					width: reorderState.startWidth,
				}),
				metrics: reorderRuntime.metrics,
				scrollLeft: scrollState.scrollLeft,
				scrollNode,
				stickyColumnCount,
			});
			scheduleVisualUpdate();
		};
		const onPointerUp = (event: PointerEvent) => {
			finishReorder(event.clientX);
		};
		const onContextMenu = () => {
			finishReorder();
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerUp);
		window.addEventListener('contextmenu', onContextMenu, true);
		columnReorderCleanupRef.current = () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
			window.removeEventListener('contextmenu', onContextMenu, true);
		};
	}, [queueSheetDesignSave, scrollElement.node, scrollState.scrollLeft, stickyColumnCount]);
	const commitEditorElement = useCallback(async (editorElement: HTMLElement) => {
		if (committingEditorRef.current) {
			return;
		}

		const runtime = runtimeRef.current;
		const lookup = runtime
			? getSheetCellLookup(runtime, editorElement.dataset.rowId, editorElement.dataset.cellKey)
			: null;

		if (!runtime || !lookup) {
			setEditState(null);
			return;
		}

		const draftValue = getSheetEditorElementValue(editorElement);
		const parsedValue = parseSheetEditorValue(lookup.designCell, draftValue);

		if (parsedValue.error) {
			setEditState({
				cellKey: lookup.designCell.key,
				draftValue,
				error: parsedValue.error,
				rowId: lookup.row.id,
			});
			return;
		}

		const optimisticKey = getSheetCellKey(lookup.row.id, lookup.designCell.key);
		const currentValue = getSheetCellSerializedValue(
			lookup.cell,
			lookup.designCell,
			runtime.optimisticValues[optimisticKey],
		);

    if (!__DISABLE_EDIT_STATE_RESET__) {
      setEditState(null);
    }

		if (currentValue === parsedValue.value) {
			return;
		}

		committingEditorRef.current = true;

		try {
			await runtime.saveCellValue(lookup, parsedValue.value);
		} catch (error) {
			setEditState({
				cellKey: lookup.designCell.key,
				draftValue,
				error: error instanceof Error ? error.message : 'Unable to save cell',
				rowId: lookup.row.id,
			});
		} finally {
			committingEditorRef.current = false;
		}
	}, []);

	runtimeRef.current = {
		columnMetricsByKey,
		designCellsByKey,
		designEditable: !activeView,
		disabled: effectiveDisabled,
		editState,
		optimisticValues,
		openCell: p.onOpenCell || openSheetCellLink,
		rowCellsById,
		rowsById,
		saveCellValue,
		sheet: effectiveSheet,
		startColumnReorder,
		startColumnResize,
	};

	useEffect(() => {
		const scrollNode = scrollElement.node;

		if (!scrollNode) {
			return;
		}

		const onScroll = () => {
			pendingScrollRef.current = {
				scrollLeft: scrollNode.scrollLeft,
				scrollTop: scrollNode.scrollTop,
			};

			if (scrollFrameRef.current !== null) {
				return;
			}

			scrollFrameRef.current = requestAnimationFrame(() => {
				scrollFrameRef.current = null;
				setScrollState((currentState) => {
					const nextState = pendingScrollRef.current;

					if (
						currentState.scrollLeft === nextState.scrollLeft &&
						currentState.scrollTop === nextState.scrollTop
					) {
						return currentState;
					}

					return nextState;
				});
			});
		};
		const onClick = (event: MouseEvent) => {
			const editorElement = getClosestSheetElement(event.target, '[data-sheet-editor="true"]');
			const cellElement = getClosestSheetElement(event.target, '[data-sheet-cell="true"]');
			const runtime = runtimeRef.current;

			if (editorElement) {
				return;
			}

			if (!cellElement || !runtime) {
				setSingleClickedCellState(null);
				singleClickedCellStateRef.current = null;
				return;
			}

			const lookup = getSheetCellLookup(runtime, cellElement.dataset.rowId, cellElement.dataset.cellKey);

			if (cellElement.dataset.sheetCellEditable === 'true') {
				if (!lookup || runtime.disabled || runtime.sheet.design?.humansCannotEdit || lookup.designCell.humansCannotEdit) {
					return;
				}

				const currentSingleClickedCell = singleClickedCellStateRef.current;

				if (
					currentSingleClickedCell?.rowId === lookup.row.id &&
					currentSingleClickedCell.cellKey === lookup.designCell.key
				) {
					setHeaderEditState(null);
					setSingleClickedCellState(null);
					singleClickedCellStateRef.current = null;
					setEditState(getSheetCellEditState(runtime, lookup));
					return;
				}

				const nextSingleClickedCell = {
					cellKey: lookup.designCell.key,
					rowId: lookup.row.id,
				};

				setEditState(null);
				setHeaderEditState(null);
				setSingleClickedCellState(nextSingleClickedCell);
				singleClickedCellStateRef.current = nextSingleClickedCell;
				return;
			}

			if (cellElement.dataset.sheetCellOpenLink !== 'true') {
				setSingleClickedCellState(null);
				singleClickedCellStateRef.current = null;
				return;
			}

			if (lookup) {
				runtime.openCell({
					cell: lookup.cell,
					designCell: lookup.designCell,
					row: lookup.row,
					sheet: runtime.sheet,
				});
			}
		};
		const onDoubleClick = (event: MouseEvent) => {
			const headerElement = getClosestSheetElement(event.target, '[data-sheet-header-cell="true"]');
			const cellElement = getClosestSheetElement(event.target, '[data-sheet-cell="true"]');
			const runtime = runtimeRef.current;

			if (headerElement && runtime && headerElement.dataset.sheetHeaderEditable === 'true') {
				const designCell = runtime.designCellsByKey.get(headerElement.dataset.cellKey || '');

				if (!runtime.disabled && runtime.designEditable && designCell && !runtime.sheet.design?.humansCannotEdit && !designCell.humansCannotEdit) {
					setEditState(null);
					setSingleClickedCellState(null);
					singleClickedCellStateRef.current = null;
					setHeaderEditState({
						cellKey: designCell.key,
						draftValue: getSheetDesignCellHeaderLabel(designCell),
					});
				}

				return;
			}

			if (!cellElement || !runtime || runtime.disabled || cellElement.dataset.sheetCellEditable !== 'true') {
				return;
			}

			const lookup = getSheetCellLookup(runtime, cellElement.dataset.rowId, cellElement.dataset.cellKey);

			if (!lookup || runtime.sheet.design?.humansCannotEdit || lookup.designCell.humansCannotEdit) {
				return;
			}

			setHeaderEditState(null);
			setSingleClickedCellState(null);
			singleClickedCellStateRef.current = null;
			setEditState(getSheetCellEditState(runtime, lookup));
		};
		const onFocusOut = (event: FocusEvent) => {
			const headerEditorElement = getClosestSheetElement(event.target, '[data-sheet-header-editor="true"]');
			const editorElement = getClosestSheetElement(event.target, '[data-sheet-editor="true"]');

			if (headerEditorElement) {
				commitHeaderEditorElement(headerEditorElement);
				return;
			}

			if (editorElement) {
				void commitEditorElement(editorElement);
			}
		};
		const onInput = (event: Event) => {
			const editorElement = getClosestSheetElement(event.target, '[data-sheet-editor="true"]');
			const runtime = runtimeRef.current;

			if (editorElement && runtime?.editState?.error) {
				setEditState({
					cellKey: editorElement.dataset.cellKey || runtime.editState.cellKey,
					draftValue: getSheetEditorElementValue(editorElement),
					rowId: editorElement.dataset.rowId || runtime.editState.rowId,
				});
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			const headerEditorElement = getClosestSheetElement(event.target, '[data-sheet-header-editor="true"]');
			const editorElement = getClosestSheetElement(event.target, '[data-sheet-editor="true"]');

			if (headerEditorElement) {
				if (event.key === 'Escape') {
					event.preventDefault();
					setHeaderEditState(null);
					setSingleClickedCellState(null);
					singleClickedCellStateRef.current = null;
					return;
				}

				if (event.key === 'Enter') {
					event.preventDefault();
					commitHeaderEditorElement(headerEditorElement);
				}

				return;
			}

			if (!editorElement) {
				return;
			}

			if (event.key === 'Escape') {
				event.preventDefault();
				setEditState(null);
				setSingleClickedCellState(null);
				singleClickedCellStateRef.current = null;
				return;
			}

			if (event.key === 'Enter' && editorElement.dataset.fieldType !== 'JSON' && !event.shiftKey) {
				event.preventDefault();
				void commitEditorElement(editorElement);
			}
		};
		const onPointerDown = (event: PointerEvent) => {
			const handleElement = getClosestSheetElement(event.target, '[data-sheet-column-resize-handle]');
			const headerElement = getClosestSheetElement(event.target, '[data-sheet-header-cell="true"]');
			const runtime = runtimeRef.current;

			if (!runtime || runtime.disabled) {
				return;
			}

			if (handleElement) {
				if (columnReorderStateRef.current?.started) {
					return;
				}

				if (event.button !== 0) {
					return;
				}

				const columnKey = handleElement.dataset.sheetColumnResizeHandle;

				if (!columnKey) {
					return;
				}

				event.preventDefault();
				runtime.startColumnResize(columnKey, event.clientX);
				return;
			}

			if (!headerElement || headerElement.dataset.sheetHeaderReorderable !== 'true' || event.button !== 0) {
				return;
			}

			const columnKey = headerElement.dataset.cellKey;
			if (columnKey) {
				runtime.startColumnReorder(columnKey, event.clientX);
			}
		};
		const onContextMenu = (event: MouseEvent) => {
			const handleElement = getClosestSheetElement(event.target, '[data-sheet-column-resize-handle]');

			if (handleElement) {
				if (resizeCleanupRef.current) {
					resizeStateRef.current = null;
					resizeCleanupRef.current();
					resizeCleanupRef.current = null;
					setResizingColumnKey(null);
				}
			}
		};

		scrollNode.addEventListener('scroll', onScroll, { passive: true });
		scrollNode.addEventListener('click', onClick);
		scrollNode.addEventListener('dblclick', onDoubleClick);
		scrollNode.addEventListener('focusout', onFocusOut);
		scrollNode.addEventListener('input', onInput);
		scrollNode.addEventListener('keydown', onKeyDown);
		scrollNode.addEventListener('pointerdown', onPointerDown);
		scrollNode.addEventListener('contextmenu', onContextMenu);

		return () => {
			scrollNode.removeEventListener('scroll', onScroll);
			scrollNode.removeEventListener('click', onClick);
			scrollNode.removeEventListener('dblclick', onDoubleClick);
			scrollNode.removeEventListener('focusout', onFocusOut);
			scrollNode.removeEventListener('input', onInput);
			scrollNode.removeEventListener('keydown', onKeyDown);
			scrollNode.removeEventListener('pointerdown', onPointerDown);
			scrollNode.removeEventListener('contextmenu', onContextMenu);

			if (scrollFrameRef.current !== null) {
				cancelAnimationFrame(scrollFrameRef.current);
				scrollFrameRef.current = null;
			}
		};
	}, [commitEditorElement, commitHeaderEditorElement, scrollElement.node]);

	useEffect(() => {
		return () => {
			resizeCleanupRef.current?.();
			columnReorderCleanupRef.current?.();

			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
			}

			if (columnReorderFrameRef.current !== null) {
				cancelAnimationFrame(columnReorderFrameRef.current);
			}
		};
	}, []);

	const stickyHeaderHeight = SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE;
	const viewportHeight = scrollElement.size.height || stickyHeaderHeight + SHEET_ROW_HEIGHT * 20;
	const viewportWidth = scrollElement.size.width || SHEET_ROW_NUMBER_WIDTH + 5 * SHEET_COLUMN_WIDTH;
	const minimumVisualRowCount = getSheetMinimumRowCount(viewportHeight, stickyHeaderHeight);
	const visualRowCount = Math.max(
		isSheetRowsReady ? renderedRows.length : SHEET_MOCK_ROW_COUNT,
		minimumVisualRowCount,
	);
	const hasPlaceholderTail = hasSheetPlaceholderTail(isSheetRowsReady, renderedRows.length, visualRowCount);
	const visualRowsHeight = getSheetVisualRowsHeight(
		visualRowCount,
		viewportHeight,
		stickyHeaderHeight,
		hasPlaceholderTail,
	);
	const totalWidth = SHEET_ROW_NUMBER_WIDTH +
		columnMetricsData.totalWidth +
		SHEET_STICKY_SPACER_SIZE +
		SHEET_ROW_RIGHT_PADDING;
	const rowContentWidth = SHEET_ROW_NUMBER_WIDTH +
		columnMetricsData.totalWidth +
		SHEET_STICKY_SPACER_SIZE;
	const stickyColumnEndLeft = SHEET_ROW_NUMBER_WIDTH + columnMetricsData.metrics.reduce((total, metric) => {
		return metric.columnIndex < stickyColumnCount ? total + metric.width : total;
	}, 0);
	const totalHeight = stickyHeaderHeight + visualRowsHeight;
	const sheetSurfaceHeight = Math.max(
		totalHeight,
		viewportHeight,
	);
	const sheetSurfaceTop = 0;
	const columnOffsetsWithStickySpacer = useMemo(() => {
		return columnMetricsData.offsets.map((offset, index) => {
			return index > stickyColumnCount ? offset + SHEET_STICKY_SPACER_SIZE : offset;
		});
	}, [columnMetricsData.offsets, stickyColumnCount]);

	useEffect(() => {
		if (!isSheetRowsReady) {
			return;
		}

		if (!scrollElement.size.height) {
			return;
		}

		if (renderedRows.length < visualRowCount) {
			return;
		}

		const distanceFromBottom = totalHeight - (scrollState.scrollTop + viewportHeight);

		if (distanceFromBottom <= SHEET_FETCH_BUFFER_ROWS * SHEET_ROW_HEIGHT) {
			void fetchMoreRows();
		}
	}, [
		fetchMoreRows,
		isSheetRowsReady,
		renderedRows.length,
		scrollElement.size.height,
		scrollState.scrollTop,
		totalHeight,
		viewportHeight,
		visualRowCount,
	]);

	const visibleRange = useMemo(() => {
		return getSheetVisibleRange({
			bufferColumns,
			bufferRows,
			columnCount: uiColumns.length,
			columnOffsets: columnOffsetsWithStickySpacer,
			containerHeight: viewportHeight,
			containerWidth: viewportWidth,
			headerHeight: stickyHeaderHeight,
			rowCount: visualRowCount,
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
		});
	}, [
		bufferColumns,
		bufferRows,
		columnOffsetsWithStickySpacer,
		scrollState.scrollLeft,
		scrollState.scrollTop,
		stickyHeaderHeight,
		uiColumns.length,
		viewportHeight,
		viewportWidth,
		visualRowCount,
	]);

	const visibleColumns = useMemo(() => {
		const visibleColumnIndexes = new Set<number>();

		for (let index = 0; index < stickyColumnCount && index < columnMetricsData.metrics.length; index += 1) {
			visibleColumnIndexes.add(index);
		}

		for (let index = visibleRange.columnStart; index < visibleRange.columnEnd; index += 1) {
			visibleColumnIndexes.add(index);
		}

		return Array.from(visibleColumnIndexes)
			.sort((a, b) => a - b)
			.map((index) => columnMetricsData.metrics[index])
			.filter(Boolean)
			.map((metric) => {
				if (metric.columnIndex < stickyColumnCount) {
					return metric;
				}

				return {
					...metric,
					left: metric.left + SHEET_STICKY_SPACER_SIZE,
				};
			});
	}, [
		columnMetricsData.metrics,
		stickyColumnCount,
		visibleRange.columnEnd,
		visibleRange.columnStart,
	]);
	const visibleRows = useMemo(() => {
		const rowsByIndex = renderedRows;
		const rowWidth = Math.max(totalWidth, viewportWidth);
		const visibleRowSlots: SheetUIRowSlot[] = [];

		for (let rowIndex = visibleRange.rowStart; rowIndex < visibleRange.rowEnd; rowIndex += 1) {
			const row = rowsByIndex[rowIndex];
			const isMockRow = !isSheetRowsReady && rowIndex < SHEET_MOCK_ROW_COUNT;
			const rowHeight = getSheetVisualRowHeight(
				rowIndex,
				visualRowCount,
				viewportHeight,
				stickyHeaderHeight,
				hasPlaceholderTail,
			);
			const rowCellMap = row ? rowCellsById.get(row.id) : null;
			const cellsByKey: Record<string, SheetUICell | undefined> = {};

			if (row) {
				visibleColumns.forEach((columnMetric) => {
					const designCell = designCellsByKey.get(columnMetric.column.key);

					if (!designCell) {
						return;
					}

					const cell = getSheetCellForRuntimeColumn(row, rowCellMap, designCell);
					const optimisticKey = getSheetCellKey(row.id, designCell.key);
					const optimisticValue = optimisticValues[optimisticKey];
					const serializedValue = getSheetCellSerializedValue(cell, designCell, optimisticValue);
					const canEdit = !effectiveDisabled &&
						!effectiveDesign.humansCannotEdit &&
						!activeView?.humansCannotEdit &&
						!designCell.humansCannotEdit &&
						designCell.fieldType !== 'ID';
					const canOpen = Boolean(designCell.openLink);
					const iconName = (cell && 'iconName' in cell ? cell.iconName : null) || designCell.iconName || null;
					const signature = getSheetUICellSignature({
						canEdit,
						canOpen,
						designCell,
						iconName,
						serializedValue,
					});
					const cachedCell = cellUICacheRef.current.get(optimisticKey);

					if (cachedCell?.signature === signature) {
						cellsByKey[designCell.key] = cachedCell.cell;
						return;
					}

					const displayValue = getSheetCellDisplayValue(cell, designCell, optimisticValue);
					const cellClassName = canEdit ? getSheetCellClassName(cell, designCell, optimisticValue) : undefined;
					const displayClassName = getSheetCellDisplayClassName(cell, designCell, optimisticValue);
					const draftValue = getSheetEditorDraftValue(cell, designCell, optimisticValue);
					const uiCell: SheetUICell = {
						cellKey: designCell.key,
						displayValue,
						draftValue,
						iconName,
						canEdit,
						canOpen,
						cellClassName,
						displayClassName,
					};

					cellUICacheRef.current.set(optimisticKey, {
						cell: uiCell,
						signature,
					});
					cellsByKey[designCell.key] = uiCell;
				});
			} else if (isMockRow) {
				visibleColumns.forEach((columnMetric) => {
					cellsByKey[columnMetric.column.key] = getSheetMockUICell(columnMetric.column.key, rowIndex);
				});
			}

			visibleRowSlots.push({
				cellsByKey,
				rowId: row?.id || null,
				rowIndex,
				rowKey: row?.id || (isMockRow ? `mock-${rowIndex}` : `empty-${rowIndex}`),
				rowNumber: row || isMockRow ? rowIndex + 1 : null,
				rowHeight,
				rowTop: stickyHeaderHeight + rowIndex * SHEET_ROW_HEIGHT,
				rowWidth,
			});
		}

		return visibleRowSlots;
	}, [
		activeView?.humansCannotEdit,
		designCellsByKey,
		effectiveDisabled,
		hasPlaceholderTail,
		isSheetRowsReady,
		optimisticValues,
		rowCellsById,
		renderedRows,
		effectiveDesign.humansCannotEdit,
		stickyHeaderHeight,
		totalWidth,
		viewportHeight,
		viewportWidth,
		visibleColumns,
		visibleRange.rowEnd,
		visibleRange.rowStart,
		visualRowCount,
	]);

	const highlightedResizeColumnKey = resizingColumnKey;
	const resizeGuide = useMemo<SheetUIResizeGuide | null>(() => {
		if (!highlightedResizeColumnKey || columnReorderVisualState) {
			return null;
		}

		const metric = columnMetricsByKey.get(highlightedResizeColumnKey);

		if (!metric) {
			return null;
		}

		const isStickyLeft = metric.columnIndex < stickyColumnCount;

		return {
			columnKey: highlightedResizeColumnKey,
			height: sheetSurfaceHeight,
			left: (isStickyLeft ? scrollState.scrollLeft : 0) +
				SHEET_ROW_NUMBER_WIDTH +
				metric.left +
				(metric.columnIndex < stickyColumnCount ? 0 : SHEET_STICKY_SPACER_SIZE) +
				metric.width,
		};
	}, [
		columnMetricsByKey,
		columnReorderVisualState,
		highlightedResizeColumnKey,
		scrollState.scrollLeft,
		stickyColumnCount,
		sheetSurfaceHeight,
	]);
	const columnReorderGuide = useMemo<SheetUIColumnReorderGuide | null>(() => {
		if (!columnReorderVisualState) {
			return null;
		}

	return {
		columnKey: columnReorderVisualState.columnKey,
		height: SHEET_HEADER_HEIGHT,
		left: getSheetColumnReorderGuideLeft(
			columnReorderMetrics,
			columnReorderVisualState.toVisibleIndex,
				scrollState.scrollLeft,
				stickyColumnCount,
			),
		};
	}, [
		columnReorderMetrics,
		columnReorderVisualState,
		scrollState.scrollLeft,
		stickyColumnCount,
	]);
	const columnReorderDrag = useMemo<SheetUIColumnReorderDrag | null>(() => {
		if (!columnReorderVisualState) {
			return null;
		}

		const metric = columnReorderMetrics.find((item) => item.column.key === columnReorderVisualState.columnKey);
		if (!metric) {
			return null;
		}

		return {
			columnKey: columnReorderVisualState.columnKey,
			label: metric.column.label,
			left: columnReorderVisualState.dragLeft,
			width: metric.width,
		};
	}, [columnReorderMetrics, columnReorderVisualState]);
	const columnReorderDisplacements = useMemo<SheetUIColumnReorderDisplacements | null>(() => {
		if (!columnReorderVisualState) {
			return null;
		}

		return getSheetColumnReorderHeaderDisplacements({
			columnKey: columnReorderVisualState.columnKey,
			metrics: columnReorderMetrics,
			scrollLeft: scrollState.scrollLeft,
			stickyColumnCount,
			toVisibleIndex: columnReorderVisualState.toVisibleIndex,
			visibleColumnKeys: columnKeys,
		});
	}, [
		columnKeys,
		columnReorderMetrics,
		columnReorderVisualState,
		scrollState.scrollLeft,
		stickyColumnCount,
	]);

	const sheetTabs = getSheetTabs(sheet, sheetViews);
	const sheetGrid = <SheetUI
		canvasHeight={Math.max(totalHeight, viewportHeight)}
		canvasWidth={Math.max(totalWidth, viewportWidth)}
		cellCount={visualRowCount * uiColumns.length}
		className={undefined}
		columnReorderDrag={columnReorderDrag}
		columnReorderDisplacements={columnReorderDisplacements}
		columnReorderEnabled={!effectiveDisabled}
		columnReorderGuide={columnReorderGuide}
		columnCount={uiColumns.length}
		columns={visibleColumns}
		editState={editState}
		headerCellsEditable={!activeView && !effectiveDisabled && !effectiveDesign.humansCannotEdit}
		headerContent={children}
		headerEditState={headerEditState}
		headerSpacerWidth={rowContentWidth}
		headerWidth={Math.max(totalWidth, viewportWidth)}
		resizeGuide={resizeGuide}
		rows={visibleRows}
		scrollLeft={scrollState.scrollLeft}
		scrollRef={scrollElement.ref}
		selectedCellState={singleClickedCellState}
		sheetSurfaceHeight={sheetSurfaceHeight}
		sheetSurfaceTop={sheetSurfaceTop}
		stickyColumnEndLeft={stickyColumnEndLeft}
		stickyColumnCount={stickyColumnCount}
	/>;

	return <div
		className={cn('v_stretch h_f w_f rel bg', className)}
		data-sheet-with-views='true'
	>
		<div
			className='f h_0 rel'
			data-sheet-grid-container='true'
		>
			{sheetGrid}
		</div>

		<nav
			className='no_shrink h_45 h_bottom gap_6 bd_t_1 bd_lt bg_alt px_8 z5'
			data-sheet-view-tabs='true'
		>
			{sheetTabs.map((tab) => {
				const selected = tab.id === selectedViewId;

				return <button
					key={tab.id || 'master'}
					className={cn('h_36 px_10 ft_xs bg_hv cl_md', selected ? 'bg cl_df shadow_line_alt' : '')}
					data-sheet-view-tab={tab.id || 'master'}
					onClick={() => {
						setSelectedViewId(tab.id);
					}}
					type='button'
				>
					{tab.name}
				</button>;
			})}
		</nav>
	</div>;
}

export default Sheet;
