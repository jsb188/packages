import i18n from '@jsb188/app/i18n/index.ts';
import { getReadableCalDate } from '@jsb188/app/utils/datetime.ts';
import { formatCurrency } from '@jsb188/app/utils/number.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { useEditDataTableCells, useEditDataTableDesign } from '@jsb188/graphql/hooks/use-dataTable-mtn';
import { useReactiveDataTableRows, useDataTableRows } from '@jsb188/graphql/hooks/use-dataTable-qry';
import { DATA_TABLE_HUMAN_LABEL_MAX_LENGTH } from '@jsb188/mday/constants/dataTable.ts';
import type {
	DataTableCellGQL,
	DataTableDesignCellGQL,
	DataTableDesignGQL,
	DataTableDesignViewColumnGQL,
	DataTableDesignViewGQL,
	DataTableFieldTypeGQL,
	DataTableGQL,
	DataTableRowGQL,
} from '@jsb188/mday/types/dataTable.d.ts';
import {
	formatDataTableWeekDateRange,
	getOrderedDataTableDesignViewColumns,
	getOrderedDataTableDesignViews,
	isDataTableDateLikeFieldType,
	isDataTableNumberLikeFieldType,
	isDataTableWeekFieldType,
	mapDataTableDesignViewColumnToCell,
	moveVisibleDataTableColumnKeyInOrder,
	normalizeDataTableDateLikeValue,
} from '@jsb188/mday/utils/dataTable.ts';
import { Calendar, type CalendarSelectedObj } from '@jsb188/react-web/modules/Calendar';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/Layout';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import {
	clampSheetColumnWidth,
	getSheetCellKey,
	getSheetColumnMetrics,
	getSheetMinimumRowCount,
	getSheetMultiSelectEditorValueSet,
	getSheetVisibleRange,
	getValidSheetOptionColor,
	SHEET_COLUMN_WIDTH,
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	type SheetColumnMetric,
	type SheetColumnWidths,
	SheetSelectEditor,
	type SheetUICell,
	type SheetUIColumn,
	type SheetUIColumnReorderDisplacements,
	type SheetUIColumnReorderDrag,
	type SheetUIColumnReorderGuide,
	type SheetUIEditorClickSource,
	type SheetUIEditState,
	type SheetUIFieldType,
	type SheetUIResizeGuide,
	type SheetUIRowSlot,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { DataTableUI } from '@jsb188/react-web/ui/DataTableUI';
import { copyTextToClipboard, useIsomorphicLayoutEffect } from '@jsb188/react-web/utils/dom';
import { useKeyDown, useOpenModalPopUp, useOpenModalScreen } from '@jsb188/react/states';
import { useAtom } from 'jotai';
import { DateTime } from 'luxon';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTableInboundContactEditor } from './DataTable-InboundContact.tsx';
import { type DataTableArrowNavigationDirection, type DataTableContextMenuTarget, useDataTableContextMenu } from './DataTable-ContextMenu.tsx';
import { dismissGridContextMenuOnPointerDown } from '@jsb188/sheet/modules/grid-context-menu';
import {
	getActiveEditState,
	getActiveHeaderEditState,
	getDismissedLocalEditorCell,
	getOpenLocalEditorState,
	getSelectedCellState,
	getSelectedCellSelection,
	getSelectedHeaderCellKey,
	getDataTableSelectedCellStateFromEditState,
	dataTableInteractionReducer,
	type DataTableInteractionAction,
	type DataTableInteractionCellSelection,
	type DataTableInteractionState,
} from './dataTable-interaction-state.ts';
import {
	getGridCellRenderSnapshot,
	getGridInteractionRenderKeys,
} from '@jsb188/sheet/modules/grid-cell-render';
import { createGridUICellRenderStore } from '@jsb188/sheet/modules/grid-render-store';
import {
	createDataTableStateAtoms,
	getInitialDataTableDesignReducerState,
	getInitialDataTableRowsState,
	getDataTableRowsSourceKey,
	mergeDataTableDesignPatch,
	mergeDataTableDesignWithPatch,
	mergeDataTableRowsState,
	dataTableCellValueReducer,
	type DataTableDesignPatchInput,
	dataTableDesignReducer,
	type DataTableRowsState,
	useFloatingMessageForDataTableRowsReset,
	type DataTableColumnReorderVisualState,
	type DataTableDesignReducerAction,
	type DataTableCellValueReducerAction,
	type DataTableStateAtoms,
} from '../states/dataTable-state.ts';
import {
	getDataTableArrowNavigationScrollState,
	getDataTableArrowNavigationSelection,
	type DataTableArrowNavigationRuntime,
} from './dataTable-viewport.ts';
import {
	getDataTableNextActiveSelectedCell,
	getDataTableOrderedSelectedCells,
	getDataTablePasteTargets,
	getDataTableRangeSelection,
	parseDataTableClipboardText,
} from './dataTable-shortcuts.ts';
import { addGridKeyboardEventListener, handleGridKeyboardEvent } from '@jsb188/sheet/modules/grid-keyboard';
import {
	getClosestGridElement,
	getGridKeyboardElements,
	isGridShortcutBlockedByActiveInput,
	useGridElementSize,
} from '@jsb188/sheet/modules/grid-runtime';
import {
	getGridSelectionBoxPosition,
	type GridSelectionBoxPosition,
} from '@jsb188/sheet/modules/grid-selection';
import { sendCellSaveBeacon } from './cell-save-beacon.ts';
import { groupCellSaveItemsByTarget, sendGroupedCellSaveItems, useDebouncedCellSaveBatch } from './use-debounced-cell-save-batch.ts';

/**
 * Dev code
 */

const __DISABLE_EDIT_STATE_RESET__ = globalThis?.location?.hostname === 'localhost' && globalThis?.location?.search.includes('disable_sheet_edit_state_reset=true');
const __USE_NATIVE_CONTEXT_MENU_WITH_ALT__ = (globalThis?.location?.href || '').indexOf('localhost') >= 0;

/**
 * Types
 */

export interface DataTableProps {
	dataTable: DataTableGQL;
	children?: ReactNode;
	className?: string;
	limit?: number;
	bufferRows?: number;
	bufferColumns?: number;
	disabled?: boolean;
	allowEdit?: boolean;
	setFloatingMessage?: SetFloatingMessage;
	timeZone?: string | null;
}

type DataTableParsedEditorValue = {
	value: string | null;
	error?: string;
};

type DataTableCellLookup = {
	cell?: DataTableCellGQL | null;
	designCell: DataTableRuntimeDesignCell;
	row: DataTableRowGQL;
};

type DataTableOpenCellParams = {
	cell?: DataTableCellGQL | null;
	clickSource?: SheetUIEditorClickSource;
	designCell: DataTableDesignCellGQL;
	row: DataTableRowGQL;
	dataTable: DataTableGQL;
};

type DataTableOpenCellLinkParams = DataTableOpenCellParams & {
	openInboundContactEditor: (params: DataTableOpenCellParams) => void;
	openModalScreen: ReturnType<typeof useOpenModalScreen>;
	setFloatingMessage?: SetFloatingMessage;
};

type DataTableRuntimeState = {
	columnMetricsByKey: Map<string, SheetColumnMetric>;
	designCellsByKey: Map<string, DataTableRuntimeDesignCell>;
	designEditable: boolean;
	disabled?: boolean;
	editState?: SheetUIEditState | null;
	optimisticValues: Record<string, string | null>;
	openCell: (params: DataTableOpenCellParams) => void;
	rowCellsById: Map<string, Map<string, DataTableCellGQL>>;
	rowsById: Map<string, DataTableRowGQL>;
	saveCellValue: (lookup: DataTableCellLookup, value: string | null) => Promise<void>;
	dataTable: DataTableGQL;
	startColumnResize: (columnKey: string, clientX: number) => void;
	startColumnReorder: (columnKey: string, clientX: number) => void;
	timeZone?: string | null;
};

type DataTableRuntimeDesignCell = DataTableDesignCellGQL & {
	runtimeKey?: string;
	viewSource?: DataTableDesignViewColumnGQL['source'] | null;
};

type SheetEditorFieldType = DataTableFieldTypeGQL | SheetUIFieldType | 'ID_OR_TEXT';

type DataTableResizeState = {
	columnKey: string;
	designCellKey: string;
	latestWidth?: number;
	startClientX: number;
	startWidth: number;
};

type DataTableColumnReorderRuntime = {
	activeViewId: string | null;
	allColumnKeys: string[];
	metrics: SheetColumnMetric[];
	savedOrder?: string[] | null;
	visibleColumnKeys: string[];
};

type DataTableColumnReorderState = {
	columnKey: string;
	latestClientX: number;
	latestToVisibleIndex: number;
	startClientX: number;
	startColumnIndex: number;
	startLeft: number;
	startWidth: number;
	started: boolean;
};

type DataTableCellDragSelectionState = {
	anchorCell: {
		cellKey: string;
		rowId: string;
	};
	latestCell: {
		cellKey: string;
		rowId: string;
	};
	pointerId: number;
	started: boolean;
};

type DataTableLocalEditorPosition = {
	isStickyLeft: boolean;
	left: number;
	rowWidth: number;
	top: number;
	width: number;
};

type DataTableSelectionBoxPosition = GridSelectionBoxPosition;

type DataTablePaginationState = {
	hasMoreRows: boolean;
	lastCursor: string | null;
};

type DataTableShortcutMutationSummary = {
	failed: number;
	saved: number;
	skipped: number;
};

type DataTablePendingCellSave = {
	cellKey: string;
	dataTableId: string | number | bigint | null;
	lookup: DataTableCellLookup;
	optimisticKey: string;
	organizationId: string | number | bigint | null;
	runtimeKey: string;
	saveVersion: number;
	value: string | null;
	viewCellKey?: string | null;
	viewId?: string | null;
};

type DataTableDesignMutationRuntime = {
	editDataTableDesign: (params: {
		variables: {
			organizationId: string;
			dataTableId: string;
			design: DataTableDesignPatchInput;
		};
	}) => Promise<unknown> | unknown;
	organizationId: string;
	dataTableId: string;
};

type DataTableTab = {
	id: string | null;
	iconName?: string | null;
	name: string;
	view?: DataTableDesignViewGQL | null;
};

type DataTableContextMenuCellTarget = DataTableContextMenuTarget<DataTableCellLookup>;

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
const SHEET_SELECT_EDITOR_MIN_WIDTH = 140;
const SHEET_SELECT_EDITOR_MAX_WIDTH = 400;
const SHEET_DATE_EDITOR_WIDTH = 280;
const SHEET_INBOUND_CONTACT_EDITOR_MIN_WIDTH = 320;
const SHEET_LOCAL_EDITOR_LEFT_OFFSET = -2;
const SHEET_LOCAL_EDITOR_TOP_OFFSET = -1;
const SHEET_LOCAL_EDITOR_WIDTH_OFFSET = 3;
const SHEET_LOCAL_EDITOR_Z_INDEX = 32;
const SHEET_STICKY_LOCAL_EDITOR_Z_INDEX = 43;
const SHEET_READ_ONLY_TAG_HEIGHT = 18;
const SHEET_READ_ONLY_TAG_TOP_OFFSET = 4;
const SHEET_READ_ONLY_TAG_Z_INDEX = 33;
const SHEET_DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATA_TABLE_LOCAL_EDITOR_SELECTOR = '[data-sheet-select-editor="true"], [data-sheet-date-editor="true"], [data-sheet-inbound-contact-editor="true"]';
const DATA_TABLE_GRID_EDITOR_SELECTOR = '[data-sheet-editor="true"], [data-sheet-header-editor="true"], [data-sheet-select-editor="true"], [data-sheet-date-editor="true"], [data-sheet-inbound-contact-editor="true"]';

/*
 * Return ordered design cells from immutable dataTable design configuration.
 */

export function getOrderedDataTableDesignCells(dataTable: DataTableGQL): DataTableDesignCellGQL[] {
	const cells = dataTable.design?.cells || [];
	const cellsByKey = new Map(cells.map((cell) => [cell.key, cell]));
	const orderedCells = (dataTable.design?.cellsOrder || []).map((key) => cellsByKey.get(key)).filter((cell) => cell && !cell.hidden) as DataTableDesignCellGQL[];
	const orderedKeys = new Set(orderedCells.map((cell) => cell.key));
	const remainingCells = cells.filter((cell) => !cell.hidden && !orderedKeys.has(cell.key));

	return orderedCells.concat(remainingCells);
}

/*
 * Return the source master cell key that one runtime column should read and write.
 */

function getDataTableRuntimeCellKey(designCell: DataTableRuntimeDesignCell) {
	if (designCell.viewSource?.type === 'MASTER_CELL' && designCell.viewSource.cellKey) {
		return designCell.viewSource.cellKey;
	}

	return designCell.key;
}

/*
 * Return the UI/runtime identity for one column, which can differ from the stored cell key.
 */

function getDataTableRuntimeColumnKey(designCell: Pick<DataTableRuntimeDesignCell, 'key' | 'runtimeKey'>) {
	return designCell.runtimeKey || designCell.key;
}

/*
 * Add stable runtime keys to columns only when duplicate stored keys would collide in the grid.
 */

function getDataTableRuntimeDesignCellsWithUniqueKeys(cells: DataTableRuntimeDesignCell[]) {
	const counts = new Map<string, number>();
	const seen = new Map<string, number>();

	cells.forEach((cell) => {
		counts.set(cell.key, (counts.get(cell.key) || 0) + 1);
	});

	return cells.map((cell) => {
		if ((counts.get(cell.key) || 0) < 2) {
			return {
				...cell,
				runtimeKey: undefined,
			};
		}

		const occurrence = (seen.get(cell.key) || 0) + 1;
		seen.set(cell.key, occurrence);

		return {
			...cell,
			runtimeKey: `${cell.key}__${occurrence}`,
		};
	});
}

/*
 * Return ordered view tabs, with the virtual master dataTable first.
 */

function getDataTableTabs(dataTable: DataTableGQL, views: DataTableDesignViewGQL[]): DataTableTab[] {
	const masterTab: DataTableTab = {
		id: null,
		iconName: 'database-2',
		name: 'Data',
		view: null,
	};

	return [masterTab].concat(
		views.map((view) => ({
			id: view.id,
			name: view.name,
			view,
		})),
	);
}

/*
 * Return the saved view matching a selected view id.
 */

function getSelectedDataTableView(views: DataTableDesignViewGQL[], selectedViewId: string | null) {
	return selectedViewId ? views.find((view) => view.id === selectedViewId) || null : null;
}

/*
 * Return the saved default view id when it still points at a valid view.
 */

function getValidDefaultDataTableViewId(design: DataTableDesignGQL | null | undefined) {
	const defaultViewId = design?.defaultViewId || null;
	if (!defaultViewId) {
		return null;
	}

	return getOrderedDataTableDesignViews(design as any).some((view) => view.id === defaultViewId) ? defaultViewId : null;
}

/*
 * Return whether one view column should be visible in the dataTable grid.
 */

function isDataTableViewColumnVisible(column: DataTableDesignViewColumnGQL, masterCellsByKey: Map<string, DataTableDesignCellGQL>) {
	if (column.source?.type !== 'MASTER_CELL' || !column.source.cellKey) {
		return true;
	}

	return !masterCellsByKey.get(column.source.cellKey)?.hidden;
}

/*
 * Convert saved view columns into runtime grid columns backed by master dataTable cells.
 */

function getDataTableViewRuntimeCells(view: DataTableDesignViewGQL, masterCells: DataTableDesignCellGQL[]): DataTableRuntimeDesignCell[] {
	const masterCellsByKey = new Map(masterCells.map((cell) => [cell.key, cell]));

	return getOrderedDataTableDesignViewColumns(view as any)
		.filter((column) => isDataTableViewColumnVisible(column as DataTableDesignViewColumnGQL, masterCellsByKey))
		.map((column) => {
			return mapDataTableDesignViewColumnToCell(column as any, masterCellsByKey as any) as DataTableRuntimeDesignCell;
		});
}

/*
 * Return persisted column widths from ordered dataTable design cells.
 */

function getDataTableDesignColumnWidths(designCells: DataTableRuntimeDesignCell[]) {
	const columnWidths: SheetColumnWidths = {};

	designCells.forEach((designCell) => {
		if (Number.isFinite(designCell.width)) {
			columnWidths[getDataTableRuntimeColumnKey(designCell)] = clampSheetColumnWidth(Number(designCell.width));
		}
	});

	return columnWidths;
}

/*
 * Return every master dataTable design cell key, including hidden cells.
 */

function getAllDataTableDesignCellKeys(design: DataTableDesignGQL | null | undefined) {
	return (design?.cells || []).map((cell) => cell.key).filter(Boolean);
}

/*
 * Return every column key stored on a dataTable view, including currently hidden columns.
 */

function getAllDataTableDesignViewColumnKeys(view: DataTableDesignViewGQL | null | undefined) {
	return (view?.columns || []).map((column) => column.key).filter(Boolean);
}

/*
 * Return the current reorder persistence target for the active dataTable tab.
 */

function getDataTableColumnReorderRuntime(params: { activeView?: DataTableDesignViewGQL | null; columnMetrics: SheetColumnMetric[]; design: DataTableDesignGQL; visibleColumnKeys: string[] }) {
	if (params.activeView) {
		return {
			activeViewId: params.activeView.id,
			allColumnKeys: getAllDataTableDesignViewColumnKeys(params.activeView),
			metrics: params.columnMetrics,
			savedOrder: params.activeView.columnsOrder,
			visibleColumnKeys: params.visibleColumnKeys,
		} satisfies DataTableColumnReorderRuntime;
	}

	return {
		activeViewId: null,
		allColumnKeys: getAllDataTableDesignCellKeys(params.design),
		metrics: params.columnMetrics,
		savedOrder: params.design.cellsOrder,
		visibleColumnKeys: params.visibleColumnKeys,
	} satisfies DataTableColumnReorderRuntime;
}

/*
 * Return the horizontal rectangle for a dragged header at one pointer position.
 */

function getDataTableColumnReorderDraggedRect(params: { clientX: number; startClientX: number; startLeft: number; width: number }) {
	const left = params.startLeft + params.clientX - params.startClientX;

	return {
		left,
		right: left + params.width,
	};
}

/*
 * Return the visual insertion index nearest to a pointer X coordinate.
 */

function getDataTableColumnReorderTargetIndex(params: {
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

		const metricLeft = (metric.columnIndex < params.stickyColumnCount ? params.scrollLeft : 0) + SHEET_ROW_NUMBER_WIDTH + metric.left;
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

		const thresholdCoordinate = params.draggedRect ? (params.draggedRect.left + params.draggedRect.right) / 2 : targetLeft;

		if (thresholdCoordinate < metricLeft + metric.width / 2) {
			return index;
		}
	}

	return params.metrics.length;
}

/*
 * Convert a raw insertion slot into the visible-key index used after removing the dragged key.
 */

function getDataTableColumnReorderMoveIndex(visibleColumnKeys: string[], fromKey: string, toVisibleIndex: number) {
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

function getDataTableColumnReorderGuideLeft(metrics: SheetColumnMetric[], toVisibleIndex: number, scrollLeft: number, stickyColumnCount: number) {
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

function getDataTableColumnReorderHeaderDisplacements(params: {
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

	const toIndex = getDataTableColumnReorderMoveIndex(params.visibleColumnKeys, params.columnKey, params.toVisibleIndex);
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

	const currentLefts = new Map(
		params.metrics.map((metric) => {
			return [metric.column.key, getSheetColumnMetricHeaderLeft(metric, params.scrollLeft, params.stickyColumnCount)];
		}),
	);
	const displacements: SheetUIColumnReorderDisplacements = {};
	let nextLeft = 0;

	projectedOrder.forEach((columnKey, columnIndex) => {
		const metric = metricsByKey.get(columnKey);
		if (!metric) {
			return;
		}

		const projectedLeft =
			(columnIndex < params.stickyColumnCount ? params.scrollLeft : 0) +
			SHEET_ROW_NUMBER_WIDTH +
			nextLeft +
			(columnIndex >= params.stickyColumnCount ? SHEET_STICKY_SPACER_SIZE : 0);
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
 * Return the human-facing header label for one dataTable design cell.
 */

function getDataTableDesignCellHeaderLabel(designCell: DataTableDesignCellGQL) {
	return designCell.humanLabel || designCell.label || designCell.key;
}

/*
 * Convert a header editor draft into the stored human label patch value.
 */

function getDataTableHeaderHumanLabelPatchValue(designCell: DataTableDesignCellGQL, draftValue: string) {
	const value = draftValue.trim().slice(0, DATA_TABLE_HUMAN_LABEL_MAX_LENGTH);
	const fallbackLabel = designCell.label || designCell.key;

	return value && value !== fallbackLabel ? value : null;
}

/*
 * Return the field type that should drive human-facing edit behavior.
 */

function getSheetEditorFieldType(designCell: Pick<DataTableDesignCellGQL, 'fieldType' | 'humanFieldType'>) {
	const fieldType = designCell.fieldType as SheetEditorFieldType;

	if (fieldType === 'ID_OR_TEXT') {
		return designCell.humanFieldType;
	}

	if (fieldType === 'ID' && designCell.humanFieldType === 'SELECT_OR_TEXT') {
		return designCell.humanFieldType;
	}

	return designCell.fieldType;
}

/*
 * Return whether one runtime cell is available for direct human edits.
 */

function canEditDataTableRuntimeCell(params: { activeView?: DataTableDesignViewGQL | null; design: DataTableDesignGQL; designCell: DataTableDesignCellGQL; disabled?: boolean }) {
	return !params.disabled && !params.design.humansCannotEdit && !params.activeView?.humansCannotEdit && !params.designCell.humansCannotEdit;
}

/*
 * Convert a GraphQL design cell into an app-agnostic UI column.
 */

function getSheetUIColumn(designCell: DataTableRuntimeDesignCell): SheetUIColumn {
	const columnKey = getDataTableRuntimeColumnKey(designCell);

	return {
		id: columnKey,
		key: columnKey,
		label: getDataTableDesignCellHeaderLabel(designCell),
		fieldType: getSheetEditorFieldType(designCell) as SheetUIFieldType,
		humanFieldType: designCell.humanFieldType as SheetUIFieldType,
		options: designCell.options || [],
		openLink: designCell.openLink,
		humansCannotEdit: designCell.humansCannotEdit,
	};
}

/*
 * Parse one persisted dataTable cell string into a displayable JavaScript value.
 */

function parseDataTableRawValue(value?: unknown | null) {
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
 * Convert any dataTable value into the string shown inside a grid cell.
 */

function stringifyDataTableDisplayValue(value: unknown) {
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

function getDataTableCellSerializedValue(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null) {
	if (optimisticValue !== undefined) {
		return optimisticValue;
	}

	if (!cell) {
		return null;
	}

	if (isDataTableNumberLikeFieldType(designCell.fieldType) && typeof cell.numberValue === 'number' && Number.isFinite(cell.numberValue)) {
		return String(cell.numberValue);
	}

	if (designCell.fieldType === 'BOOLEAN' && cell.booleanValue !== undefined && cell.booleanValue !== null) {
		return String(cell.booleanValue);
	}

	if (isDataTableDateLikeFieldType(designCell.fieldType) && cell.dateValue) {
		return String(cell.dateValue).split('T')[0];
	}

	if (designCell.fieldType === 'DATETIME' && cell.datetimeValue) {
		return String(cell.datetimeValue);
	}

	return cell.value ?? cell.textValue ?? null;
}

/*
 * Return whether one cell displays a live value from another dataTable cell.
 */

function isDataTableReferenceCell(cell: DataTableCellGQL | null | undefined) {
	return cell?.referenceStatus === 'ACTIVE' || cell?.referenceStatus === 'DELETED';
}

/*
 * Find the dataTable cell for one design column on a row.
 */

function getDataTableCellForDesign(row: DataTableRowGQL, designCell: DataTableRuntimeDesignCell) {
	return row.cells?.find((cell) => cell.cellKey === getDataTableRuntimeCellKey(designCell)) || null;
}

/*
 * Return one dataTable cell's numeric value for client-side computed view fallback.
 */

function getDataTableCellNumericValue(cell: DataTableCellGQL | null | undefined) {
	if (!cell) {
		return 0;
	}

	if (typeof cell.numberValue === 'number' && Number.isFinite(cell.numberValue)) {
		return cell.numberValue;
	}

	const rawValue = parseDataTableRawValue(cell.value ?? cell.textValue ?? null);
	const numberValue = Number(rawValue);

	return Number.isFinite(numberValue) ? numberValue : 0;
}

/*
 * Build a read-only computed cell when the server row is missing its synthetic computed cell.
 */

function getDataTableComputedFallbackCell(row: DataTableRowGQL, rowCellMap: Map<string, DataTableCellGQL> | null | undefined, designCell: DataTableRuntimeDesignCell) {
	if (designCell.viewSource?.type !== 'COMPUTED' || designCell.viewSource.operation !== 'SUM') {
		return null;
	}

	const value = (designCell.viewSource.sourceCellKeys || []).reduce((sum, cellKey) => {
		return sum + getDataTableCellNumericValue(rowCellMap?.get(cellKey));
	}, 0);

	return {
		id: `synthetic:${row.id}:${designCell.key}`,
		dataTableId: row.dataTableId,
		dataTableRowId: row.id,
		cellKey: designCell.key,
		value: String(value),
		textValue: String(value),
		numberValue: value,
		booleanValue: null,
		dateValue: null,
		datetimeValue: null,
		reference: null,
		referenceStatus: null,
		createdAt: '',
		updatedAt: '',
	} satisfies DataTableCellGQL;
}

/*
 * Find the server cell for one design column or build a computed view fallback.
 */

function getDataTableCellForRuntimeColumn(row: DataTableRowGQL, rowCellMap: Map<string, DataTableCellGQL> | null | undefined, designCell: DataTableRuntimeDesignCell) {
	return rowCellMap?.get(getDataTableRuntimeCellKey(designCell)) || getDataTableComputedFallbackCell(row, rowCellMap, designCell);
}

/*
 * Find the label for a select value from one design cell.
 */

function getDataTableOptionLabel(designCell: DataTableDesignCellGQL, value: string) {
	return designCell.options?.find((option) => option.value === value)?.label || value;
}

/*
 * Check whether one dataTable field type should display select option styling.
 */

function isDataTableSelectDisplayFieldType(humanFieldType: DataTableFieldTypeGQL) {
	return humanFieldType === 'SELECT' || humanFieldType === 'SELECT_OR_TEXT';
}

/*
 * Return the background color class for one select-style dataTable cell value.
 */

function getDataTableSelectDisplayColorClassName(designCell: DataTableDesignCellGQL, value: string) {
	const option = designCell.options?.find((item) => item.value === value);
	return `bg_${getValidSheetOptionColor(option?.color)}_md`;
}

/*
 * Return the hover background class for one select-style dataTable cell with a matched option color.
 */

function getDataTableSelectCellClassName(designCell: DataTableDesignCellGQL, value: string) {
	const option = designCell.options?.find((item) => item.value === value);
	return `bg_${getValidSheetOptionColor(option?.color)}_fd_hv`;
}

/*
 * Return whether a value is a calendar date key that must not shift by timezone.
 */

function isDataTableDateKeyValue(value: unknown): value is string {
	return typeof value === 'string' && SHEET_DATE_KEY_REGEX.test(value);
}

/*
 * Apply the dataTable display timezone to one DateTime when the timezone is valid.
 */

function getDataTableDateTimeInDisplayZone(dateTime: DateTime, timeZone?: string | null) {
	if (!timeZone) {
		return dateTime;
	}

	const zonedDateTime = dateTime.setZone(timeZone);
	return zonedDateTime.isValid ? zonedDateTime : dateTime;
}

/*
 * Format one readable date value without applying timezone shifts to date keys.
 */

function getReadableDataTableDateDisplayValue(value: string | number | Date, timeZone?: string | null) {
	try {
		return getReadableCalDate(value instanceof Date ? value : String(value), isDataTableDateKeyValue(value) ? null : timeZone);
	} catch {
		return null;
	}
}

/*
 * Parse one dataTable date-like display value into a Luxon DateTime.
 */

function getDataTableDateTimeFromDisplayValue(value: unknown, timeZone?: string | null) {
	if (isDataTableDateKeyValue(value)) {
		return DateTime.fromISO(value);
	}

	if (value instanceof Date) {
		return getDataTableDateTimeInDisplayZone(DateTime.fromJSDate(value), timeZone);
	}

	if (typeof value === 'number') {
		return getDataTableDateTimeInDisplayZone(DateTime.fromMillis(value), timeZone);
	}

	if (typeof value === 'string') {
		const dateTime = DateTime.fromISO(value, timeZone ? { zone: timeZone } : undefined);
		if (dateTime.isValid) {
			return dateTime;
		}

		return getDataTableDateTimeInDisplayZone(DateTime.fromISO(value), timeZone);
	}

	return null;
}

/*
 * Format one date-like dataTable value with a Luxon format string.
 */

function getFormattedDataTableDateDisplayValue(value: unknown, format?: string | null, timeZone?: string | null) {
	if (!format) {
		return null;
	}

	const dateTime = getDataTableDateTimeFromDisplayValue(value, timeZone);
	if (!dateTime?.isValid) {
		return null;
	}

	return dateTime.toFormat(format);
}

/*
 * Format one dataTable DATE value for display in the grid.
 */

function getDataTableDateDisplayValue(value: unknown, format?: string | null, timeZone?: string | null) {
	if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
		return '';
	}

	const formattedValue = getFormattedDataTableDateDisplayValue(value, format, timeZone);
	if (formattedValue) {
		return formattedValue;
	}

	return getReadableDataTableDateDisplayValue(value, timeZone) || stringifyDataTableDisplayValue(value);
}

/*
 * Format one dataTable DATETIME value for display in the grid.
 */

function getDataTableDateTimeDisplayValue(value: unknown, format?: string | null, timeZone?: string | null) {
	if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
		return '';
	}

	const formattedValue = getFormattedDataTableDateDisplayValue(value, format, timeZone);
	if (formattedValue) {
		return formattedValue;
	}

	const dateTime = getDataTableDateTimeFromDisplayValue(value, timeZone);
	if (dateTime?.isValid) {
		return dateTime.toLocaleString(DateTime.DATETIME_MED);
	}

	return stringifyDataTableDisplayValue(value);
}

/*
 * Format one dataTable week value for display in the grid.
 */

function getDataTableWeekDisplayValue(value: unknown, fieldType: DataTableFieldTypeGQL) {
	if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
		return '';
	}

	return formatDataTableWeekDateRange(value instanceof Date ? value : String(value), fieldType) || stringifyDataTableDisplayValue(value);
}

/*
 * Convert one cell and design column into the display string shown in the grid.
 */

function getSheetCellDisplayValue(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null, timeZone?: string | null) {
	if (cell?.referenceStatus === 'DELETED') {
		return getDataTableTranslatedText('dataTable.reference_deleted', 'Deleted reference');
	}

	const rawValue = parseDataTableRawValue(getDataTableCellSerializedValue(cell, designCell, optimisticValue));

	if (designCell.humanFieldType === 'DATE') {
		return getDataTableDateDisplayValue(rawValue, designCell.format, timeZone);
	}

	if (designCell.humanFieldType === 'DATETIME') {
		return getDataTableDateTimeDisplayValue(rawValue, designCell.format, timeZone);
	}

	if (isDataTableWeekFieldType(designCell.humanFieldType)) {
		return getDataTableWeekDisplayValue(rawValue, designCell.humanFieldType);
	}

	if (designCell.humanFieldType === 'PRICE' && typeof rawValue !== 'undefined' && rawValue !== null) {
		return formatCurrency(rawValue as string | number);
	}

	if ((designCell.humanFieldType === 'SELECT' || designCell.humanFieldType === 'SELECT_OR_TEXT') && typeof rawValue === 'string') {
		return getDataTableOptionLabel(designCell, rawValue);
	}

	if (designCell.humanFieldType === 'MULTI_SELECT') {
		const values = Array.isArray(rawValue)
			? rawValue
			: typeof rawValue === 'string'
				? rawValue
						.split(',')
						.map((value) => value.trim())
						.filter(Boolean)
				: [];

		return values.map((value) => getDataTableOptionLabel(designCell, String(value))).join(', ');
	}

	return stringifyDataTableDisplayValue(rawValue);
}

/*
 * Return the display class for one cell value shown in the grid.
 */

function getDataTableCellDisplayClassName(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null) {
	if (!isDataTableSelectDisplayFieldType(designCell.humanFieldType)) {
		return undefined;
	}

	const rawValue = parseDataTableRawValue(getDataTableCellSerializedValue(cell, designCell, optimisticValue));
	if (typeof rawValue !== 'string' || !rawValue) {
		return undefined;
	}

	return ['ellip', 'px_5', 'py_2', 'r_4', getDataTableSelectDisplayColorClassName(designCell, rawValue)].join(' ');
}

/*
 * Return the container class for one cell value shown in the grid.
 */

function getDataTableCellClassName(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null) {
	if (!isDataTableSelectDisplayFieldType(designCell.humanFieldType)) {
		return undefined;
	}

	const rawValue = parseDataTableRawValue(getDataTableCellSerializedValue(cell, designCell, optimisticValue));
	if (typeof rawValue !== 'string' || !rawValue) {
		return undefined;
	}

	return getDataTableSelectCellClassName(designCell, rawValue);
}

/*
 * Convert one cell value into an editable draft string.
 */

function getSheetEditorDraftValue(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null) {
	const serializedValue = getDataTableCellSerializedValue(cell, designCell, optimisticValue);
	const rawValue = parseDataTableRawValue(serializedValue);
	const fieldType = getSheetEditorFieldType(designCell);

	if (fieldType === 'MULTI_SELECT' && Array.isArray(rawValue)) {
		return rawValue.map((value) => String(value)).join(', ');
	}

	if (fieldType === 'DATETIME' && typeof rawValue === 'string') {
		return rawValue.slice(0, 16);
	}

	return stringifyDataTableDisplayValue(rawValue);
}

/*
 * Return a compact key for design options that affect rendered cell text.
 */

function getDataTableDesignOptionsStateKey(designCell: DataTableDesignCellGQL) {
	return (designCell.options || []).map((option) => [option.label, option.value, option.color || ''].join('\u0001')).join('\u0002');
}

/*
 * Return whether one dataTable text value points to an external HTTP URL.
 */

function isDataTableExternalLinkTextValue(value: unknown): value is string {
	return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

/*
 * Return whether one field type should use document-link styling when a related record exists.
 */

function isDataTableDocumentLinkFieldType(fieldType?: DataTableFieldTypeGQL | SheetUIFieldType | 'ID_OR_TEXT' | null) {
	return fieldType === 'ID' || fieldType === 'ID_OR_TEXT';
}

/*
 * Return whether one cell has a usable related record target.
 */

function hasDataTableCellRelatedId(cell?: DataTableCellGQL | null) {
	return cell?.relatedId !== null && cell?.relatedId !== undefined && String(cell.relatedId).trim() !== '';
}

/*
 * Return whether a related table name points to inbound contacts.
 */

function isDataTableInboundContactRelatedTable(relatedTable?: string | null) {
	return relatedTable === 'inbound_contact' || relatedTable === 'inbound_contacts';
}

/*
 * Return whether one dataTable cell has enough data to open from the grid.
 */

function canOpenDataTableCellLink(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL) {
	if (!designCell.openLink) {
		return false;
	}

	return isDataTableExternalLinkTextValue(cell?.textValue) || (hasDataTableCellRelatedId(cell) && isDataTableDocumentLinkFieldType(designCell.fieldType as DataTableFieldTypeGQL | 'ID_OR_TEXT'));
}

/*
 * Return the derived open-link icon for one dataTable cell when no explicit icon is set.
 */

function getDataTableOpenLinkIconName(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL) {
	if (!canOpenDataTableCellLink(cell, designCell)) {
		return null;
	}

	if (isDataTableExternalLinkTextValue(cell?.textValue)) {
		return 'external-link';
	}

	if (hasDataTableCellRelatedId(cell) && isDataTableDocumentLinkFieldType(designCell.fieldType as DataTableFieldTypeGQL | 'ID_OR_TEXT')) {
		return 'notes-paper-text';
	}

	return null;
}

/*
 * Return a stable comparison key for one rendered UI cell.
 */

function getSheetUICellSignature(p: {
	canEdit: boolean;
	canOpen: boolean;
	designCell: DataTableDesignCellGQL;
	iconName?: string | null;
	referenceStatus?: DataTableCellGQL['referenceStatus'] | null;
	serializedValue: string | null;
	timeZone?: string | null;
}) {
	return [
		p.serializedValue ?? '',
		p.iconName ?? '',
		p.referenceStatus ?? '',
		p.canEdit ? '1' : '0',
		p.canOpen ? '1' : '0',
		p.designCell.fieldType,
		p.designCell.humanFieldType,
		p.designCell.format ?? '',
		p.timeZone ?? '',
		getDataTableDesignOptionsStateKey(p.designCell),
	].join('\u0000');
}

/*
 * Split one visual grid render key into the row id and runtime cell key.
 */
function getDataTableCellRenderKeyParts(renderKey: string) {
	const [rowId, ...cellKeyParts] = renderKey.split(':');

	return {
		cellKey: cellKeyParts.join(':'),
		rowId: rowId || '',
	};
}

/*
 * Build per-row cell maps once so visible row generation can use O(1) lookups.
 */

function getDataTableRowCellsById(rows: DataTableRowGQL[]) {
	return new Map(
		rows.map((row) => {
			return [row.id, new Map((row.cells || []).map((cell) => [cell.cellKey, cell]))];
		}),
	);
}

/*
 * Return the opacity class used for one loading mock row.
 */

function getDataTableMockRowOpacityClass(rowIndex: number) {
	return SHEET_MOCK_ROW_OPACITY_CLASSES[rowIndex] || '';
}

/*
 * Return whether the last visual row is viewport filler rather than dataTable data.
 */

function hasDataTablePlaceholderTail(isDataTableRowsReady: boolean, renderedRowCount: number, visualRowCount: number) {
	return isDataTableRowsReady && renderedRowCount < visualRowCount;
}

/*
 * Return the body height used by visual rows when the last row is viewport filler.
 */

function getDataTableVisualRowsHeight(visualRowCount: number, viewportHeight: number, stickyHeaderHeight: number, hasPlaceholderTail_: boolean) {
	if (!hasPlaceholderTail_ || visualRowCount === 0) {
		return visualRowCount * SHEET_ROW_HEIGHT;
	}

	return Math.max(0, viewportHeight - stickyHeaderHeight);
}

/*
 * Return the rendered height for one visual row.
 */

function getDataTableVisualRowHeight(rowIndex: number, visualRowCount: number, viewportHeight: number, stickyHeaderHeight: number, hasPlaceholderTail_: boolean) {
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

function getDataTableMockUICell(cellKey: string, rowIndex: number): SheetUICell {
	return {
		cellKey,
		displayValue: SHEET_MOCK_CELL_TEXT,
		displayClassName: ['mock active bl min_w_50_pc', getDataTableMockRowOpacityClass(rowIndex)].filter(Boolean).join(' '),
		draftValue: '',
	};
}

/*
 * Parse the current editor draft into the serialized value stored by GraphQL.
 */

function isValidDataTableDateInputValue(value: string) {
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

function isValidDataTableDateTimeInputValue(value: string) {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/);
	if (!match || !isValidDataTableDateInputValue(`${match[1]}-${match[2]}-${match[3]}`)) {
		return false;
	}

	const hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = match[6] === undefined ? 0 : Number(match[6]);

	return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

/*
 * Return whether one editor value matches a saved dataTable option.
 */

function isSheetEditorOptionValue(designCell: DataTableDesignCellGQL, value: unknown) {
	return (designCell.options || []).some((option) => String(option.value) === String(value));
}

/*
 * Parse the current editor draft into the serialized value stored by GraphQL.
 */

export function parseSheetEditorValue(designCell: DataTableDesignCellGQL, draftValue: string): DataTableParsedEditorValue {
	const fieldType = getSheetEditorFieldType(designCell);
	const value = draftValue.trim();

	if (!value) {
		return { value: null };
	}

	if (isDataTableNumberLikeFieldType(fieldType)) {
		const numberValue = Number(value);

		if (!Number.isFinite(numberValue)) {
			return {
				error: 'Invalid number',
				value: null,
			};
		}

		return { value };
	}

	if (fieldType === 'BOOLEAN') {
		if (value !== 'true' && value !== 'false') {
			return {
				error: 'Invalid boolean',
				value: null,
			};
		}

		return { value };
	}

	if (isDataTableDateLikeFieldType(fieldType)) {
		if (!isValidDataTableDateInputValue(value)) {
			return {
				error: 'Invalid date',
				value: null,
			};
		}

		return { value: normalizeDataTableDateLikeValue(value, fieldType) };
	}

	if (fieldType === 'DATETIME') {
		if (!isValidDataTableDateTimeInputValue(value)) {
			return {
				error: 'Invalid datetime',
				value: null,
			};
		}

		return { value };
	}

	if (fieldType === 'SELECT' && designCell.options?.length && !isSheetEditorOptionValue(designCell, value)) {
		return {
			error: 'Invalid option',
			value: null,
		};
	}

	if (fieldType === 'MULTI_SELECT') {
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
			values = value
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean);
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

	if (fieldType === 'JSON') {
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
 * Return whether one field type uses the dataTable-owned select-style editor.
 */

function isSheetSelectEditorFieldType(fieldType?: DataTableFieldTypeGQL | SheetUIFieldType | null) {
	return fieldType === 'SELECT' || fieldType === 'SELECT_OR_TEXT' || fieldType === 'MULTI_SELECT' || fieldType === 'BOOLEAN';
}

/*
 * Return whether one field type uses the dataTable-owned date or date-time editor.
 */

function isDataTableDateEditorFieldType(fieldType?: DataTableFieldTypeGQL | SheetUIFieldType | null) {
	return fieldType === 'DATE' || fieldType === 'WEEK_OF_MON' || fieldType === 'WEEK_OF_SUN' || fieldType === 'DATETIME';
}

/*
 * Return whether one field type uses any dataTable-owned absolute editor.
 */

function isDataTableLocalEditorFieldType(fieldType?: DataTableFieldTypeGQL | SheetUIFieldType | null) {
	return isSheetSelectEditorFieldType(fieldType) || isDataTableDateEditorFieldType(fieldType);
}

/*
 * Return translated UI text when translations are loaded, with a stable fallback for tests.
 */

function getDataTableTranslatedText(key: string, fallback: string) {
	return i18n.has(key) ? i18n.t(key) : fallback;
}

/*
 * Return default boolean options when the dataTable design does not provide them.
 */

function getDataTableBooleanFallbackOptions() {
	return [
		{
			color: null,
			label: getDataTableTranslatedText('form.yes', 'Yes'),
			value: 'true',
		},
		{
			color: null,
			label: getDataTableTranslatedText('form.no', 'No'),
			value: 'false',
		},
	];
}

/*
 * Return the option list shown by the dataTable-owned select-style editor.
 */

function getSheetSelectEditorOptions(designCell: DataTableDesignCellGQL) {
	if (getSheetEditorFieldType(designCell) === 'BOOLEAN' && !designCell.options?.length) {
		return getDataTableBooleanFallbackOptions();
	}

	return designCell.options || [];
}

/*
 * Format one calendar selection as the serialized dataTable date value.
 */

function getDataTableCalendarDateValue(value: CalendarSelectedObj) {
	const year = String(value.year).padStart(4, '0');
	const month = String(value.month).padStart(2, '0');
	const day = String(value.day).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/*
 * Return the date portion from a date or date-time editor draft.
 */

function getDataTableDateEditorDateValue(draftValue: string) {
	const dateValue = draftValue.trim().split('T')[0] || '';

	return isValidDataTableDateInputValue(dateValue) ? dateValue : '';
}

/*
 * Return the time portion from a date-time editor draft.
 */

function getDataTableDateTimeEditorTimeValue(draftValue: string) {
	const match = draftValue.trim().match(/T(\d{2}:\d{2})/);

	return match?.[1] || '00:00';
}

/*
 * Return a valid serialized date-time draft from date and time editor parts.
 */

function getDataTableDateTimeEditorDraftValue(dateValue: string, timeValue: string) {
	const normalizedDate = isValidDataTableDateInputValue(dateValue) ? dateValue : '';
	const normalizedTime = /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : '00:00';

	return normalizedDate ? `${normalizedDate}T${normalizedTime}` : '';
}

/*
 * Calculate the stable dataTable-canvas position for a dataTable-local editor.
 */

function getDataTableLocalEditorPosition(params: {
	columnMetric?: SheetColumnMetric;
	hasPlaceholderTail: boolean;
	rowIndex: number;
	rowWidth: number;
	stickyColumnCount: number;
	stickyHeaderHeight: number;
	viewportHeight: number;
	visualRowCount: number;
	width?: number;
}): DataTableLocalEditorPosition | null {
	if (!params.columnMetric || params.rowIndex < 0) {
		return null;
	}

	const isStickyLeft = params.columnMetric.columnIndex < params.stickyColumnCount;
	const rowHeight = getDataTableVisualRowHeight(params.rowIndex, params.visualRowCount, params.viewportHeight, params.stickyHeaderHeight, params.hasPlaceholderTail);
	const left = SHEET_ROW_NUMBER_WIDTH + params.columnMetric.left + (isStickyLeft ? 0 : SHEET_STICKY_SPACER_SIZE) + SHEET_LOCAL_EDITOR_LEFT_OFFSET;
	const width = params.width ?? Math.min(Math.max(SHEET_SELECT_EDITOR_MAX_WIDTH, params.columnMetric.width), Math.max(SHEET_SELECT_EDITOR_MIN_WIDTH, params.columnMetric.width));

	return {
		isStickyLeft,
		left,
		rowWidth: params.rowWidth,
		top: params.stickyHeaderHeight + params.rowIndex * SHEET_ROW_HEIGHT + rowHeight + SHEET_LOCAL_EDITOR_TOP_OFFSET,
		width: width + SHEET_LOCAL_EDITOR_WIDTH_OFFSET,
	};
}

/*
 * Return the canvas position for a compact tag anchored above a selected dataTable cell.
 */

function getDataTableSelectedCellTagPosition(params: {
	columnMetric?: SheetColumnMetric;
	rowIndex: number;
	rowWidth: number;
	stickyColumnCount: number;
	stickyHeaderHeight: number;
}): DataTableLocalEditorPosition | null {
	if (!params.columnMetric || params.rowIndex < 0) {
		return null;
	}

	const isStickyLeft = params.columnMetric.columnIndex < params.stickyColumnCount;
	const cellTop = params.stickyHeaderHeight + params.rowIndex * SHEET_ROW_HEIGHT;
	const left = SHEET_ROW_NUMBER_WIDTH + params.columnMetric.left + (isStickyLeft ? 0 : SHEET_STICKY_SPACER_SIZE);

	return {
		isStickyLeft,
		left,
		rowWidth: params.rowWidth,
		top: cellTop - SHEET_READ_ONLY_TAG_HEIGHT - SHEET_READ_ONLY_TAG_TOP_OFFSET,
		width: params.columnMetric.width,
	};
}

/*
 * Return one rectangle that surrounds the active multi-cell selection.
 */

function getDataTableSelectionBoxPosition(params: {
	columnMetrics: SheetColumnMetric[];
	renderedRows: DataTableRowGQL[];
	selection?: DataTableInteractionCellSelection | null;
	stickyColumnCount: number;
	stickyHeaderHeight: number;
}): DataTableSelectionBoxPosition | null {
	return getGridSelectionBoxPosition({
		columnMetrics: params.columnMetrics,
		getColumnDisplayLeft: (metric) => {
			return metric.left + (metric.columnIndex < params.stickyColumnCount ? 0 : SHEET_STICKY_SPACER_SIZE);
		},
		rowMetrics: params.renderedRows.map((row, rowIndex) => ({
			height: SHEET_ROW_HEIGHT,
			rowKey: row.id,
			top: rowIndex * SHEET_ROW_HEIGHT,
		})),
		selectedCellKeyMap: params.selection?.selectedCellKeyMap,
		stickyHeaderHeight: params.stickyHeaderHeight,
	});
}

/*
 * Read the current value from an active dataTable editor element.
 */

function getSheetEditorElementValue(element: HTMLElement) {
	if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
		return element.value;
	}

	return '';
}

/*
 * Read plain text from the browser clipboard for dataTable paste operations.
 */

async function readDataTableClipboardText() {
	if (typeof navigator?.clipboard?.readText !== 'function') {
		return '';
	}

	return navigator.clipboard.readText();
}

/*
 * Read one cell lookup from the latest runtime state.
 */

function getDataTableCellLookup(runtime: DataTableRuntimeState, rowId?: string | null, cellKey?: string | null): DataTableCellLookup | null {
	if (!rowId || !cellKey) {
		return null;
	}

	const row = runtime.rowsById.get(rowId);
	const designCell = runtime.designCellsByKey.get(cellKey);

	if (!row || !designCell) {
		return null;
	}

	return {
		cell: runtime.rowCellsById.get(row.id)?.get(getDataTableRuntimeCellKey(designCell)) || null,
		designCell,
		row,
	};
}

/*
 * Return whether one lookup targets a related-document cell whose editing is blocked.
 */

function isDataTableRelatedDocumentEditBlocked(lookup: DataTableCellLookup) {
	const fieldType = lookup.designCell.humanFieldType || lookup.designCell.fieldType;

	return fieldType === 'ID' && !!lookup.cell?.relatedTable && hasDataTableCellRelatedId(lookup.cell);
}

/*
 * Return whether one dataTable cell lookup can accept shortcut-driven writes.
 */

function canWriteDataTableShortcutCell(params: {
	activeView?: DataTableDesignViewGQL | null;
	design: DataTableDesignGQL;
	disabled?: boolean;
	lookup: DataTableCellLookup;
}) {
	const { activeView, design, disabled, lookup } = params;

	return Boolean(
		!lookup.row.__deleted &&
		!isDataTableReferenceCell(lookup.cell) &&
		!isDataTableRelatedDocumentEditBlocked(lookup) &&
		canEditDataTableRuntimeCell({
			activeView,
			design,
			designCell: lookup.designCell,
			disabled,
		}),
	);
}

/*
 * Build tab-separated clipboard text for selected dataTable cells.
 */

function getDataTableSelectionClipboardText(params: {
	columnMetrics: SheetColumnMetric[];
	renderedRows: DataTableRowGQL[];
	runtime: DataTableRuntimeState;
	selection: DataTableInteractionCellSelection;
}) {
	const rowTexts: string[] = [];
	const selectedRows = new Set<string>();
	const selectedColumns = new Set<string>();

	getDataTableOrderedSelectedCells({
		columnMetrics: params.columnMetrics,
		renderedRows: params.renderedRows,
		selection: params.selection,
	}).forEach((cell) => {
		selectedRows.add(cell.rowId);
		selectedColumns.add(cell.cellKey);
	});

	params.renderedRows.forEach((row) => {
		if (!selectedRows.has(row.id)) {
			return;
		}

		const values: string[] = [];

		params.columnMetrics.forEach((metric) => {
			if (!selectedColumns.has(metric.column.key) || !params.selection.selectedCellKeyMap[getSheetCellKey(row.id, metric.column.key)]) {
				return;
			}

			const lookup = getDataTableCellLookup(params.runtime, row.id, metric.column.key);
			const optimisticKey = lookup ? getSheetCellKey(lookup.row.id, getDataTableRuntimeColumnKey(lookup.designCell)) : '';

			values.push(lookup ? getSheetCellDisplayValue(lookup.cell, lookup.designCell, params.runtime.optimisticValues[optimisticKey], params.runtime.timeZone) : '');
		});

		rowTexts.push(values.join('\t'));
	});

	return rowTexts.join('\n');
}

/*
 * Return the floating-message text for one shortcut mutation result.
 */

function getDataTableShortcutSummaryText(action: 'clear' | 'paste', summary: DataTableShortcutMutationSummary) {
	const key = action === 'paste' ? 'dataTable.shortcut_paste_summary' : 'dataTable.shortcut_clear_summary';
	const fallback = action === 'paste'
		? 'Pasted %{savedCount} cells, skipped %{skippedCount}, failed %{failedCount}.'
		: 'Cleared %{savedCount} cells, skipped %{skippedCount}, failed %{failedCount}.';
	const translatedText = getDataTableTranslatedText(key, fallback);

	return translatedText
		.replace('%{savedCount}', String(summary.saved))
		.replace('%{skippedCount}', String(summary.skipped))
		.replace('%{failedCount}', String(summary.failed));
}

/*
 * Build the compact context-menu target for one resolved dataTable cell.
 */

function getDataTableContextMenuCellTarget(
	runtime: DataTableRuntimeState,
	lookup: DataTableCellLookup,
	rowIndex: number,
	activeView: DataTableDesignViewGQL | null,
	design: DataTableDesignGQL,
): DataTableContextMenuCellTarget {
	const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);
	const optimisticKey = getSheetCellKey(lookup.row.id, runtimeKey);

	return {
		canDeleteRow: !lookup.row.__deleted && !runtime.disabled && !design.humansCannotEdit && !activeView?.humansCannotEdit && !lookup.row.viewId,
		canEdit:
			canEditDataTableRuntimeCell({
				activeView,
				design,
				designCell: lookup.designCell,
				disabled: runtime.disabled || lookup.row.__deleted,
			}) && !isDataTableReferenceCell(lookup.cell),
		canOpen: !lookup.row.__deleted && canOpenDataTableCellLink(lookup.cell, lookup.designCell),
		cellKey: runtimeKey,
		displayValue: getSheetCellDisplayValue(lookup.cell, lookup.designCell, runtime.optimisticValues[optimisticKey], runtime.timeZone),
		lookup,
		organizationId: runtime.dataTable.organizationId,
		rowId: lookup.row.id,
		rowNumber: rowIndex >= 0 ? rowIndex + 1 : null,
		dataTableId: runtime.dataTable.id,
		viewId: lookup.row.viewId,
	};
}

/*
 * Build the active cell edit state for one resolved dataTable cell lookup.
 */

function getDataTableCellEditState(runtime: DataTableRuntimeState, lookup: DataTableCellLookup, clickSource?: SheetUIEditorClickSource): SheetUIEditState {
	const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);
	const optimisticKey = getSheetCellKey(lookup.row.id, runtimeKey);

	return {
		cellKey: runtimeKey,
		clickSource,
		draftValue: getSheetEditorDraftValue(lookup.cell, lookup.designCell, runtime.optimisticValues[optimisticKey]),
		rowId: lookup.row.id,
	};
}

/*
 * Build the active cell edit state for a custom dataTable-local overlay editor.
 */

function getDataTableCellOverlayEditState(runtime: DataTableRuntimeState, lookup: DataTableCellLookup, clickSource?: SheetUIEditorClickSource): SheetUIEditState {
	return {
		...getDataTableCellEditState(runtime, lookup, clickSource),
		disableInlineEditor: true,
	};
}

/*
 * Check whether a lookup is already represented by the active dataTable edit state.
 */

function isDataTableEditStateLookup(editState: SheetUIEditState | null | undefined, lookup: DataTableCellLookup) {
	return editState?.rowId === lookup.row.id && editState.cellKey === getDataTableRuntimeColumnKey(lookup.designCell);
}

/*
 * Check whether a lookup owns the currently open dataTable-local editor.
 */

function isDataTableLocalEditorEditStateLookup(editState: SheetUIEditState | null | undefined, lookup: DataTableCellLookup) {
	return isDataTableEditStateLookup(editState, lookup) && (!!editState?.disableInlineEditor || isDataTableLocalEditorFieldType(getSheetEditorFieldType(lookup.designCell)));
}

/*
 * Handle edit attempts for related-document ID cells before entering inline edit mode.
 */

function handleDataTableRelatedDocumentCellEdit(lookup: DataTableCellLookup, setFloatingMessage?: SetFloatingMessage) {
	const fieldType = lookup.designCell.humanFieldType || lookup.designCell.fieldType;
	if (fieldType !== 'ID' || !lookup.cell?.relatedTable || !hasDataTableCellRelatedId(lookup.cell)) {
		return false;
	}

	switch (lookup.cell.relatedTable) {
		case 'logs':
			setFloatingMessage?.({
				text: getDataTableTranslatedText('dataTable.editing_temporarily_disabled_msg', 'Editing this cell is temporarily disabled.'),
				type: 'NOTICE',
			});
			return true;
		case 'inbound_contact':
		case 'inbound_contacts':
		default:
			setFloatingMessage?.({
				text: getDataTableTranslatedText('dataTable.editing_temporarily_disabled_msg', 'Editing this cell is temporarily disabled.'),
				type: 'NOTICE',
			});
			return true;
	}
}

/*
 * Return whether one resolved dataTable lookup points at an inbound contact ID cell.
 */

function isDataTableInboundContactIdLookup(lookup: DataTableCellLookup) {
	return lookup.designCell.fieldType === 'ID' && isDataTableInboundContactRelatedTable(lookup.cell?.relatedTable) && hasDataTableCellRelatedId(lookup.cell);
}

/*
 * Anchor a dataTable-local editor to stable dataTable-canvas coordinates.
 */

function DataTableLocalEditorContainer(p: { children: ReactNode; position: DataTableLocalEditorPosition }) {
	const editorTop = p.position.top;

	if (p.position.isStickyLeft) {
		return (
			<div
				className="abs"
				data-sheet-local-editor-anchor="true"
				style={{
					left: 0,
					top: editorTop,
					width: p.position.rowWidth,
					zIndex: SHEET_STICKY_LOCAL_EDITOR_Z_INDEX,
				}}
			>
				<div
					className="sticky"
					style={{
						left: p.position.left,
						position: 'sticky',
						width: p.position.width,
						zIndex: SHEET_STICKY_LOCAL_EDITOR_Z_INDEX,
					}}
				>
					{p.children}
				</div>
			</div>
		);
	}

	return (
		<div
			className="abs"
			data-sheet-local-editor-anchor="true"
			style={{
				left: p.position.left,
				top: editorTop,
				width: p.position.width,
				zIndex: SHEET_LOCAL_EDITOR_Z_INDEX,
			}}
		>
			{p.children}
		</div>
	);
}

/*
 * Render the read-only tag above a selected cell while preserving sticky-column positioning.
 */

function DataTableReadOnlyTag(p: { position: DataTableLocalEditorPosition }) {
	const tag = (
		<div
			className="abs noclick nowrap px_5 py_4 ft_tn ft_medium lh_1 bg_contrast"
			data-sheet-read-only-cell-tag="true"
			style={{
				left: -2,
				top: -1,
				width: 'max-content',
				zIndex: SHEET_READ_ONLY_TAG_Z_INDEX,
			}}
		>
			{i18n.t('form.not_editable')}
		</div>
	);

	if (p.position.isStickyLeft) {
		return (
			<div
				className="abs"
				data-sheet-read-only-cell-tag-anchor="true"
				style={{
					left: 0,
					top: p.position.top,
					width: p.position.rowWidth,
					zIndex: SHEET_READ_ONLY_TAG_Z_INDEX,
				}}
			>
				<div
					className="sticky"
					style={{
						left: p.position.left,
						position: 'sticky',
						width: p.position.width,
						zIndex: SHEET_READ_ONLY_TAG_Z_INDEX,
					}}
				>
					{tag}
				</div>
			</div>
		);
	}

	return (
		<div
			className="abs"
			data-sheet-read-only-cell-tag-anchor="true"
			style={{
				left: p.position.left,
				top: p.position.top,
				width: p.position.width,
				zIndex: SHEET_READ_ONLY_TAG_Z_INDEX,
			}}
		>
			{tag}
		</div>
	);
}

/*
 * Render the dataTable-owned calendar editor for DATE and DATETIME cells.
 */

function DataTableDateEditor(p: {
	clickSource?: SheetUIEditorClickSource;
	editState: SheetUIEditState;
	lookup: DataTableCellLookup;
	onDateValue: (lookup: DataTableCellLookup, draftValue: string) => void;
	onDateTimeSave: (lookup: DataTableCellLookup, draftValue: string) => void;
}) {
	const initialDateValue = getDataTableDateEditorDateValue(p.editState.draftValue);
	const initialTimeValue = getDataTableDateTimeEditorTimeValue(p.editState.draftValue);
	const [dateValue, setDateValue] = useState(initialDateValue);
	const [timeValue, setTimeValue] = useState(initialTimeValue);
	const isDateTime = getSheetEditorFieldType(p.lookup.designCell) === 'DATETIME';
	const calendarValue = dateValue || null;

	return (
		<div
			className="bg bd_1 bd_lt shadow_line_alt r_4 ft_xs"
			data-sheet-click-source={p.clickSource}
			data-sheet-date-editor="true"
			style={{
				width: '100%',
			}}
		>
			<Calendar
				className="p_8"
				hideNextMonthDays
				initialCalendarViewDate={calendarValue || new Date()}
				name={`sheet_date_editor_${p.lookup.row.id}_${p.lookup.designCell.key}`}
				rowPaddingClassName="py_1"
				value={calendarValue}
				weekdayRowPaddingClassName="py_4"
				onChange={(nextValue) => {
					if (!nextValue) {
						return;
					}

					const nextDateValue = getDataTableCalendarDateValue(nextValue);
					if (isDateTime) {
						setDateValue(nextDateValue);
						return;
					}

					p.onDateValue(p.lookup, nextDateValue);
				}}
			/>

			{isDateTime ? (
				<form
					className="h_item gap_6 px_8 py_8 bd_t_1 bd_lt"
					data-sheet-date-time-editor-form="true"
					onSubmit={(event) => {
						event.preventDefault();
						p.onDateTimeSave(p.lookup, getDataTableDateTimeEditorDraftValue(dateValue, timeValue));
					}}
				>
					<input
						className="f h_28 bg_alt stock px_6 ft_xs"
						data-sheet-date-time-editor-time="true"
						onChange={(event) => {
							setTimeValue(event.currentTarget.value);
						}}
						type="time"
						value={timeValue}
					/>
					<button className="h_28 px_8 bg_primary cl_white ft_xs" type="submit">
						{getDataTableTranslatedText('form.save', 'Save')}
					</button>
				</form>
			) : null}
		</div>
	);
}

/*
 * Return the external URL stored in one open-link dataTable cell.
 */

function getDataTableOpenCellExternalUrl(cell: DataTableCellGQL | null | undefined) {
	const textValue = cell?.textValue;

	if (isDataTableExternalLinkTextValue(textValue)) {
		return textValue;
	}

	const value = cell?.value as unknown;

	if (isDataTableExternalLinkTextValue(value)) {
		return value;
	}

	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const nestedValue = (value as { value?: unknown }).value;
		return isDataTableExternalLinkTextValue(nestedValue) ? nestedValue : null;
	}

	return null;
}

/*
 * Open one clickable dataTable cell using its external URL or related document target.
 */

function openDataTableCellLink(params: DataTableOpenCellLinkParams) {
	const { cell, openInboundContactEditor, openModalScreen, setFloatingMessage } = params;
	const externalUrl = getDataTableOpenCellExternalUrl(cell);

	if (externalUrl) {
		window.open(externalUrl, '_blank', 'noopener,noreferrer');
		return;
	}

	if (cell?.relatedId) {
		if (isDataTableInboundContactRelatedTable(cell.relatedTable)) {
			openInboundContactEditor(params);
			return;
		}

		switch (cell.relatedTable) {
			case 'logs':
				openModalScreen({
					name: 'LOG_ENTRY',
					props: {
						logEntryId: String(cell.relatedId),
					},
				});
				return;
			default:
				break;
		}
	}

	setFloatingMessage?.({
		text: i18n.t('dataTable.unsupported_link_msg'),
		type: 'NOTICE',
	});
}

/*
 * Render a GraphQL-backed spreadsheet for an immutable dataTable design.
 */

/*
 * Render one DataTable inside an isolated local grid state store.
 */
export function DataTable(p: DataTableProps) {
	const stateAtomsRef = useRef<DataTableStateAtoms | null>(null);

	if (!stateAtomsRef.current) {
		stateAtomsRef.current = createDataTableStateAtoms();
	}

	return <DataTableContent {...p} stateAtoms={stateAtomsRef.current} />;
}

type DataTableContentProps = DataTableProps & {
	stateAtoms: DataTableStateAtoms;
};

/*
 * Render the stateful DataTable implementation bound to the nearest grid state store.
 */
function DataTableContent(p: DataTableContentProps) {
	const {
		allowEdit,
		bufferColumns = SHEET_BUFFER_COLUMNS,
		bufferRows = SHEET_BUFFER_ROWS,
		children,
		className,
		disabled,
		limit = SHEET_ROWS_LIMIT,
		setFloatingMessage,
		dataTable,
		timeZone,
	} = p;
	const dataTableId = dataTable.id;
	const organizationId = dataTable.organizationId;
	const effectiveDisabled = disabled || !allowEdit;
	const openModalPopUp = useOpenModalPopUp();
	const openModalScreen = useOpenModalScreen();
	const scrollElement = useGridElementSize<HTMLDivElement>();
	const fetchingMoreRef = useRef(false);
	const runtimeRef = useRef<DataTableRuntimeState | null>(null);
	const resizeStateRef = useRef<DataTableResizeState | null>(null);
	const resizeFrameRef = useRef<number | null>(null);
	const resizeCleanupRef = useRef<(() => void) | null>(null);
	const columnReorderRuntimeRef = useRef<DataTableColumnReorderRuntime | null>(null);
	const columnReorderStateRef = useRef<DataTableColumnReorderState | null>(null);
	const columnReorderFrameRef = useRef<number | null>(null);
	const columnReorderCleanupRef = useRef<(() => void) | null>(null);
	const cellDragSelectionStateRef = useRef<DataTableCellDragSelectionState | null>(null);
	const suppressNextCellClickRef = useRef(false);
	const dataTableGridContainerRef = useRef<HTMLDivElement | null>(null);
	const designSaveInFlightRef = useRef(false);
	const pendingDesignPatchRef = useRef<DataTableDesignPatchInput | null>(null);
	const inFlightDesignPatchRef = useRef<{
		patch: DataTableDesignPatchInput;
		dataTableId: string;
	} | null>(null);
	const drainDataTableDesignSaveRef = useRef<(() => void) | null>(null);
	const latestSavedColumnWidthsRef = useRef<SheetColumnWidths>({});
	const designMutationRuntimeRef = useRef<DataTableDesignMutationRuntime | null>(null);
	const cellRenderStoreRef = useRef(createGridUICellRenderStore());
	const cellUICacheRef = useRef(
		new Map<
			string,
			{
				cell: SheetUICell;
				signature: string;
			}
		>(),
	);
	const cellSaveVersionRef = useRef<Record<string, number>>({});
	const committingEditorRef = useRef(false);
	const scrollFrameRef = useRef<number | null>(null);
	const dataTableArrowNavigationRuntimeRef = useRef<DataTableArrowNavigationRuntime | null>(null);
	const pendingScrollRef = useRef({
		scrollLeft: 0,
		scrollTop: 0,
	});
	const paginationRef = useRef<DataTablePaginationState>({
		hasMoreRows: true,
		lastCursor: null,
	});
	const [interactionStateValue, setInteractionStateValue] = useAtom(p.stateAtoms.interactionStateAtom);
	const interactionState = interactionStateValue as DataTableInteractionState<DataTableCellLookup>;
	const [columnReorderVisualState, setColumnReorderVisualState] = useAtom(p.stateAtoms.columnReorderVisualStateAtom);
	const [optimisticValues, setOptimisticValues] = useAtom(p.stateAtoms.optimisticValuesAtom);
	const [resizingColumnKey, setResizingColumnKey] = useAtom(p.stateAtoms.resizingColumnKeyAtom);
	const [columnWidthDrafts, setColumnWidthDrafts] = useAtom(p.stateAtoms.columnWidthDraftsAtom);
	const interactionStateRef = useRef<DataTableInteractionState<DataTableCellLookup>>(interactionState);
	const [selectedViewIdState, setSelectedViewId] = useAtom(p.stateAtoms.selectedViewIdAtom);
	const [designStateValue, setDesignState] = useAtom(p.stateAtoms.designStateAtom);
	const [scrollState, setScrollState] = useAtom(p.stateAtoms.scrollStateAtom);
	const { editDataTableCells } = useEditDataTableCells();
	const { editDataTableDesign } = useEditDataTableDesign();
	const [keyDown, setKeyDown] = useKeyDown();

	interactionStateRef.current = interactionState;
	const selectedViewId = selectedViewIdState === undefined ? getValidDefaultDataTableViewId(dataTable.design) : selectedViewIdState;
	const fallbackDesignState = useMemo(() => {
		return getInitialDataTableDesignReducerState(dataTableId, dataTable.design);
	}, [dataTable.design, dataTableId]);
	const designState = designStateValue || fallbackDesignState;
	const updateInteractionRenderSnapshots = useCallback((currentState: DataTableInteractionState<DataTableCellLookup>, nextState: DataTableInteractionState<DataTableCellLookup>) => {
		const nextEditState = getActiveEditState(nextState);
		const nextSelectedCellState = getSelectedCellState(nextState);
		const nextSelectedCellSelection = getSelectedCellSelection(nextState);
		const renderKeys = getGridInteractionRenderKeys({
			currentEditState: getActiveEditState(currentState),
			currentSelectedCellKeyMap: getSelectedCellSelection(currentState)?.selectedCellKeyMap || null,
			currentSelectedCellState: getSelectedCellState(currentState),
			nextEditState,
			nextSelectedCellKeyMap: nextSelectedCellSelection?.selectedCellKeyMap || null,
			nextSelectedCellState,
		});

		renderKeys.forEach((renderKey) => {
			const { cellKey, rowId } = getDataTableCellRenderKeyParts(renderKey);

			if (!rowId || !cellKey) {
				return;
			}

			cellRenderStoreRef.current.setSnapshot(rowId, cellKey, getGridCellRenderSnapshot({
				cell: cellUICacheRef.current.get(renderKey)?.cell,
				cellKey,
				editState: nextEditState,
				rowId,
				selectedCellKeyMap: nextSelectedCellSelection?.selectedCellKeyMap || null,
				selectedCellState: nextSelectedCellState,
			}));
		});
	}, []);
	const dispatchInteractionState = useCallback((action: DataTableInteractionAction<DataTableCellLookup>) => {
		const currentState = interactionStateRef.current;
		const nextState = dataTableInteractionReducer(currentState, action);

		if (nextState === currentState) {
			return;
		}

		interactionStateRef.current = nextState;
		setInteractionStateValue(nextState as DataTableInteractionState);
		updateInteractionRenderSnapshots(currentState, nextState);
	}, [setInteractionStateValue, updateInteractionRenderSnapshots]);
	const dispatchOptimisticValues = useCallback((action: DataTableCellValueReducerAction) => {
		setOptimisticValues((currentState) => dataTableCellValueReducer(currentState, action));
	}, [setOptimisticValues]);
	const dispatchDesignState = useCallback((action: DataTableDesignReducerAction) => {
		setDesignState((currentState) => dataTableDesignReducer(currentState || fallbackDesignState, action));
	}, [fallbackDesignState, setDesignState]);
	const editState = getActiveEditState(interactionState);
	const headerEditState = getActiveHeaderEditState(interactionState);
	const selectedHeaderCellKey = getSelectedHeaderCellKey(interactionState);
	const singleClickedCellState = getSelectedCellState(interactionState);
	const selectedCellSelection = getSelectedCellSelection(interactionState);
	const selectedCellKeyMap = selectedCellSelection?.selectedCellKeyMap || null;
	const inboundContactEditorState = getOpenLocalEditorState(interactionState);

	const effectiveDesign = useMemo(() => {
		if (designState.dataTableId !== dataTableId) {
			return dataTable.design;
		}

		return mergeDataTableDesignWithPatch(designState.serverDesign, designState.localPatch);
	}, [designState.localPatch, designState.serverDesign, designState.dataTableId, dataTable.design, dataTableId]);
	const effectiveSheet = useMemo(() => {
		return {
			...dataTable,
			design: effectiveDesign,
		};
	}, [effectiveDesign, dataTable]);
	const dataTableViews = useMemo(() => {
		return getOrderedDataTableDesignViews(effectiveDesign as any) as DataTableDesignViewGQL[];
	}, [effectiveDesign]);
	const activeView = useMemo(() => {
		return getSelectedDataTableView(dataTableViews, selectedViewId);
	}, [selectedViewId, dataTableViews]);
	const dataTableRowsFilter = useMemo(() => {
		return activeView ? { viewId: activeView.id } : null;
	}, [activeView]);
	const dataTableRowsQueryParams = useMemo(() => {
		return { openModalPopUp };
	}, [openModalPopUp]);
	const rowSourceKey = useMemo(() => {
		return getDataTableRowsSourceKey(dataTableId, activeView?.id || null);
	}, [activeView?.id, dataTableId]);
	const [rowStateValue, setRowStateValue] = useAtom(p.stateAtoms.rowsStateAtom);
	const fallbackRowState = useMemo(() => {
		return getInitialDataTableRowsState(rowSourceKey);
	}, [rowSourceKey]);
	const rowState = rowStateValue || fallbackRowState;
	const setRowState = useCallback((update: DataTableRowsState | ((currentState: DataTableRowsState) => DataTableRowsState)) => {
		setRowStateValue((currentState) => {
			const baseState = currentState || getInitialDataTableRowsState(rowSourceKey);

			return typeof update === 'function' ? update(baseState) : update;
		});
	}, [rowSourceKey, setRowStateValue]);
	const { dataTableRows, fetchMore, resetOnlyTime, variables: dataTableRowsVariables } = useDataTableRows(dataTableId, organizationId, null, limit, dataTableRowsFilter, dataTableRowsQueryParams);
	useFloatingMessageForDataTableRowsReset(resetOnlyTime, setFloatingMessage);
	const isDataTableRowsDataCurrent =
		String(dataTableRowsVariables?.dataTableId || '') === String(dataTableId || '') &&
		String(dataTableRowsVariables?.organizationId || '') === String(organizationId || '') &&
		(dataTableRowsVariables?.filter?.viewId || null) === (dataTableRowsFilter?.viewId || null);
	const isDataTableRowsReady = Array.isArray(dataTableRows) && isDataTableRowsDataCurrent;
	const masterDesignCells = useMemo(() => {
		return effectiveSheet.design?.cells || [];
	}, [effectiveSheet.design?.cells]);
	const masterColumns = useMemo(() => {
		return getOrderedDataTableDesignCells(effectiveSheet);
	}, [effectiveSheet]);
	const serverColumns = useMemo(() => {
		return getOrderedDataTableDesignCells({
			...dataTable,
			design: designState.dataTableId === dataTableId ? designState.serverDesign : dataTable.design,
		});
	}, [designState.serverDesign, designState.dataTableId, dataTable, dataTable.design, dataTableId]);
	const columns = useMemo(() => {
		return getDataTableRuntimeDesignCellsWithUniqueKeys(activeView ? getDataTableViewRuntimeCells(activeView, masterDesignCells) : masterColumns);
	}, [activeView, masterColumns, masterDesignCells]);
	const columnKeys = useMemo(() => {
		return columns.map(getDataTableRuntimeColumnKey);
	}, [columns]);
	const uiColumns = useMemo(() => {
		return columns.map(getSheetUIColumn);
	}, [columns]);
	const savedColumnWidths = useMemo(() => {
		return getDataTableDesignColumnWidths(serverColumns);
	}, [serverColumns]);
	latestSavedColumnWidthsRef.current = savedColumnWidths;
	const mergedColumnWidths = useMemo(() => {
		return {
			...savedColumnWidths,
			...getDataTableDesignColumnWidths(columns),
			...columnWidthDrafts,
		};
	}, [columnWidthDrafts, columns, savedColumnWidths]);
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
		return new Map(columnMetricsData.metrics.map((metric) => [metric.column.id, metric]));
	}, [columnMetricsData.metrics]);
	const designCellsByKey = useMemo(() => {
		return new Map(columns.map((cell) => [getDataTableRuntimeColumnKey(cell), cell]));
	}, [columns]);

	columnReorderRuntimeRef.current = getDataTableColumnReorderRuntime({
		activeView,
		columnMetrics: columnReorderMetrics,
		design: effectiveDesign,
		visibleColumnKeys: columnKeys,
	});

	useIsomorphicLayoutEffect(() => {
		dispatchInteractionState({
			type: 'reset',
		});
		dispatchOptimisticValues({
			type: 'reset',
		});
		setColumnWidthDrafts({});
		setColumnReorderVisualState(null);
		setRowState(getInitialDataTableRowsState(rowSourceKey));
		setScrollState({
			scrollLeft: 0,
			scrollTop: 0,
		});
		cellUICacheRef.current.clear();
		pendingDesignPatchRef.current = null;
	}, [rowSourceKey]);

	/*
	 * Restore the active editor cell as the dataTable's single-click selected cell.
	 */

	const restoreSingleClickedCellFromEditState = useCallback((editStateToRestore?: SheetUIEditState | null) => {
		const nextSingleClickedCell = getDataTableSelectedCellStateFromEditState(editStateToRestore ?? getActiveEditState(interactionStateRef.current));

		if (nextSingleClickedCell) {
			dispatchInteractionState({
				cell: nextSingleClickedCell,
				type: 'cell_selected',
			});
		} else {
			dispatchInteractionState({
				type: 'clear',
			});
		}

		return nextSingleClickedCell;
	}, []);

	/*
	 * Close the active cell editor while keeping its cell selected.
	 */

	const dismissCellEditorToSelectedCell = useCallback(
		(
			editStateToRestore?: SheetUIEditState | null,
			options?: Partial<{
				clearInboundContactEditor: boolean;
				rememberDismissedLocalEditor: boolean;
			}>,
		) => {
			const nextSingleClickedCell = restoreSingleClickedCellFromEditState(editStateToRestore);

			if (options?.rememberDismissedLocalEditor) {
				if (nextSingleClickedCell) {
					dispatchInteractionState({
						cell: nextSingleClickedCell,
						type: 'local_editor_dismissed_to_cell',
					});
				}
			}
		},
		[restoreSingleClickedCellFromEditState],
	);

	useIsomorphicLayoutEffect(() => {
		setSelectedViewId(getValidDefaultDataTableViewId(dataTable.design));
	}, [dataTableId]);

	useEffect(() => {
		if (selectedViewId && !dataTableViews.some((view) => view.id === selectedViewId)) {
			setSelectedViewId(getValidDefaultDataTableViewId(effectiveDesign));
		}
	}, [effectiveDesign, selectedViewId, dataTableViews]);

	useEffect(() => {
		dispatchDesignState({
			design: dataTable.design,
			dataTableId,
			type: 'server_design_received',
		});
	}, [dataTable.design, dataTableId]);

	designMutationRuntimeRef.current = {
		editDataTableDesign,
		organizationId,
		dataTableId,
	};

	useIsomorphicLayoutEffect(() => {
		if (isDataTableRowsReady) {
			setRowState((currentState) => mergeDataTableRowsState(currentState, rowSourceKey, dataTableRows as DataTableRowGQL[], limit));
		}
	}, [isDataTableRowsReady, limit, rowSourceKey, dataTableRows]);

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
	const reactiveRows = useReactiveDataTableRows(rows) as DataTableRowGQL[] | null;
	const renderedRows = isDataTableRowsReady && rowStateMatchesSource ? reactiveRows || rows : [];
	const rowsById = useMemo(() => {
		return new Map(renderedRows.map((row) => [row.id, row]));
	}, [renderedRows]);
	const rowIndexById = useMemo(() => {
		return new Map(renderedRows.map((row, index) => [row.id, index]));
	}, [renderedRows]);
	const rowCellsById = useMemo(() => {
		return getDataTableRowCellsById(renderedRows);
	}, [renderedRows]);
	const selectedCellLookup = useMemo<DataTableCellLookup | null>(() => {
		if (!singleClickedCellState) {
			return null;
		}

		const row = rowsById.get(singleClickedCellState.rowId);
		const designCell = designCellsByKey.get(singleClickedCellState.cellKey);

		if (!row || !designCell) {
			return null;
		}

		return {
			cell: rowCellsById.get(row.id)?.get(getDataTableRuntimeCellKey(designCell)) || null,
			designCell,
			row,
		};
	}, [designCellsByKey, rowCellsById, rowsById, singleClickedCellState]);
	const activeDateEditorLookup = useMemo<DataTableCellLookup | null>(() => {
		const designCell = editState?.cellKey ? designCellsByKey.get(editState.cellKey) : null;

		if (!editState || !designCell || !isDataTableDateEditorFieldType(getSheetEditorFieldType(designCell))) {
			return null;
		}

		const row = rowsById.get(editState.rowId);

		if (!row) {
			return null;
		}

		return {
			cell: rowCellsById.get(row.id)?.get(getDataTableRuntimeCellKey(designCell)) || null,
			designCell,
			row,
		};
	}, [designCellsByKey, editState, rowCellsById, rowsById]);
	const activeSelectEditorLookup = useMemo<DataTableCellLookup | null>(() => {
		const designCell = editState?.cellKey ? designCellsByKey.get(editState.cellKey) : null;

		if (!editState || !designCell || !isSheetSelectEditorFieldType(getSheetEditorFieldType(designCell))) {
			return null;
		}

		const row = rowsById.get(editState.rowId);

		if (!row) {
			return null;
		}

		return {
			cell: rowCellsById.get(row.id)?.get(getDataTableRuntimeCellKey(designCell)) || null,
			designCell,
			row,
		};
	}, [designCellsByKey, editState, rowCellsById, rowsById]);

	useEffect(() => {
		const confirmedKeys: string[] = [];

		Object.entries(optimisticValues).forEach(([optimisticKey, optimisticValue]) => {
			const [rowId, cellKey] = optimisticKey.split(':');
			const designCell = designCellsByKey.get(cellKey || '');
			if (!rowId || !designCell) {
				return;
			}

			const cell = rowCellsById.get(rowId)?.get(getDataTableRuntimeCellKey(designCell));
			const serverValue = getDataTableCellSerializedValue(cell, designCell);

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
	const { queue: queueDataTableCellSave } = useDebouncedCellSaveBatch<DataTablePendingCellSave>({
		getKey: (item) => item.optimisticKey,
		onError: (items) => {
			items.forEach((item) => {
				if (cellSaveVersionRef.current[item.optimisticKey] === item.saveVersion) {
					dispatchOptimisticValues({
						cellKey: item.runtimeKey,
						rowId: item.lookup.row.id,
						type: 'local_value_reverted',
					});
				}
			});
		},
		onBeaconFlush: (items) => {
			const groups = groupCellSaveItemsByTarget(items, (item) => ({
				organizationId: item.organizationId,
				targetId: item.dataTableId,
			}));

			return sendGroupedCellSaveItems(groups, (group) => {
				return sendCellSaveBeacon({
					cells: group.items.map((item) => ({
						dataTableRowId: item.lookup.row.id,
						cellKey: item.cellKey,
						viewKey: item.viewId || null,
						viewCellKey: item.viewCellKey || null,
						value: item.value,
					})),
					organizationId: group.organizationId || null,
					targetId: group.targetId || null,
					targetType: 'dataTable',
				});
			});
		},
		onFlush: async (items) => {
			const groups = groupCellSaveItemsByTarget(items, (item) => ({
				organizationId: item.organizationId,
				targetId: item.dataTableId,
			}));
			const savedCellsByKey = new Map<string, DataTableCellGQL>();

			for (const group of groups) {
				if (!group.organizationId || !group.targetId) {
					continue;
				}

				const result = await editDataTableCells({
					variables: {
						organizationId: group.organizationId,
						dataTableId: group.targetId,
						cells: group.items.map((item) => ({
							dataTableRowId: item.lookup.row.id,
							cellKey: item.cellKey,
							viewId: item.viewId || null,
							viewCellKey: item.viewCellKey || null,
							value: item.value,
						})),
					},
				});
				const savedCells = (result?.editDataTableCells || []) as DataTableCellGQL[];

				savedCells.forEach((cell) => {
					savedCellsByKey.set(getSheetCellKey(String(cell.dataTableRowId), cell.cellKey), cell);
				});
			}

			items.forEach((item) => {
				const savedCellKey = getDataTableRuntimeCellKey(item.lookup.designCell);
				const savedCell = savedCellsByKey.get(getSheetCellKey(String(item.lookup.row.id), savedCellKey));

				if (
					cellSaveVersionRef.current[item.optimisticKey] === item.saveVersion &&
					savedCell
				) {
					dispatchOptimisticValues({
						cellKey: item.runtimeKey,
						rowId: item.lookup.row.id,
						type: 'local_value_queued',
						value: getDataTableCellSerializedValue(savedCell, item.lookup.designCell),
					});
				}
			});
		},
	});
	const saveCellValue = useCallback(
		async (lookup: DataTableCellLookup, value: string | null) => {
			const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);
			const optimisticKey = getSheetCellKey(lookup.row.id, runtimeKey);
			const saveVersion = (cellSaveVersionRef.current[optimisticKey] || 0) + 1;
			cellSaveVersionRef.current[optimisticKey] = saveVersion;

			dispatchOptimisticValues({
				cellKey: runtimeKey,
				rowId: lookup.row.id,
				type: 'local_value_queued',
				value,
			});

			queueDataTableCellSave({
				cellKey: getDataTableRuntimeCellKey(lookup.designCell),
				dataTableId,
				lookup,
				optimisticKey,
				organizationId,
				runtimeKey,
				saveVersion,
				value,
				viewCellKey: activeView ? lookup.designCell.key : null,
				viewId: activeView?.id || null,
			});
		},
		[activeView, dataTableId, organizationId, queueDataTableCellSave],
	);
	const fetchMoreRows = useCallback(async () => {
		const pagination = paginationRef.current;

		if (fetchingMoreRef.current || !pagination.hasMoreRows || !pagination.lastCursor) {
			return;
		}

		fetchingMoreRef.current = true;

		try {
			const result = await fetchMore({
				variables: {
					dataTableId,
					organizationId,
					cursor: pagination.lastCursor,
					limit,
					filter: dataTableRowsFilter,
				},
			});
			const nextRows = result?.data?.dataTableRows || result?.dataTableRows || [];

			if (Array.isArray(nextRows)) {
				setRowState((currentState) => mergeDataTableRowsState(currentState, rowSourceKey, nextRows as DataTableRowGQL[], limit, true));
			}
		} finally {
			fetchingMoreRef.current = false;
		}
	}, [fetchMore, limit, organizationId, rowSourceKey, dataTableId, dataTableRowsFilter]);

	const drainDataTableDesignSave = useCallback(() => {
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
			dataTableId: runtime.dataTableId,
		};
		designSaveInFlightRef.current = true;

		void (async () => {
			try {
				await runtime.editDataTableDesign({
					variables: {
						organizationId: runtime.organizationId,
						dataTableId: runtime.dataTableId,
						design: pendingPatch,
					},
				});
			} catch (error) {
				console.error(error);
			} finally {
				designSaveInFlightRef.current = false;
				inFlightDesignPatchRef.current = null;

				if (pendingDesignPatchRef.current) {
					drainDataTableDesignSaveRef.current?.();
				}
			}
		})();
	}, []);

	drainDataTableDesignSaveRef.current = drainDataTableDesignSave;

	const queueDataTableDesignSave = useCallback(
		(patch: DataTableDesignPatchInput) => {
			pendingDesignPatchRef.current = mergeDataTableDesignPatch(pendingDesignPatchRef.current, patch);
			drainDataTableDesignSave();
		},
		[drainDataTableDesignSave],
	);

	const commitHeaderEditorElement = useCallback(
		(editorElement: HTMLElement) => {
			const runtime = runtimeRef.current;
			const cellKey = editorElement.dataset.cellKey;
			const designCell = cellKey ? runtime?.designCellsByKey.get(cellKey) : null;

			if (!__DISABLE_EDIT_STATE_RESET__) {
				dispatchInteractionState({
					type: 'header_edit_dismissed',
				});
			}

			if (!runtime || runtime.disabled || !runtime.designEditable || !designCell) {
				return;
			}

			const humanLabel = getDataTableHeaderHumanLabelPatchValue(designCell, getSheetEditorElementValue(editorElement));
			const currentHumanLabel = designCell.humanLabel || null;

			if (currentHumanLabel === humanLabel) {
				return;
			}

			const patch = {
				cells: [
					{
						humanLabel,
						key: designCell.key,
					},
				],
			};

			dispatchDesignState({
				patch,
				type: 'local_patch_queued',
			});
			queueDataTableDesignSave(patch);
		},
		[queueDataTableDesignSave],
	);

	/*
	 * Enter header edit mode for one design cell when the dataTable design can be edited.
	 */

	const startHeaderEdit = useCallback((cellKey: string) => {
		const runtime = runtimeRef.current;
		const designCell = runtime?.designCellsByKey.get(cellKey);

		if (!runtime || runtime.disabled || !runtime.designEditable || !designCell) {
			return;
		}

		dispatchInteractionState({
			headerEditState: {
				cellKey: getDataTableRuntimeColumnKey(designCell),
				draftValue: getDataTableDesignCellHeaderLabel(designCell),
			},
			type: 'header_edit_started',
		});
	}, []);

	const startColumnResize = useCallback(
		(columnKey: string, clientX: number) => {
			const runtime = runtimeRef.current;
			const metric = runtime?.columnMetricsByKey.get(columnKey);
			const designCell = runtime?.designCellsByKey.get(columnKey);

			if (!runtime || runtime.disabled || !runtime.designEditable || !metric || !designCell || columnReorderStateRef.current?.started) {
				return;
			}

			resizeCleanupRef.current?.();
			resizeStateRef.current = {
				columnKey,
				designCellKey: designCell.key,
				startClientX: clientX,
				startWidth: metric.width,
			};
			setResizingColumnKey(columnKey);

			const finishResize = (clientX?: number) => {
				const resizeState = resizeStateRef.current;
				const latestWidth = resizeState
					? (resizeState.latestWidth ??
						(Number.isFinite(clientX) ? clampSheetColumnWidth(resizeState.startWidth + Number(clientX) - resizeState.startClientX) : resizeState.startWidth))
					: null;

				if (resizeFrameRef.current !== null) {
					cancelAnimationFrame(resizeFrameRef.current);
					resizeFrameRef.current = null;
				}

				if (resizeState && latestWidth !== null) {
					const updatesRuntimeColumnDirectly = resizeState.columnKey === resizeState.designCellKey;

					setColumnWidthDrafts((currentDrafts) => {
						const nextDrafts = { ...currentDrafts };
						delete nextDrafts[resizeState.columnKey];
						return nextDrafts;
					});
					dispatchDesignState({
						patch: {
							cells: [
								{
									key: resizeState.designCellKey,
									width: latestWidth,
								},
							],
						},
						type: 'local_patch_queued',
					});

					const savedWidth = latestSavedColumnWidthsRef.current[resizeState.designCellKey] || SHEET_COLUMN_WIDTH;
					const hasQueuedWidthPatch = Boolean(
						pendingDesignPatchRef.current?.cells?.some((cell) => cell.key === resizeState.designCellKey) ||
							(inFlightDesignPatchRef.current?.dataTableId === dataTableId && inFlightDesignPatchRef.current.patch.cells?.some((cell) => cell.key === resizeState.designCellKey)),
					);
					if (!updatesRuntimeColumnDirectly || savedWidth !== latestWidth || hasQueuedWidthPatch) {
						queueDataTableDesignSave({
							cells: [
								{
									key: resizeState.designCellKey,
									width: latestWidth,
								},
							],
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
					setColumnWidthDrafts((currentDrafts) => ({
						...currentDrafts,
						[resizeState.columnKey]: nextWidth,
					}));

					if (resizeState.columnKey === resizeState.designCellKey) {
						dispatchDesignState({
							patch: {
								cells: [
									{
										key: resizeState.designCellKey,
										width: nextWidth,
									},
								],
							},
							type: 'local_patch_queued',
						});
					}
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
		},
		[queueDataTableDesignSave, dataTableId],
	);

	const startColumnReorder = useCallback(
		(columnKey: string, clientX: number) => {
			const runtime = runtimeRef.current;
			const reorderRuntime = columnReorderRuntimeRef.current;
			const scrollNode = scrollElement.node;
			const metric = reorderRuntime?.metrics.find((item) => item.column.key === columnKey);

			if (!runtime || runtime.disabled || !reorderRuntime || !scrollNode || !metric || reorderRuntime.visibleColumnKeys.length < 2) {
				return;
			}

			columnReorderCleanupRef.current?.();

			const startLeft = getSheetColumnMetricHeaderLeft(metric, scrollState.scrollLeft, stickyColumnCount);
			const initialTargetIndex = getDataTableColumnReorderTargetIndex({
				clientX,
				draggedColumnIndex: metric.columnIndex,
				draggedRect: getDataTableColumnReorderDraggedRect({
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
					if (currentState?.columnKey === nextState.columnKey && currentState.dragLeft === nextState.dragLeft && currentState.toVisibleIndex === nextState.toVisibleIndex) {
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
					reorderState.latestToVisibleIndex = getDataTableColumnReorderTargetIndex({
						clientX: latestClientX,
						draggedColumnIndex: reorderState.startColumnIndex,
						draggedRect: getDataTableColumnReorderDraggedRect({
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
					const toVisibleIndex = getDataTableColumnReorderMoveIndex(reorderRuntime.visibleColumnKeys, reorderState.columnKey, reorderState.latestToVisibleIndex);

					if (fromIndex >= 0 && fromIndex !== toVisibleIndex) {
						const nextOrder = moveVisibleDataTableColumnKeyInOrder({
							allColumnKeys: reorderRuntime.allColumnKeys,
							fromKey: reorderState.columnKey,
							savedOrder: reorderRuntime.savedOrder,
							toVisibleIndex,
							visibleColumnKeys: reorderRuntime.visibleColumnKeys,
						});
						const patch: DataTableDesignPatchInput = reorderRuntime.activeViewId
							? {
									views: [
										{
											id: reorderRuntime.activeViewId,
											columnsOrder: nextOrder,
										},
									],
								}
							: {
									cellsOrder: nextOrder,
								};

						dispatchDesignState({
							patch,
							type: 'local_patch_queued',
						});
						queueDataTableDesignSave(patch);
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
					dispatchInteractionState({
						type: 'clear',
					});
				}

				event.preventDefault();
				reorderState.latestClientX = event.clientX;
				reorderState.latestToVisibleIndex = getDataTableColumnReorderTargetIndex({
					clientX: event.clientX,
					draggedColumnIndex: reorderState.startColumnIndex,
					draggedRect: getDataTableColumnReorderDraggedRect({
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
		},
		[queueDataTableDesignSave, scrollElement.node, scrollState.scrollLeft, stickyColumnCount],
	);
	const commitEditorElement = useCallback(
		async (editorElement: HTMLElement) => {
			if (committingEditorRef.current) {
				return;
			}

			const runtime = runtimeRef.current;
			const lookup = runtime ? getDataTableCellLookup(runtime, editorElement.dataset.rowId, editorElement.dataset.cellKey) : null;

			if (!runtime || !lookup) {
				dismissCellEditorToSelectedCell();
				return;
			}

			if (isDataTableLocalEditorFieldType(getSheetEditorFieldType(lookup.designCell))) {
				return;
			}

			const draftValue = getSheetEditorElementValue(editorElement);
			const parsedValue = parseSheetEditorValue(lookup.designCell, draftValue);
			const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);
			const editStateToRestore = isDataTableEditStateLookup(runtime.editState, lookup)
				? runtime.editState
				: {
						cellKey: runtimeKey,
						clickSource: runtime.editState?.clickSource,
						draftValue,
						rowId: lookup.row.id,
					};

			if (parsedValue.error) {
				dispatchInteractionState({
					editState: {
						cellKey: runtimeKey,
						clickSource: editStateToRestore?.clickSource,
						draftValue,
						error: parsedValue.error,
						rowId: lookup.row.id,
					},
					type: 'cell_edit_started',
				});
				return;
			}

			const optimisticKey = getSheetCellKey(lookup.row.id, runtimeKey);
			const currentValue = getDataTableCellSerializedValue(lookup.cell, lookup.designCell, runtime.optimisticValues[optimisticKey]);

			if (!__DISABLE_EDIT_STATE_RESET__) {
				dismissCellEditorToSelectedCell(editStateToRestore);
			}

			if (currentValue === parsedValue.value) {
				return;
			}

			committingEditorRef.current = true;

			try {
				await runtime.saveCellValue(lookup, parsedValue.value);
			} catch (error) {
				dispatchInteractionState({
					editState: {
						cellKey: runtimeKey,
						clickSource: editStateToRestore?.clickSource,
						draftValue,
						error: error instanceof Error ? error.message : 'Unable to save cell',
						rowId: lookup.row.id,
					},
					type: 'cell_edit_started',
				});
			} finally {
				committingEditorRef.current = false;
			}
		},
		[dismissCellEditorToSelectedCell],
	);

	/*
	 * Open the inbound contact overlay editor from one dataTable cell lookup.
	 */

	function openInboundContactLocalEditor(lookup: DataTableCellLookup, clickSource: SheetUIEditorClickSource) {
		const runtime = runtimeRef.current;
		const displayValue = getSheetCellDisplayValue(lookup.cell, lookup.designCell, undefined, timeZone);
		const editState = runtime
			? getDataTableCellOverlayEditState(runtime, lookup, clickSource)
			: {
					cellKey: getDataTableRuntimeColumnKey(lookup.designCell),
					clickSource,
					disableInlineEditor: true,
					draftValue: getSheetEditorDraftValue(lookup.cell, lookup.designCell),
					rowId: lookup.row.id,
				};

		dispatchInteractionState({
			editState,
			localEditorState: {
				clickSource,
				displayValue,
				lookup,
			},
			type: 'local_editor_opened',
		});
	}

	runtimeRef.current = {
		columnMetricsByKey,
		designCellsByKey,
		designEditable: !activeView,
		disabled: effectiveDisabled,
		editState,
		optimisticValues,
		openCell: (params: DataTableOpenCellParams) => {
			openDataTableCellLink({
				...params,
				openInboundContactEditor: (openParams: DataTableOpenCellParams) => {
					const currentRuntime = runtimeRef.current;
					const lookup = {
						cell: openParams.cell,
						designCell: openParams.designCell,
						row: openParams.row,
					};
					const clickSource = openParams.clickSource || 'CELL_BACKGROUND';
					const editState = currentRuntime
						? getDataTableCellOverlayEditState(currentRuntime, lookup, clickSource)
						: {
								cellKey: getDataTableRuntimeColumnKey(openParams.designCell),
								clickSource,
								disableInlineEditor: true,
								draftValue: getSheetEditorDraftValue(openParams.cell, openParams.designCell),
								rowId: openParams.row.id,
							};

					dispatchInteractionState({
						editState,
						localEditorState: {
							clickSource,
							displayValue: getSheetCellDisplayValue(openParams.cell, openParams.designCell, undefined, timeZone),
							lookup,
						},
						type: 'local_editor_opened',
					});
				},
				openModalScreen,
				setFloatingMessage,
			});
		},
		rowCellsById,
		rowsById,
		saveCellValue,
		dataTable: effectiveSheet,
		startColumnReorder,
		startColumnResize,
		timeZone,
	};

	/*
	 * Open editor behavior for one target selected from the DataTable context menu.
	 */

	const handleDataTableContextMenuEditCell = useCallback(
		(target: DataTableContextMenuCellTarget) => {
			const runtime = runtimeRef.current;
			const lookup = target.lookup;

			if (
				!runtime ||
				lookup.row.__deleted ||
				runtime.disabled ||
				runtime.dataTable.design?.humansCannotEdit ||
				lookup.designCell.humansCannotEdit ||
				isDataTableReferenceCell(lookup.cell)
			) {
				return;
			}

			if (isDataTableInboundContactIdLookup(lookup)) {
				openInboundContactLocalEditor(lookup, 'CELL_BACKGROUND');
				return;
			}

			if (handleDataTableRelatedDocumentCellEdit(lookup, setFloatingMessage)) {
				return;
			}

			dispatchInteractionState({
				editState: getDataTableCellEditState(runtime, lookup, 'CELL_BACKGROUND'),
				type: 'cell_edit_started',
			});
		},
		[setFloatingMessage, timeZone],
	);

	/*
	 * Open link behavior for one target selected from the DataTable context menu.
	 */

	const handleDataTableContextMenuOpenCell = useCallback((target: DataTableContextMenuCellTarget) => {
		const runtime = runtimeRef.current;
		const lookup = target.lookup;

		if (!runtime || lookup.row.__deleted || !canOpenDataTableCellLink(lookup.cell, lookup.designCell)) {
			return;
		}

		runtime.openCell({
			cell: lookup.cell,
			clickSource: 'CELL_LINK',
			designCell: lookup.designCell,
			row: lookup.row,
			dataTable: runtime.dataTable,
		});
	}, []);

	/*
	 * Scroll the dataTable viewport just enough to keep one cell visible.
	 */

	const scrollDataTableSelectedCellIntoView = useCallback((navigationRuntime: DataTableArrowNavigationRuntime, selectedCellState: { cellKey: string; rowId: string }) => {
		const nextColumnMetric = navigationRuntime.columnMetrics.find((metric) => metric.column.key === selectedCellState.cellKey);
		const nextRowIndex = navigationRuntime.renderedRows.findIndex((row) => row.id === selectedCellState.rowId);

		if (!nextColumnMetric || nextRowIndex < 0) {
			return;
		}

		const nextScrollState = getDataTableArrowNavigationScrollState({
			columnMetric: nextColumnMetric,
			rowIndex: nextRowIndex,
			runtime: navigationRuntime,
		});

		if (navigationRuntime.scrollNode) {
			navigationRuntime.scrollNode.scrollLeft = nextScrollState.scrollLeft;
			navigationRuntime.scrollNode.scrollTop = nextScrollState.scrollTop;
		}

		pendingScrollRef.current = nextScrollState;
		setScrollState((currentState) => {
			if (currentState.scrollLeft === nextScrollState.scrollLeft && currentState.scrollTop === nextScrollState.scrollTop) {
				return currentState;
			}

			return nextScrollState;
		});
	}, []);

	/*
	 * Move the selected dataTable cell by one keyboard arrow step.
	 */

	const handleDataTableArrowKeyNavigation = useCallback((direction: DataTableArrowNavigationDirection, extendSelection = false) => {
		const navigationRuntime = dataTableArrowNavigationRuntimeRef.current;
		const selectedCellState = getSelectedCellState(interactionStateRef.current);
		const selectedSelection = getSelectedCellSelection(interactionStateRef.current);
		const navigationCellState = extendSelection
			? selectedSelection?.rangeEndCell || selectedCellState
			: selectedCellState;
		const nextSelectedCellState = navigationRuntime
			? getDataTableArrowNavigationSelection({
					columnMetrics: navigationRuntime.columnMetrics,
					direction,
					renderedRows: navigationRuntime.renderedRows,
					selectedCellState: navigationCellState,
				})
			: null;

		if (!navigationRuntime || !nextSelectedCellState) {
			return;
		}

		scrollDataTableSelectedCellIntoView(navigationRuntime, nextSelectedCellState);
		if (extendSelection) {
			dispatchInteractionState({
				selection: getDataTableRangeSelection({
					activeCell: nextSelectedCellState,
					anchorCell: selectedSelection?.anchorCell || selectedCellState || nextSelectedCellState,
					columnMetrics: navigationRuntime.columnMetrics,
					renderedRows: navigationRuntime.renderedRows,
					selectedActiveCell: selectedSelection?.activeCell || selectedCellState || nextSelectedCellState,
				}),
				type: 'cell_range_selected',
			});
			return;
		}

		dispatchInteractionState({
			cell: nextSelectedCellState,
			type: 'cell_selected',
		});
	}, [scrollDataTableSelectedCellIntoView]);

	/*
	 * Move only the active cell border through the current multi-cell selection.
	 */

	const handleDataTableTabKeyNavigation = useCallback((direction: 'forward' | 'backward') => {
		const navigationRuntime = dataTableArrowNavigationRuntimeRef.current;
		const selectedSelection = getSelectedCellSelection(interactionStateRef.current);

		if (!navigationRuntime || !selectedSelection || Object.keys(selectedSelection.selectedCellKeyMap).length <= 1) {
			handleDataTableArrowKeyNavigation(direction === 'backward' ? 'left' : 'right');
			return;
		}

		const nextActiveCell = getDataTableNextActiveSelectedCell({
			columnMetrics: navigationRuntime.columnMetrics,
			direction,
			renderedRows: navigationRuntime.renderedRows,
			selection: selectedSelection,
		});

		if (!nextActiveCell) {
			return;
		}

		scrollDataTableSelectedCellIntoView(navigationRuntime, nextActiveCell);
		dispatchInteractionState({
			selection: {
				...selectedSelection,
				activeCell: nextActiveCell,
			},
			type: 'cell_range_selected',
		});
	}, [handleDataTableArrowKeyNavigation, scrollDataTableSelectedCellIntoView]);

	/*
	 * Return a selectable body cell state from one rendered cell element.
	 */

	const getDataTableBodyCellStateFromElement = useCallback((cellElement?: HTMLElement | null) => {
		const runtime = runtimeRef.current;

		if (!runtime || !cellElement?.dataset.rowId || !cellElement.dataset.cellKey) {
			return null;
		}

		const lookup = getDataTableCellLookup(runtime, cellElement.dataset.rowId, cellElement.dataset.cellKey);

		if (!lookup || lookup.row.__deleted) {
			return null;
		}

		return {
			cellKey: getDataTableRuntimeColumnKey(lookup.designCell),
			rowId: lookup.row.id,
		};
	}, []);

	/*
	 * Select a rectangular dataTable range from the active cell to one target cell.
	 */
	const selectDataTableCellRangeToTarget = useCallback((targetCell: SheetUISelectedCellState) => {
		const navigationRuntime = dataTableArrowNavigationRuntimeRef.current;
		const selectedCellState = getSelectedCellState(interactionStateRef.current);
		const anchorCell = selectedCellState || targetCell;

		if (!navigationRuntime) {
			return;
		}

		scrollDataTableSelectedCellIntoView(navigationRuntime, targetCell);
		dispatchInteractionState({
			selection: getDataTableRangeSelection({
				activeCell: targetCell,
				anchorCell,
				columnMetrics: navigationRuntime.columnMetrics,
				renderedRows: navigationRuntime.renderedRows,
				selectedActiveCell: anchorCell,
			}),
			type: 'cell_range_selected',
		});
	}, [scrollDataTableSelectedCellIntoView]);

	/*
	 * Extend the active mouse drag selection to one body cell.
	 */

	const updateDataTableCellDragSelection = useCallback((targetCell: { cellKey: string; rowId: string }) => {
		const dragState = cellDragSelectionStateRef.current;
		const navigationRuntime = dataTableArrowNavigationRuntimeRef.current;

		if (!dragState || !navigationRuntime) {
			return;
		}

		const isSameLatestCell = dragState.latestCell.rowId === targetCell.rowId && dragState.latestCell.cellKey === targetCell.cellKey;

		if (isSameLatestCell) {
			return;
		}

		dragState.latestCell = targetCell;
		dragState.started = true;
		suppressNextCellClickRef.current = true;
		dispatchInteractionState({
			selection: getDataTableRangeSelection({
				activeCell: targetCell,
				anchorCell: dragState.anchorCell,
				columnMetrics: navigationRuntime.columnMetrics,
				renderedRows: navigationRuntime.renderedRows,
				selectedActiveCell: dragState.anchorCell,
			}),
			type: 'cell_range_selected',
		});
	}, []);

	const { closeDataTableContextMenu, openDataTableContextMenu } = useDataTableContextMenu<DataTableCellLookup>({
		onEditCell: handleDataTableContextMenuEditCell,
		onOpenCell: handleDataTableContextMenuOpenCell,
		openModalPopUp,
	});

	/*
	 * Open the current selected cell through the same rules used by the context menu.
	 */

	const openSelectedDataTableCellEditor = useCallback(() => {
		const runtime = runtimeRef.current;
		const selectedCellState = getSelectedCellState(interactionStateRef.current);
		const lookup = runtime && selectedCellState ? getDataTableCellLookup(runtime, selectedCellState.rowId, selectedCellState.cellKey) : null;

		if (!runtime || !lookup) {
			return;
		}

		handleDataTableContextMenuEditCell(getDataTableContextMenuCellTarget(runtime, lookup, rowIndexById.get(lookup.row.id) ?? -1, activeView, effectiveDesign));
	}, [activeView, effectiveDesign, handleDataTableContextMenuEditCell, rowIndexById]);

	/*
	 * Copy the active dataTable selection to the system clipboard as TSV text.
	 */

	const copySelectedDataTableCells = useCallback(() => {
		const runtime = runtimeRef.current;
		const navigationRuntime = dataTableArrowNavigationRuntimeRef.current;
		const selection = getSelectedCellSelection(interactionStateRef.current);

		if (!runtime || !navigationRuntime || !selection) {
			return;
		}

		void copyTextToClipboard(getDataTableSelectionClipboardText({
			columnMetrics: navigationRuntime.columnMetrics,
			renderedRows: navigationRuntime.renderedRows,
			runtime,
			selection,
		}));
	}, []);

	/*
	 * Apply one parsed shortcut write to a dataTable cell when allowed.
	 */

	const saveDataTableShortcutCellValue = useCallback(
		async (runtime: DataTableRuntimeState, lookup: DataTableCellLookup, draftValue: string, summary: DataTableShortcutMutationSummary) => {
			if (!canWriteDataTableShortcutCell({
				activeView,
				design: effectiveDesign,
				disabled: runtime.disabled,
				lookup,
			})) {
				summary.skipped += 1;
				return;
			}

			const parsedValue = parseSheetEditorValue(lookup.designCell, draftValue);
			if (parsedValue.error) {
				summary.skipped += 1;
				return;
			}

			const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);
			const optimisticKey = getSheetCellKey(lookup.row.id, runtimeKey);
			const currentValue = getDataTableCellSerializedValue(lookup.cell, lookup.designCell, runtime.optimisticValues[optimisticKey]);

			if (currentValue === parsedValue.value) {
				summary.skipped += 1;
				return;
			}

			try {
				await runtime.saveCellValue(lookup, parsedValue.value);
				summary.saved += 1;
			} catch {
				summary.failed += 1;
			}
		},
		[activeView, effectiveDesign],
	);

	/*
	 * Paste clipboard text into the loaded dataTable grid with per-cell validation.
	 */

	const pasteSelectedDataTableCells = useCallback(
		async (clipboardText: string) => {
			const runtime = runtimeRef.current;
			const navigationRuntime = dataTableArrowNavigationRuntimeRef.current;
			const selection = getSelectedCellSelection(interactionStateRef.current);

			if (!runtime || !navigationRuntime || !selection) {
				return;
			}

			const summary: DataTableShortcutMutationSummary = {
				failed: 0,
				saved: 0,
				skipped: 0,
			};
			const pasteTargets = getDataTablePasteTargets({
				activeCell: selection.activeCell,
				clipboardGrid: parseDataTableClipboardText(clipboardText),
				columnMetrics: navigationRuntime.columnMetrics,
				renderedRows: navigationRuntime.renderedRows,
				selection,
			});

			for (const target of pasteTargets) {
				const lookup = getDataTableCellLookup(runtime, target.rowId, target.cellKey);

				if (!lookup) {
					summary.skipped += 1;
					continue;
				}

				await saveDataTableShortcutCellValue(runtime, lookup, target.value, summary);
			}

			setFloatingMessage?.({
				text: getDataTableShortcutSummaryText('paste', summary),
				type: summary.failed ? 'WARNING' : 'NOTICE',
			});
		},
		[saveDataTableShortcutCellValue, setFloatingMessage],
	);

	/*
	 * Clear every editable cell in the active dataTable selection.
	 */

	const clearSelectedDataTableCells = useCallback(
		async () => {
			const runtime = runtimeRef.current;
			const navigationRuntime = dataTableArrowNavigationRuntimeRef.current;
			const selection = getSelectedCellSelection(interactionStateRef.current);

			if (!runtime || !navigationRuntime || !selection) {
				return;
			}

			const summary: DataTableShortcutMutationSummary = {
				failed: 0,
				saved: 0,
				skipped: 0,
			};
			const selectedCells = getDataTableOrderedSelectedCells({
				columnMetrics: navigationRuntime.columnMetrics,
				renderedRows: navigationRuntime.renderedRows,
				selection,
			});

			for (const selectedCell of selectedCells) {
				const lookup = getDataTableCellLookup(runtime, selectedCell.rowId, selectedCell.cellKey);

				if (!lookup) {
					summary.skipped += 1;
					continue;
				}

				await saveDataTableShortcutCellValue(runtime, lookup, '', summary);
			}

			setFloatingMessage?.({
				text: getDataTableShortcutSummaryText('clear', summary),
				type: summary.failed ? 'WARNING' : 'NOTICE',
			});
		},
		[saveDataTableShortcutCellValue, setFloatingMessage],
	);

	/*
	 * Own every keyboard shortcut for the DataTable grid in one global handler.
	 */

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const {
				editorElement,
				headerEditorElement,
				localEditorElement,
			} = getGridKeyboardElements(event, {
				editorSelector: '[data-sheet-editor="true"]',
				headerEditorSelector: '[data-sheet-header-editor="true"]',
				localEditorSelector: DATA_TABLE_LOCAL_EDITOR_SELECTOR,
			});
			const metaKey = event.metaKey || event.ctrlKey;
			const selectAllDataTableCells = () => {
				const navigationRuntime = dataTableArrowNavigationRuntimeRef.current;
				const firstCell = navigationRuntime?.columnMetrics[0]?.column.key && navigationRuntime.renderedRows[0]
					? { cellKey: navigationRuntime.columnMetrics[0].column.key, rowId: navigationRuntime.renderedRows[0].id }
					: null;
				const lastCell = navigationRuntime?.columnMetrics.at(-1)?.column.key && navigationRuntime.renderedRows.at(-1)
					? { cellKey: navigationRuntime.columnMetrics.at(-1)!.column.key, rowId: navigationRuntime.renderedRows.at(-1)!.id }
					: null;

				if (navigationRuntime && firstCell && lastCell) {
					dispatchInteractionState({
						selection: getDataTableRangeSelection({
							activeCell: lastCell,
							anchorCell: firstCell,
							columnMetrics: navigationRuntime.columnMetrics,
							renderedRows: navigationRuntime.renderedRows,
							selectedActiveCell: getSelectedCellState(interactionStateRef.current) || firstCell,
						}),
						type: 'cell_range_selected',
					});
				}
			};
			const escapeDataTableSelection = () => {
				const selection = getSelectedCellSelection(interactionStateRef.current);

				if (selection) {
					dispatchInteractionState({
						cell: selection.activeCell,
						type: 'cell_selected',
					});
				} else {
					dismissCellEditorToSelectedCell(undefined, {
						clearInboundContactEditor: true,
					});
				}
			};

			handleGridKeyboardEvent(event, {
				editorElement,
				headerEditorElement,
				localEditorElement,
			}, {
				blocked: keyDown.alert || keyDown.modal || isGridShortcutBlockedByActiveInput(DATA_TABLE_GRID_EDITOR_SELECTOR),
				hasActiveCell: !!dataTableArrowNavigationRuntimeRef.current,
				hasActiveEditState: !!getActiveEditState(interactionStateRef.current),
				onArrow: handleDataTableArrowKeyNavigation,
				onClear: clearSelectedDataTableCells,
				onCopy: copySelectedDataTableCells,
				onDismissActiveEditor: () => {
					dismissCellEditorToSelectedCell(undefined, {
						clearInboundContactEditor: true,
					});
				},
				onDismissEditor: dismissCellEditorToSelectedCell,
				onDismissHeaderEditor: () => {
					dispatchInteractionState({
						type: 'header_edit_dismissed',
					});
				},
				onDismissLocalEditor: () => {
					dismissCellEditorToSelectedCell(undefined, {
						clearInboundContactEditor: true,
					});
				},
				onEditorCommit: commitEditorElement,
				onEnter: openSelectedDataTableCellEditor,
				onEscapeSelection: escapeDataTableSelection,
				onHeaderEditorCommit: commitHeaderEditorElement,
				onKeyFinish: () => {
					setKeyDown({
						metaKey: false,
						pressed: null,
					});
				},
				onKeyStart: () => {
					setKeyDown({
						metaKey,
						pressed: event.key,
					});
				},
				onPaste: pasteSelectedDataTableCells,
				onSelectAll: selectAllDataTableCells,
				onTab: handleDataTableTabKeyNavigation,
				readClipboardText: readDataTableClipboardText,
				stopImmediatePropagation: true,
			});
		};

		const removeGridKeyboardEventListener = addGridKeyboardEventListener(onKeyDown);

		return () => {
			removeGridKeyboardEventListener();
		};
	}, [
		clearSelectedDataTableCells,
		commitEditorElement,
		commitHeaderEditorElement,
		copySelectedDataTableCells,
		dismissCellEditorToSelectedCell,
		handleDataTableArrowKeyNavigation,
		handleDataTableTabKeyNavigation,
		keyDown.alert,
		keyDown.modal,
		openSelectedDataTableCellEditor,
		pasteSelectedDataTableCells,
		setKeyDown,
	]);

	useEffect(() => {
		const scrollNode = scrollElement.node;

		if (!scrollNode) {
			return;
		}

		const onScroll = () => {
			closeDataTableContextMenu();
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

					if (currentState.scrollLeft === nextState.scrollLeft && currentState.scrollTop === nextState.scrollTop) {
						return currentState;
					}

					return nextState;
				});
			});
		};
		const onClick = (event: MouseEvent) => {
			const localEditorElement = getClosestGridElement(
				event.target,
				DATA_TABLE_LOCAL_EDITOR_SELECTOR,
			);
			const headerEditorElement = getClosestGridElement(event.target, '[data-sheet-header-editor="true"]');
			const headerElement = getClosestGridElement(event.target, '[data-sheet-header-cell="true"]');
			const editorElement = getClosestGridElement(event.target, '[data-sheet-editor="true"]');
			const openTriggerElement = getClosestGridElement(event.target, '[data-sheet-cell-open-trigger="true"]');
			const cellElement = getClosestGridElement(event.target, '[data-sheet-cell="true"]');
			const runtime = runtimeRef.current;

			if (localEditorElement || headerEditorElement) {
				return;
			}

			if (!runtime) {
				dispatchInteractionState({
					type: 'clear',
				});
				return;
			}

			if (suppressNextCellClickRef.current) {
				suppressNextCellClickRef.current = false;
				if (cellElement) {
					return;
				}
			}

			if (headerElement) {
				const cellKey = headerElement.dataset.cellKey || '';

				if (cellKey && headerElement.dataset.sheetHeaderEditable === 'true' && getSelectedHeaderCellKey(interactionStateRef.current) === cellKey) {
					startHeaderEdit(cellKey);
					return;
				}

				dispatchInteractionState({
					cellKey: cellKey || null,
					type: 'header_selected',
				});
				return;
			}

			if (!cellElement && !editorElement) {
				return;
			}

			const lookupElement = cellElement || editorElement;
			const lookup = getDataTableCellLookup(runtime, lookupElement?.dataset.rowId, lookupElement?.dataset.cellKey);

			if (openTriggerElement) {
				if (lookup && !lookup.row.__deleted && canOpenDataTableCellLink(lookup.cell, lookup.designCell)) {
					runtime.openCell({
						cell: lookup.cell,
						clickSource: 'CELL_LINK',
						designCell: lookup.designCell,
						row: lookup.row,
						dataTable: runtime.dataTable,
					});
				}

				return;
			}

			if (lookup && isDataTableLocalEditorEditStateLookup(runtime.editState, lookup)) {
				const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);
				const nextSingleClickedCell = {
					cellKey: runtimeKey,
					rowId: lookup.row.id,
				};

				dispatchInteractionState({
					cell: nextSingleClickedCell,
					type: 'local_editor_dismissed_to_cell',
				});
				return;
			}

			if (editorElement) {
				return;
			}

			if (!cellElement) {
				return;
			}

			if (lookup) {
				const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);
				const nextSingleClickedCell = {
					cellKey: runtimeKey,
					rowId: lookup.row.id,
				};

				if (event.shiftKey && !lookup.row.__deleted) {
					selectDataTableCellRangeToTarget(nextSingleClickedCell);
					return;
				}

				const currentSingleClickedCell = getSelectedCellState(interactionStateRef.current);
				const lastDismissedLocalEditorCell = getDismissedLocalEditorCell(interactionStateRef.current);
				const isSameSingleClickedCell = currentSingleClickedCell?.rowId === lookup.row.id && currentSingleClickedCell.cellKey === runtimeKey;
				const isSameDismissedLocalEditorCell = lastDismissedLocalEditorCell?.rowId === lookup.row.id && lastDismissedLocalEditorCell.cellKey === runtimeKey;

				if ((isSameSingleClickedCell || isSameDismissedLocalEditorCell) && cellElement.dataset.sheetCellEditable === 'true' && !runtime.disabled && !lookup.row.__deleted) {
					if (isDataTableInboundContactIdLookup(lookup)) {
						openInboundContactLocalEditor(lookup, 'CELL_BACKGROUND');
						return;
					}

					if (handleDataTableRelatedDocumentCellEdit(lookup, setFloatingMessage)) {
						return;
					}

					dispatchInteractionState({
						editState: getDataTableCellEditState(runtime, lookup, 'CELL_BACKGROUND'),
						type: 'cell_edit_started',
					});
					return;
				}

				dispatchInteractionState({
					cell: nextSingleClickedCell,
					type: 'cell_selected',
				});
				return;
			}
		};
		const onDoubleClick = (event: MouseEvent) => {
			const localEditorElement = getClosestGridElement(
				event.target,
				DATA_TABLE_LOCAL_EDITOR_SELECTOR,
			);
			const headerElement = getClosestGridElement(event.target, '[data-sheet-header-cell="true"]');
			const cellElement = getClosestGridElement(event.target, '[data-sheet-cell="true"]');
			const runtime = runtimeRef.current;

			if (localEditorElement) {
				return;
			}

			if (headerElement && runtime && headerElement.dataset.sheetHeaderEditable === 'true') {
				startHeaderEdit(headerElement.dataset.cellKey || '');
				return;
			}

			if (!cellElement || !runtime || runtime.disabled || cellElement.dataset.sheetCellEditable !== 'true') {
				return;
			}

			const lookup = getDataTableCellLookup(runtime, cellElement.dataset.rowId, cellElement.dataset.cellKey);

			if (!lookup || lookup.row.__deleted || runtime.dataTable.design?.humansCannotEdit || lookup.designCell.humansCannotEdit || isDataTableReferenceCell(lookup.cell)) {
				return;
			}

			if (isDataTableInboundContactIdLookup(lookup)) {
				openInboundContactLocalEditor(lookup, 'CELL_BACKGROUND');
				return;
			}

			if (handleDataTableRelatedDocumentCellEdit(lookup, setFloatingMessage)) {
				return;
			}

			dispatchInteractionState({
				editState: getDataTableCellEditState(runtime, lookup, 'CELL_BACKGROUND'),
				type: 'cell_edit_started',
			});
		};
		const onFocusOut = (event: FocusEvent) => {
			const headerEditorElement = getClosestGridElement(event.target, '[data-sheet-header-editor="true"]');
			const editorElement = getClosestGridElement(event.target, '[data-sheet-editor="true"]');

			if (headerEditorElement) {
				commitHeaderEditorElement(headerEditorElement);
				return;
			}

			if (editorElement) {
				void commitEditorElement(editorElement);
			}
		};
		const onInput = (event: Event) => {
			const editorElement = getClosestGridElement(event.target, '[data-sheet-editor="true"]');
			const runtime = runtimeRef.current;

			if (editorElement && runtime?.editState?.error) {
				dispatchInteractionState({
					editState: {
						cellKey: editorElement.dataset.cellKey || runtime.editState.cellKey,
						clickSource: runtime.editState.clickSource,
						draftValue: getSheetEditorElementValue(editorElement),
						rowId: editorElement.dataset.rowId || runtime.editState.rowId,
					},
					type: 'cell_edit_started',
				});
			}
		};
		const onPointerDown = (event: PointerEvent) => {
			dismissGridContextMenuOnPointerDown(event, closeDataTableContextMenu);

			const localEditorElement = getClosestGridElement(
				event.target,
				DATA_TABLE_LOCAL_EDITOR_SELECTOR,
			);
			const editorElement = getClosestGridElement(event.target, '[data-sheet-editor="true"]');
			const handleElement = getClosestGridElement(event.target, '[data-sheet-column-resize-handle]');
			const headerElement = getClosestGridElement(event.target, '[data-sheet-header-cell="true"]');
			const openTriggerElement = getClosestGridElement(event.target, '[data-sheet-cell-open-trigger="true"]');
			const cellElement = getClosestGridElement(event.target, '[data-sheet-cell="true"]');
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

			if (headerElement) {
				if (headerElement.dataset.sheetHeaderReorderable === 'true' && event.button === 0) {
					const columnKey = headerElement.dataset.cellKey;
					if (columnKey) {
						runtime.startColumnReorder(columnKey, event.clientX);
					}
				}
				return;
			}

			if (localEditorElement || editorElement || openTriggerElement || event.button !== 0) {
				return;
			}

			const anchorCell = getDataTableBodyCellStateFromElement(cellElement);

			if (!anchorCell) {
				return;
			}

			if (event.shiftKey) {
				return;
			}

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

				const targetElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY) as HTMLElement | null;
				const targetCellElement = getClosestGridElement(targetElement, '[data-sheet-cell="true"]');
				const targetCell = getDataTableBodyCellStateFromElement(targetCellElement);

				if (!targetCell) {
					return;
				}

				moveEvent.preventDefault();
				updateDataTableCellDragSelection(targetCell);
			};
			const onPointerUp = (upEvent: PointerEvent) => {
				const dragState = cellDragSelectionStateRef.current;

				if (dragState?.pointerId === upEvent.pointerId) {
					suppressNextCellClickRef.current = Boolean(dragState.started);
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
			if (__USE_NATIVE_CONTEXT_MENU_WITH_ALT__ && event.altKey) {
				return;
			}

			const localEditorElement = getClosestGridElement(
				event.target,
				DATA_TABLE_LOCAL_EDITOR_SELECTOR,
			);
			const handleElement = getClosestGridElement(event.target, '[data-sheet-column-resize-handle]');
			const cellElement = getClosestGridElement(event.target, '[data-sheet-cell="true"]');
			const runtime = runtimeRef.current;

			if (handleElement) {
				if (resizeCleanupRef.current) {
					resizeStateRef.current = null;
					resizeCleanupRef.current();
					resizeCleanupRef.current = null;
					setResizingColumnKey(null);
				}
			}

			if (localEditorElement || !cellElement || !runtime) {
				return;
			}

			const lookup = getDataTableCellLookup(runtime, cellElement.dataset.rowId, cellElement.dataset.cellKey);
			if (!lookup) {
				return;
			}

			const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);
			const nextSingleClickedCell = {
				cellKey: runtimeKey,
				rowId: lookup.row.id,
			};

			event.preventDefault();
			dispatchInteractionState({
				cell: nextSingleClickedCell,
				type: 'cell_selected',
			});
			openDataTableContextMenu(event, getDataTableContextMenuCellTarget(runtime, lookup, rowIndexById.get(lookup.row.id) ?? -1, activeView, effectiveDesign));
		};

		scrollNode.addEventListener('scroll', onScroll, { passive: true });
		scrollNode.addEventListener('click', onClick);
		scrollNode.addEventListener('dblclick', onDoubleClick);
		scrollNode.addEventListener('focusout', onFocusOut);
		scrollNode.addEventListener('input', onInput);
		scrollNode.addEventListener('pointerdown', onPointerDown);
		scrollNode.addEventListener('contextmenu', onContextMenu);

		return () => {
			scrollNode.removeEventListener('scroll', onScroll);
			scrollNode.removeEventListener('click', onClick);
			scrollNode.removeEventListener('dblclick', onDoubleClick);
			scrollNode.removeEventListener('focusout', onFocusOut);
			scrollNode.removeEventListener('input', onInput);
			scrollNode.removeEventListener('pointerdown', onPointerDown);
			scrollNode.removeEventListener('contextmenu', onContextMenu);

			if (scrollFrameRef.current !== null) {
				cancelAnimationFrame(scrollFrameRef.current);
				scrollFrameRef.current = null;
			}
		};
	}, [
		activeView,
		closeDataTableContextMenu,
		effectiveDesign,
		getDataTableBodyCellStateFromElement,
		openDataTableContextMenu,
		rowIndexById,
		scrollElement.node,
		selectDataTableCellRangeToTarget,
		startHeaderEdit,
		updateDataTableCellDragSelection,
	]);

	useEffect(() => {
		return () => {
			resizeCleanupRef.current?.();
			columnReorderCleanupRef.current?.();
			cellDragSelectionStateRef.current = null;

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
	const visualRowCount = Math.max(isDataTableRowsReady ? renderedRows.length : SHEET_MOCK_ROW_COUNT, minimumVisualRowCount);
	const hasPlaceholderTail = hasDataTablePlaceholderTail(isDataTableRowsReady, renderedRows.length, visualRowCount);
	const visualRowsHeight = getDataTableVisualRowsHeight(visualRowCount, viewportHeight, stickyHeaderHeight, hasPlaceholderTail);
	const totalWidth = SHEET_ROW_NUMBER_WIDTH + columnMetricsData.totalWidth + SHEET_STICKY_SPACER_SIZE + SHEET_ROW_RIGHT_PADDING;
	const rowContentWidth = SHEET_ROW_NUMBER_WIDTH + columnMetricsData.totalWidth + SHEET_STICKY_SPACER_SIZE;
	const stickyColumnEndLeft =
		SHEET_ROW_NUMBER_WIDTH +
		columnMetricsData.metrics.reduce((total, metric) => {
			return metric.columnIndex < stickyColumnCount ? total + metric.width : total;
		}, 0);
	const totalHeight = stickyHeaderHeight + visualRowsHeight;
	const dataTableSurfaceHeight = Math.max(totalHeight, viewportHeight);
	const dataTableSurfaceTop = 0;
	const columnOffsetsWithStickySpacer = useMemo(() => {
		return columnMetricsData.offsets.map((offset, index) => {
			return index > stickyColumnCount ? offset + SHEET_STICKY_SPACER_SIZE : offset;
		});
	}, [columnMetricsData.offsets, stickyColumnCount]);
	dataTableArrowNavigationRuntimeRef.current = {
		columnMetrics: columnMetricsData.metrics,
		renderedRows,
		scrollLeft: scrollState.scrollLeft,
		scrollNode: scrollElement.node,
		scrollTop: scrollState.scrollTop,
		stickyColumnCount,
		stickyColumnEndLeft,
		stickyHeaderHeight,
		totalHeight,
		totalWidth,
		viewportHeight,
		viewportWidth,
	};

	useEffect(() => {
		if (!isDataTableRowsReady) {
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
	}, [fetchMoreRows, isDataTableRowsReady, renderedRows.length, scrollElement.size.height, scrollState.scrollTop, totalHeight, viewportHeight, visualRowCount]);

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
	}, [columnMetricsData.metrics, stickyColumnCount, visibleRange.columnEnd, visibleRange.columnStart]);
	const visibleRows = useMemo(() => {
		const renderInteractionState = interactionStateRef.current;
		const renderEditState = getActiveEditState(renderInteractionState);
		const renderSelectedCellSelection = getSelectedCellSelection(renderInteractionState);
		const renderSelectedCellState = getSelectedCellState(renderInteractionState);
		const rowsByIndex = renderedRows;
		const rowWidth = Math.max(totalWidth, viewportWidth);
		const visibleRowSlots: SheetUIRowSlot[] = [];
		const activeRenderKeys = new Set<string>();

		for (let rowIndex = visibleRange.rowStart; rowIndex < visibleRange.rowEnd; rowIndex += 1) {
			const row = rowsByIndex[rowIndex];
			const rowDeleted = !!row?.__deleted;
			const isMockRow = !isDataTableRowsReady && rowIndex < SHEET_MOCK_ROW_COUNT;
			const rowHeight = getDataTableVisualRowHeight(rowIndex, visualRowCount, viewportHeight, stickyHeaderHeight, hasPlaceholderTail);
			const rowCellMap = row ? rowCellsById.get(row.id) : null;
			const cellsByKey: Record<string, SheetUICell | undefined> = {};

			if (row) {
				visibleColumns.forEach((columnMetric) => {
					const designCell = designCellsByKey.get(columnMetric.column.key);

					if (!designCell) {
						return;
					}

					const runtimeKey = getDataTableRuntimeColumnKey(designCell);
					const cell = getDataTableCellForRuntimeColumn(row, rowCellMap, designCell);
					const optimisticKey = getSheetCellKey(row.id, runtimeKey);
					const optimisticValue = optimisticValues[optimisticKey];
					const serializedValue = getDataTableCellSerializedValue(cell, designCell, optimisticValue);
					const canEdit =
						canEditDataTableRuntimeCell({
							activeView,
							design: effectiveDesign,
							designCell,
							disabled: effectiveDisabled || rowDeleted,
						}) && !isDataTableReferenceCell(cell);
					const canOpen = !rowDeleted && canOpenDataTableCellLink(cell, designCell);
					const iconName = (cell && 'iconName' in cell ? cell.iconName : null) || designCell.iconName || getDataTableOpenLinkIconName(cell, designCell);
					const signature = getSheetUICellSignature({
						canEdit,
						canOpen,
						designCell,
						iconName,
						referenceStatus: cell?.referenceStatus,
						serializedValue,
						timeZone,
					});
					const cachedCell = cellUICacheRef.current.get(optimisticKey);

					if (cachedCell?.signature === signature) {
						cellsByKey[runtimeKey] = cachedCell.cell;
						activeRenderKeys.add(optimisticKey);
						cellRenderStoreRef.current.setSnapshot(row.id, runtimeKey, getGridCellRenderSnapshot({
							cell: cachedCell.cell,
							cellKey: runtimeKey,
							editState: renderEditState,
							rowId: row.id,
							selectedCellKeyMap: renderSelectedCellSelection?.selectedCellKeyMap || null,
							selectedCellState: renderSelectedCellState,
						}));
						return;
					}

					const displayValue = getSheetCellDisplayValue(cell, designCell, optimisticValue, timeZone);
					const cellClassName = getDataTableCellClassName(cell, designCell, optimisticValue);
					const displayClassName = getDataTableCellDisplayClassName(cell, designCell, optimisticValue);
					const draftValue = getSheetEditorDraftValue(cell, designCell, optimisticValue);
					const uiCell: SheetUICell = {
						cellKey: runtimeKey,
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
					cellsByKey[runtimeKey] = uiCell;
					activeRenderKeys.add(optimisticKey);
					cellRenderStoreRef.current.setSnapshot(row.id, runtimeKey, getGridCellRenderSnapshot({
						cell: uiCell,
						cellKey: runtimeKey,
						editState: renderEditState,
						rowId: row.id,
						selectedCellKeyMap: renderSelectedCellSelection?.selectedCellKeyMap || null,
						selectedCellState: renderSelectedCellState,
					}));
				});
			} else if (isMockRow) {
				visibleColumns.forEach((columnMetric) => {
					cellsByKey[columnMetric.column.key] = getDataTableMockUICell(columnMetric.column.key, rowIndex);
				});
			}

			visibleRowSlots.push({
				cellsByKey,
				deleted: rowDeleted,
				rowId: row?.id || null,
				rowIndex,
				rowKey: row?.id || (isMockRow ? `mock-${rowIndex}` : `empty-${rowIndex}`),
				rowNumber: row || isMockRow ? rowIndex + 1 : null,
				rowHeight,
				rowTop: stickyHeaderHeight + rowIndex * SHEET_ROW_HEIGHT,
				rowWidth,
			});
		}

		cellRenderStoreRef.current.deleteMissing(activeRenderKeys);

		return visibleRowSlots;
	}, [
		activeView?.humansCannotEdit,
		designCellsByKey,
		effectiveDisabled,
		hasPlaceholderTail,
		isDataTableRowsReady,
		optimisticValues,
		rowCellsById,
		renderedRows,
		effectiveDesign.humansCannotEdit,
		stickyHeaderHeight,
		timeZone,
		totalWidth,
		viewportHeight,
		viewportWidth,
		visibleColumns,
		visibleRange.rowEnd,
		visibleRange.rowStart,
		visualRowCount,
	]);

	/*
	 * Save one dataTable-local editor draft through the same mutation path used by inline editors.
	 */

	const saveLocalEditorDraftValue = useCallback(
		async (lookup: DataTableCellLookup, draftValue: string, closeAfterSave: boolean) => {
			const runtime = runtimeRef.current;

			if (!runtime) {
				return;
			}

			if (lookup.row.__deleted) {
				return;
			}

			const parsedValue = parseSheetEditorValue(lookup.designCell, draftValue);
			const runtimeKey = getDataTableRuntimeColumnKey(lookup.designCell);

			if (parsedValue.error) {
				dispatchInteractionState({
					editState: {
						cellKey: runtimeKey,
						clickSource: runtime.editState?.clickSource,
						draftValue,
						error: parsedValue.error,
						rowId: lookup.row.id,
					},
					type: 'cell_edit_started',
				});
				return;
			}

			const optimisticKey = getSheetCellKey(lookup.row.id, runtimeKey);
			const currentValue = getDataTableCellSerializedValue(lookup.cell, lookup.designCell, runtime.optimisticValues[optimisticKey]);

			if (closeAfterSave && !__DISABLE_EDIT_STATE_RESET__) {
				dismissCellEditorToSelectedCell(runtime.editState);
			} else {
				dispatchInteractionState({
					editState: {
						cellKey: runtimeKey,
						clickSource: runtime.editState?.clickSource,
						draftValue: parsedValue.value || '',
						rowId: lookup.row.id,
					},
					type: 'cell_edit_started',
				});
			}

			if (currentValue === parsedValue.value) {
				return;
			}

			try {
				await runtime.saveCellValue(lookup, parsedValue.value);
			} catch (error) {
				dispatchInteractionState({
					editState: {
						cellKey: runtimeKey,
						clickSource: runtime.editState?.clickSource,
						draftValue,
						error: error instanceof Error ? error.message : 'Unable to save cell',
						rowId: lookup.row.id,
					},
					type: 'cell_edit_started',
				});
			}
		},
		[dismissCellEditorToSelectedCell],
	);

	/*
	 * Handle a select-style option click, toggling multi-select values in place.
	 */

	const handleSelectEditorOptionValue = useCallback(
		(lookup: DataTableCellLookup, value: string) => {
			if (getSheetEditorFieldType(lookup.designCell) !== 'MULTI_SELECT') {
				void saveLocalEditorDraftValue(lookup, value, true);
				return;
			}

			const selectedValues = getSheetMultiSelectEditorValueSet(
				editState?.rowId === lookup.row.id && editState.cellKey === getDataTableRuntimeColumnKey(lookup.designCell)
					? editState.draftValue
					: getSheetEditorDraftValue(lookup.cell, lookup.designCell),
			);

			if (selectedValues.has(value)) {
				selectedValues.delete(value);
			} else {
				selectedValues.add(value);
			}

			void saveLocalEditorDraftValue(lookup, JSON.stringify(Array.from(selectedValues)), false);
		},
		[editState, saveLocalEditorDraftValue],
	);

	/*
	 * Handle custom text saves for SELECT_OR_TEXT cells.
	 */

	const handleSelectEditorCustomTextSave = useCallback(
		(lookup: DataTableCellLookup, draftValue: string) => {
			void saveLocalEditorDraftValue(lookup, draftValue, true);
		},
		[saveLocalEditorDraftValue],
	);

	/*
	 * Handle immediate DATE saves from the calendar editor.
	 */

	const handleDateEditorDateValue = useCallback(
		(lookup: DataTableCellLookup, draftValue: string) => {
			void saveLocalEditorDraftValue(lookup, draftValue, true);
		},
		[saveLocalEditorDraftValue],
	);

	/*
	 * Handle explicit DATETIME saves from the date-time editor.
	 */

	const handleDateEditorDateTimeSave = useCallback(
		(lookup: DataTableCellLookup, draftValue: string) => {
			void saveLocalEditorDraftValue(lookup, draftValue, true);
		},
		[saveLocalEditorDraftValue],
	);

	const selectEditorPosition = useMemo(() => {
		if (!activeSelectEditorLookup || !editState) {
			return null;
		}

		return getDataTableLocalEditorPosition({
			columnMetric: columnMetricsByKey.get(getDataTableRuntimeColumnKey(activeSelectEditorLookup.designCell)),
			hasPlaceholderTail,
			rowIndex: rowIndexById.get(activeSelectEditorLookup.row.id) ?? -1,
			rowWidth: Math.max(totalWidth, viewportWidth),
			stickyColumnCount,
			stickyHeaderHeight,
			viewportHeight,
			visualRowCount,
		});
	}, [
		activeSelectEditorLookup,
		columnMetricsByKey,
		editState,
		hasPlaceholderTail,
		rowIndexById,
		stickyColumnCount,
		stickyHeaderHeight,
		totalWidth,
		viewportHeight,
		viewportWidth,
		visualRowCount,
	]);

	const dateEditorPosition = useMemo(() => {
		if (!activeDateEditorLookup || !editState) {
			return null;
		}

		return getDataTableLocalEditorPosition({
			columnMetric: columnMetricsByKey.get(getDataTableRuntimeColumnKey(activeDateEditorLookup.designCell)),
			hasPlaceholderTail,
			rowIndex: rowIndexById.get(activeDateEditorLookup.row.id) ?? -1,
			rowWidth: Math.max(totalWidth, viewportWidth),
			stickyColumnCount,
			stickyHeaderHeight,
			viewportHeight,
			visualRowCount,
			width: SHEET_DATE_EDITOR_WIDTH,
		});
	}, [
		activeDateEditorLookup,
		columnMetricsByKey,
		editState,
		hasPlaceholderTail,
		rowIndexById,
		stickyColumnCount,
		stickyHeaderHeight,
		totalWidth,
		viewportHeight,
		viewportWidth,
		visualRowCount,
	]);
	const inboundContactEditorPosition = useMemo(() => {
		if (!inboundContactEditorState) {
			return null;
		}

		const { lookup } = inboundContactEditorState;
		const columnMetric = columnMetricsByKey.get(getDataTableRuntimeColumnKey(lookup.designCell));

		return getDataTableLocalEditorPosition({
			columnMetric,
			hasPlaceholderTail,
			rowIndex: rowIndexById.get(lookup.row.id) ?? -1,
			rowWidth: Math.max(totalWidth, viewportWidth),
			stickyColumnCount,
			stickyHeaderHeight,
			viewportHeight,
			visualRowCount,
			width: Math.max(columnMetric?.width || 0, SHEET_INBOUND_CONTACT_EDITOR_MIN_WIDTH) - SHEET_LOCAL_EDITOR_WIDTH_OFFSET,
		});
	}, [
		columnMetricsByKey,
		hasPlaceholderTail,
		inboundContactEditorState,
		rowIndexById,
		stickyColumnCount,
		stickyHeaderHeight,
		totalWidth,
		viewportHeight,
		viewportWidth,
		visualRowCount,
	]);
	const selectedReadOnlyCellPosition = useMemo(() => {
		if (
			!selectedCellLookup ||
			effectiveDisabled ||
			(canEditDataTableRuntimeCell({
				activeView,
				design: effectiveDesign,
				designCell: selectedCellLookup.designCell,
				disabled: effectiveDisabled,
			}) &&
				!isDataTableReferenceCell(selectedCellLookup.cell))
		) {
			return null;
		}

		return getDataTableSelectedCellTagPosition({
			columnMetric: columnMetricsByKey.get(getDataTableRuntimeColumnKey(selectedCellLookup.designCell)),
			rowIndex: rowIndexById.get(selectedCellLookup.row.id) ?? -1,
			rowWidth: Math.max(totalWidth, viewportWidth),
			stickyColumnCount,
			stickyHeaderHeight,
		});
	}, [activeView, columnMetricsByKey, effectiveDesign, effectiveDisabled, rowIndexById, selectedCellLookup, stickyColumnCount, stickyHeaderHeight, totalWidth, viewportWidth]);
	const selectedRangeBoxPosition = useMemo(() => {
		return getDataTableSelectionBoxPosition({
			columnMetrics: columnMetricsData.metrics,
			renderedRows,
			selection: selectedCellSelection,
			stickyColumnCount,
			stickyHeaderHeight,
		});
	}, [columnMetricsData.metrics, renderedRows, selectedCellSelection, stickyColumnCount, stickyHeaderHeight]);

	useEffect(() => {
		if ((!activeSelectEditorLookup || !selectEditorPosition) && (!activeDateEditorLookup || !dateEditorPosition) && (!inboundContactEditorState || !inboundContactEditorPosition)) {
			return;
		}

		const onOutsidePointer = (event: PointerEvent | MouseEvent) => {
			const target = event.target;

			if (!(target instanceof Element)) {
				return;
			}

			if (
				target.closest('[data-sheet-select-editor="true"]') ||
				target.closest('[data-sheet-date-editor="true"]') ||
				target.closest('[data-sheet-inbound-contact-editor="true"]') ||
				target.closest('[data-sheet-editor="true"]')
			) {
				return;
			}

			const runtime = runtimeRef.current;
			const activeCellElement = getClosestGridElement(target, '[data-sheet-cell="true"]');
			const activeCellLookup = runtime && activeCellElement ? getDataTableCellLookup(runtime, activeCellElement.dataset.rowId, activeCellElement.dataset.cellKey) : null;

			if (activeCellLookup && isDataTableLocalEditorEditStateLookup(runtime?.editState, activeCellLookup)) {
				return;
			}

			dismissCellEditorToSelectedCell(undefined, {
				clearInboundContactEditor: true,
			});
		};
		document.addEventListener('pointerdown', onOutsidePointer, true);
		document.addEventListener('click', onOutsidePointer, true);

		return () => {
			document.removeEventListener('pointerdown', onOutsidePointer, true);
			document.removeEventListener('click', onOutsidePointer, true);
		};
	}, [
		activeDateEditorLookup,
		activeSelectEditorLookup,
		dateEditorPosition,
		dismissCellEditorToSelectedCell,
		inboundContactEditorState,
		inboundContactEditorPosition,
		selectEditorPosition,
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
			height: dataTableSurfaceHeight,
			left:
				(isStickyLeft ? scrollState.scrollLeft : 0) + SHEET_ROW_NUMBER_WIDTH + metric.left + (metric.columnIndex < stickyColumnCount ? 0 : SHEET_STICKY_SPACER_SIZE) + metric.width,
		};
	}, [columnMetricsByKey, columnReorderVisualState, highlightedResizeColumnKey, scrollState.scrollLeft, stickyColumnCount, dataTableSurfaceHeight]);
	const columnReorderGuide = useMemo<SheetUIColumnReorderGuide | null>(() => {
		if (!columnReorderVisualState) {
			return null;
		}

		return {
			columnKey: columnReorderVisualState.columnKey,
			height: SHEET_HEADER_HEIGHT,
			left: getDataTableColumnReorderGuideLeft(columnReorderMetrics, columnReorderVisualState.toVisibleIndex, scrollState.scrollLeft, stickyColumnCount),
		};
	}, [columnReorderMetrics, columnReorderVisualState, scrollState.scrollLeft, stickyColumnCount]);
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

		return getDataTableColumnReorderHeaderDisplacements({
			columnKey: columnReorderVisualState.columnKey,
			metrics: columnReorderMetrics,
			scrollLeft: scrollState.scrollLeft,
			stickyColumnCount,
			toVisibleIndex: columnReorderVisualState.toVisibleIndex,
			visibleColumnKeys: columnKeys,
		});
	}, [columnKeys, columnReorderMetrics, columnReorderVisualState, scrollState.scrollLeft, stickyColumnCount]);

	const dataTableTabs = getDataTableTabs(dataTable, dataTableViews);
	const dataTableLocalEditorOverlay = (
		<>
			{selectedRangeBoxPosition ? <div
				className="sheet_selection_box abs noclick"
				data-sheet-selection-box="true"
				style={{
					height: selectedRangeBoxPosition.height,
					left: selectedRangeBoxPosition.left,
					top: selectedRangeBoxPosition.top,
					width: selectedRangeBoxPosition.width,
				}}
			/> : null}
			{selectedReadOnlyCellPosition ? <DataTableReadOnlyTag position={selectedReadOnlyCellPosition} /> : null}
			{activeSelectEditorLookup && editState && selectEditorPosition ? (
				<DataTableLocalEditorContainer position={selectEditorPosition}>
					<div
						onClick={(event) => {
							const optionElement = getClosestGridElement(event.target, '[data-sheet-select-editor-option]');
							const value = optionElement?.getAttribute('data-sheet-select-editor-option');

							if (value === undefined || value === null) {
								return;
							}

							handleSelectEditorOptionValue(activeSelectEditorLookup, value);
						}}
						onSubmit={(event) => {
							event.preventDefault();

							if (!(event.target instanceof HTMLFormElement) || !event.target.matches('[data-sheet-select-editor-custom]')) {
								return;
							}

							const formData = new FormData(event.target);
							handleSelectEditorCustomTextSave(activeSelectEditorLookup, String(formData.get('customValue') || ''));
						}}
					>
						<SheetSelectEditor
							clickSource={editState.clickSource}
							key={`${editState.rowId}:${editState.cellKey}`}
							editState={editState}
							fieldType={getSheetEditorFieldType(activeSelectEditorLookup.designCell) as SheetUIFieldType}
							options={getSheetSelectEditorOptions(activeSelectEditorLookup.designCell)}
						/>
					</div>
				</DataTableLocalEditorContainer>
			) : null}
			{activeDateEditorLookup && editState && dateEditorPosition ? (
				<DataTableLocalEditorContainer position={dateEditorPosition}>
					<DataTableDateEditor
						clickSource={editState.clickSource}
						key={`${editState.rowId}:${editState.cellKey}`}
						editState={editState}
						lookup={activeDateEditorLookup}
						onDateTimeSave={handleDateEditorDateTimeSave}
						onDateValue={handleDateEditorDateValue}
					/>
				</DataTableLocalEditorContainer>
			) : null}
			{inboundContactEditorState && inboundContactEditorPosition ? (
				<DataTableLocalEditorContainer position={inboundContactEditorPosition}>
					<DataTableInboundContactEditor
						clickSource={inboundContactEditorState.clickSource}
						displayValue={inboundContactEditorState.displayValue}
						inboundContactId={String(inboundContactEditorState.lookup.cell?.relatedId || '')}
						onClose={() => {
							dismissCellEditorToSelectedCell(undefined, {
								clearInboundContactEditor: true,
							});
						}}
						openModalPopUp={openModalPopUp}
						organizationId={organizationId}
					/>
				</DataTableLocalEditorContainer>
			) : null}
		</>
	);
	const dataTableGrid = (
		<DataTableUI
			canvasHeight={Math.max(totalHeight, viewportHeight)}
			canvasWidth={Math.max(totalWidth, viewportWidth)}
			cellCount={visualRowCount * uiColumns.length}
			cellStore={cellRenderStoreRef.current}
			className={undefined}
			columnReorderDrag={columnReorderDrag}
			columnReorderDisplacements={columnReorderDisplacements}
			columnReorderEnabled={!effectiveDisabled}
			columnReorderGuide={columnReorderGuide}
			columnCount={uiColumns.length}
			columns={visibleColumns}
			editState={undefined}
			headerCellsEditable={!activeView && !effectiveDisabled}
			headerContent={children}
			headerEditState={headerEditState}
			selectedHeaderCellKey={selectedHeaderCellKey}
			headerSpacerWidth={rowContentWidth}
			headerWidth={Math.max(totalWidth, viewportWidth)}
			overlayContent={dataTableLocalEditorOverlay}
			resizeGuide={resizeGuide}
			rows={visibleRows}
			scrollLeft={scrollState.scrollLeft}
			scrollRef={scrollElement.ref}
			selectedCellKeyMap={null}
			selectedCellState={null}
			sheetSurfaceHeight={dataTableSurfaceHeight}
			sheetSurfaceTop={dataTableSurfaceTop}
			stickyColumnEndLeft={stickyColumnEndLeft}
			stickyColumnCount={stickyColumnCount}
		/>
	);

	return (
		<div className={cn('v_stretch h_f w_f rel bg', className)} data-sheet-with-views="true">
			<div ref={dataTableGridContainerRef} className="f h_0 rel" data-sheet-grid-container="true">
				{dataTableGrid}
			</div>

			<nav className="no_shrink h_45 h_bottom gap_6 bd_t_1 bd_lt bg_alt px_8 z5" data-sheet-view-tabs="true">
				{dataTableTabs.map((tab) => {
					const selected = tab.id === selectedViewId;

					return (
						<button
							key={tab.id || 'master'}
							className={cn('h_36 px_10 ft_xs bg_hv cl_md h_item gap_7', selected ? 'bg cl_df shadow_line_alt' : '')}
							data-sheet-view-tab={tab.id || 'master'}
							onClick={() => {
								setSelectedViewId(tab.id);
							}}
							type="button"
						>
							{tab.iconName ? (
								<span className="ic_sm shift_up no_shrink">
									<Icon name={tab.iconName} />
								</span>
							) : null}
							{tab.name}
						</button>
					);
				})}
			</nav>
		</div>
	);
}

export default DataTable;
