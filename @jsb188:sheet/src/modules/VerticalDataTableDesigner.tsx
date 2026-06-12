import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import type {
	DataTableCellGQL,
	DataTableDesignCellGQL,
	DataTableDesignGQL,
	DataTableGQL,
	DataTableRowGQL,
} from '@jsb188/mday/types/dataTable.d.ts';
import {
	getOrderedDataTableDesignCells,
} from '@jsb188/mday/utils/dataTable.ts';
import { DataTableUI } from '@jsb188/react-web/ui/DataTableUI';
import {
	clampSheetColumnWidth,
	getSheetColumnMetrics,
	getSheetVisibleRange,
	SHEET_COLUMN_WIDTH,
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_STICKY_SPACER_SIZE,
	type SheetColumnMetric,
	type SheetColumnWidths,
	type SheetUICell,
	type SheetUIColumn,
	type SheetUIColumnReorderDisplacements,
	type SheetUIColumnReorderDrag,
	type SheetUIColumnReorderGuide,
	type SheetUIResizeGuide,
	type SheetUIRowSlot,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { useGridElementSize } from '@jsb188/sheet/libs/grid-runtime';
import {
	getDataTableCellClassNameFromModel,
	getDataTableCellDisplayClassNameFromModel,
	getDataTableCellDisplayModel,
	getDataTableOpenLinkIconName,
	getDataTableRuntimeCellKey,
	getDataTableRuntimeColumnKey,
	getDataTableSheetUIColumn,
	type DataTableRuntimeDesignCell,
} from '../libs/dataTable-cell-editing.tsx';
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type MutableRefObject,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from 'react';

/**
 * Types
 */

export type VerticalDataTableDesignerValueColumn = {
	key: string;
	designKey: string;
	sourceCellKey?: string | null;
	checked: boolean;
	headerValue: string;
	width?: number | null;
};

export type VerticalDataTableDesignerValue = {
	columns: VerticalDataTableDesignerValueColumn[];
};

export type VerticalDataTableDesignerHandle = {
	getValue: () => VerticalDataTableDesignerValue;
	reset: (value?: Partial<VerticalDataTableDesignerValue>) => void;
};

export type VerticalDataTableDesignerProps = {
	dataTable: DataTableGQL;
	children?: ReactNode;
	rows?: DataTableRowGQL[] | null;
	value?: VerticalDataTableDesignerValue;
	defaultValue?: Partial<VerticalDataTableDesignerValue>;
	onChange?: (value: VerticalDataTableDesignerValue) => void;
	disabled?: boolean;
	className?: string;
	bufferRows?: number;
	bufferColumns?: number;
	timeZone?: string | null;
};

type VerticalDataTableDesignerRuntimeColumn = DataTableRuntimeDesignCell & {
	sourceCellKey?: string | null;
};

type VerticalDataTableDesignerColumnReorderState = {
	columnKey: string;
	latestClientX: number;
	latestToVisibleIndex: number;
	startClientX: number;
	startColumnIndex: number;
	startLeft: number;
	startWidth: number;
	started: boolean;
};

type VerticalDataTableDesignerColumnReorderVisualState = {
	columnKey: string;
	dragLeft: number;
	toVisibleIndex: number;
};

type VerticalDataTableDesignerResizeState = {
	columnKey: string;
	latestWidth?: number;
	startClientX: number;
	startWidth: number;
};

type VerticalDataTableDesignerColumnReorderRuntime = {
	metrics: SheetColumnMetric[];
	visibleColumnKeys: string[];
};

type VerticalDataTableDesignerScrollState = {
	scrollLeft: number;
	scrollTop: number;
};

/**
 * Constants
 */

const VERTICAL_DATA_TABLE_DESIGNER_BUFFER_COLUMNS = 3;
const VERTICAL_DATA_TABLE_DESIGNER_BUFFER_ROWS = 8;
const VERTICAL_DATA_TABLE_DESIGNER_ROW_RIGHT_PADDING = 64;
const VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH = 0;
const VERTICAL_DATA_TABLE_DESIGNER_STICKY_COLUMN_COUNT = 0;
const VERTICAL_DATA_TABLE_DESIGNER_COLUMN_GAP_WIDTH = 0;
const VERTICAL_DATA_TABLE_DESIGNER_COLUMN_REORDER_OVERLAP_THRESHOLD = 0.35;
const VERTICAL_DATA_TABLE_DESIGNER_FILL_STYLE: CSSProperties = { minHeight: 0 };

type VerticalDataTableDesignerRowLayout = {
	hideBottomBorder: boolean;
	rowHeight: number;
	rowTop: number;
};

type VerticalDataTableDesignerVisibleUICell = {
	cell: SheetUICell;
	runtimeKey: string;
};

/*
 * Return the closest element matching a selector from a browser event target.
 */
function getVerticalDataTableDesignerClosestElement(target: EventTarget | null, selector: string) {
	return target instanceof Element ? target.closest(selector) as HTMLElement | null : null;
}

/*
 * Add stable runtime keys when duplicated source keys would collide in the sheet grid.
 */
function getVerticalDataTableDesignerRuntimeColumnsWithUniqueKeys(cells: VerticalDataTableDesignerRuntimeColumn[]) {
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
 * Return the runtime columns VerticalDataTableDesigner should render for the selected source.
 */
function getVerticalDataTableDesignerRuntimeColumns(design: DataTableDesignGQL) {
	const masterCells = getOrderedDataTableDesignCells(design as any) as DataTableDesignCellGQL[];

	return getVerticalDataTableDesignerRuntimeColumnsWithUniqueKeys(masterCells.map((cell) => ({
		...cell,
		sourceCellKey: cell.key,
	})));
}

/*
 * Return the source column name shown in VerticalDataTableDesigner headers.
 */
function getVerticalDataTableDesignerColumnHeaderName(column: VerticalDataTableDesignerRuntimeColumn) {
	return String((column as VerticalDataTableDesignerRuntimeColumn & { name?: string | null }).name || '').trim() || column.key;
}

/*
 * Return default VerticalDataTableDesigner column output for one runtime column.
 */
function getVerticalDataTableDesignerDefaultValueColumn(column: VerticalDataTableDesignerRuntimeColumn): VerticalDataTableDesignerValueColumn {
	return {
		key: getDataTableRuntimeColumnKey(column),
		designKey: column.key,
		sourceCellKey: column.sourceCellKey || getDataTableRuntimeCellKey(column),
		checked: true,
		headerValue: getVerticalDataTableDesignerColumnHeaderName(column),
		width: getVerticalDataTableDesignerValueColumnWidth(column.width),
	};
}

/*
 * Return a normalized persisted column width for designer output.
 */
function getVerticalDataTableDesignerValueColumnWidth(width: number | null | undefined) {
	return Number.isFinite(width) ? clampSheetColumnWidth(Number(width)) : null;
}

/*
 * Return the canonical checked-first column order for VerticalDataTableDesigner output.
 */
function getVerticalDataTableDesignerCheckedFirstColumns(columns: VerticalDataTableDesignerValueColumn[]) {
	const checkedColumns = columns.filter((column) => column.checked);
	const uncheckedColumns = columns.filter((column) => !column.checked);

	return checkedColumns.concat(uncheckedColumns);
}

/*
 * Return whether two VerticalDataTableDesigner columns carry the same output data.
 */
function areVerticalDataTableDesignerValueColumnsEqual(a: VerticalDataTableDesignerValueColumn, b: VerticalDataTableDesignerValueColumn) {
	return a.key === b.key &&
		a.designKey === b.designKey &&
		(a.sourceCellKey || null) === (b.sourceCellKey || null) &&
		a.checked === b.checked &&
		a.headerValue === b.headerValue &&
		(a.width ?? null) === (b.width ?? null);
}

/*
 * Return whether two VerticalDataTableDesigner values are equivalent.
 */
function areVerticalDataTableDesignerValuesEqual(a: VerticalDataTableDesignerValue, b: VerticalDataTableDesignerValue) {
	return a.columns.length === b.columns.length &&
		a.columns.every((column, index) => {
			const otherColumn = b.columns[index];

			return otherColumn ? areVerticalDataTableDesignerValueColumnsEqual(column, otherColumn) : false;
		});
}

/*
 * Return the best source value for the controlled or uncontrolled designer.
 */
function getVerticalDataTableDesignerValueSource(params: {
	defaultValue?: Partial<VerticalDataTableDesignerValue>;
	isControlled: boolean;
	localValue: VerticalDataTableDesignerValue;
	value?: VerticalDataTableDesignerValue;
}) {
	if (params.isControlled) {
		return params.value;
	}

	return params.localValue.columns.length ? params.localValue : params.defaultValue;
}

/*
 * Merge caller-provided VerticalDataTableDesigner value data with the current runtime columns.
 */
function getNormalizedVerticalDataTableDesignerValue(columns: VerticalDataTableDesignerRuntimeColumn[], value?: Partial<VerticalDataTableDesignerValue> | null): VerticalDataTableDesignerValue {
	const defaultColumns = columns.map(getVerticalDataTableDesignerDefaultValueColumn);
	const defaultColumnsByKey = new Map(defaultColumns.map((column) => [column.key, column]));
	const inputColumnsByKey = new Map((value?.columns || []).map((column) => [column.key, column]));
	const orderedKeys: string[] = [];
	const seenKeys = new Set<string>();

	(value?.columns || []).forEach((column) => {
		if (!defaultColumnsByKey.has(column.key) || seenKeys.has(column.key)) {
			return;
		}

		orderedKeys.push(column.key);
		seenKeys.add(column.key);
	});

	defaultColumns.forEach((column) => {
		if (!seenKeys.has(column.key)) {
			orderedKeys.push(column.key);
		}
	});

	const nextColumns = orderedKeys.map((key) => {
		const defaultColumn = defaultColumnsByKey.get(key)!;
		const inputColumn = inputColumnsByKey.get(key);

		return {
			...defaultColumn,
			checked: inputColumn?.checked ?? defaultColumn.checked,
			headerValue: inputColumn?.headerValue ?? defaultColumn.headerValue,
			width: getVerticalDataTableDesignerValueColumnWidth(inputColumn?.width ?? defaultColumn.width),
		};
	});

	return {
		columns: getVerticalDataTableDesignerCheckedFirstColumns(nextColumns),
	};
}

/*
 * Return column widths keyed by runtime column id for SheetUI metrics.
 */
function getVerticalDataTableDesignerColumnWidths(value: VerticalDataTableDesignerValue) {
	return value.columns.reduce((widths, column) => {
		if (Number.isFinite(column.width)) {
			widths[column.key] = getVerticalDataTableDesignerValueColumnWidth(column.width) ?? SHEET_COLUMN_WIDTH;
		}

		return widths;
	}, {} as SheetColumnWidths);
}

/*
 * Return SheetUI columns enriched with VerticalDataTableDesigner header values and checked state.
 */
function getVerticalDataTableDesignerUIColumns(columns: VerticalDataTableDesignerRuntimeColumn[], value: VerticalDataTableDesignerValue) {
	const columnsByKey = new Map(columns.map((column) => [getDataTableRuntimeColumnKey(column), column]));

	return value.columns.map((valueColumn) => {
		const runtimeColumn = columnsByKey.get(valueColumn.key);
		if (!runtimeColumn) {
			return null;
		}

		return {
			...getDataTableSheetUIColumn(runtimeColumn),
			label: valueColumn.headerValue,
			headerCheckboxEnabled: true,
			headerCheckboxTooltipMessage: i18n.t('sheet.include_this_column_'),
			headerChecked: valueColumn.checked,
			headerClassName: cn('cs_grab', !valueColumn.checked ? 'op_40' : ''),
			headerTooltipMessage: i18n.t('sheet.insert_rows_from_data_table_rearrange'),
			cellClassName: cn(!valueColumn.checked ? 'op_40' : ''),
		};
	}).filter(Boolean) as ReturnType<typeof getDataTableSheetUIColumn>[];
}

/*
 * Return a data-column metric adjusted by the designer's horizontal column gap.
 */
function getVerticalDataTableDesignerGapAdjustedColumnMetric(metric: SheetColumnMetric) {
	return {
		...metric,
		left: metric.left + VERTICAL_DATA_TABLE_DESIGNER_COLUMN_GAP_WIDTH,
	};
}

/*
 * Return offsets adjusted for the designer's horizontal column gap.
 */
function getVerticalDataTableDesignerColumnOffsetsWithGap(offsets: number[]) {
	return offsets.map((offset, index) => {
		return index > VERTICAL_DATA_TABLE_DESIGNER_STICKY_COLUMN_COUNT ? offset + VERTICAL_DATA_TABLE_DESIGNER_COLUMN_GAP_WIDTH : offset;
	});
}

/*
 * Return the reorderable columns adjusted for the designer's horizontal column gap.
 */
function getVerticalDataTableDesignerReorderColumnMetrics(metrics: SheetColumnMetric[]) {
	return metrics.map(getVerticalDataTableDesignerGapAdjustedColumnMetric);
}

/*
 * Return a map of runtime design columns by SheetUI column key.
 */
function getVerticalDataTableDesignerRuntimeColumnsByKey(columns: VerticalDataTableDesignerRuntimeColumn[]) {
	return new Map(columns.map((column) => [getDataTableRuntimeColumnKey(column), column]));
}

/*
 * Return row cells grouped by row id and source cell key.
 */
function getVerticalDataTableDesignerRowCellsById(rows: DataTableRowGQL[]) {
	return new Map(
		rows.map((row) => {
			return [row.id, new Map((row.cells || []).map((cell) => [cell.cellKey, cell]))];
		}),
	);
}

/*
 * Return the preview cell for one row and runtime column.
 */
function getVerticalDataTableDesignerCellForRuntimeColumn(rowCellMap: Map<string, DataTableCellGQL> | null | undefined, designCell: VerticalDataTableDesignerRuntimeColumn) {
	return rowCellMap?.get(getDataTableRuntimeCellKey(designCell)) || null;
}

/*
 * Build one placeholder cell used when preview rows do not fill the viewport.
 */
function getVerticalDataTableDesignerEmptyUICell(cellKey: string, contentClassName: string): SheetUICell {
	return {
		cellKey,
		contentClassName,
		displayValue: '',
		draftValue: '',
	};
}

/*
 * Return row layout data, letting the final preview row fill remaining canvas height.
 */
function getVerticalDataTableDesignerRowLayout(params: {
	canvasHeight: number;
	rowIndex: number;
	rowCount: number;
	stickyHeaderHeight: number;
}): VerticalDataTableDesignerRowLayout {
	const rowTop = params.stickyHeaderHeight + params.rowIndex * SHEET_ROW_HEIGHT;
	const hideBottomBorder = params.rowIndex === params.rowCount - 1;
	const rowHeight = hideBottomBorder ? Math.max(SHEET_ROW_HEIGHT, params.canvasHeight - rowTop) : SHEET_ROW_HEIGHT;

	return {
		hideBottomBorder,
		rowHeight,
		rowTop,
	};
}

/*
 * Return the SheetUI cell data for one visible designer column and preview row.
 */
function getVerticalDataTableDesignerVisibleUICell(params: {
	contentClassName: string;
	designCell: VerticalDataTableDesignerRuntimeColumn;
	row: DataTableRowGQL | undefined;
	rowCellMap: Map<string, DataTableCellGQL> | null | undefined;
	timeZone?: string | null;
}): VerticalDataTableDesignerVisibleUICell {
	const runtimeKey = getDataTableRuntimeColumnKey(params.designCell);

	if (!params.row) {
		return {
			cell: getVerticalDataTableDesignerEmptyUICell(runtimeKey, params.contentClassName),
			runtimeKey,
		};
	}

	const cell = getVerticalDataTableDesignerCellForRuntimeColumn(params.rowCellMap, params.designCell);
	const displayModel = getDataTableCellDisplayModel({
		canEdit: false,
		cell,
		designCell: params.designCell,
		iconName: (cell && 'iconName' in cell ? cell.iconName : null) || params.designCell.iconName || getDataTableOpenLinkIconName(cell, params.designCell),
		rowDeleted: params.row.__deleted,
		timeZone: params.timeZone,
	});

	return {
		cell: {
			cellKey: runtimeKey,
			displayValue: displayModel.text,
			draftValue: displayModel.draftValue,
			iconName: displayModel.iconName,
			canEdit: false,
			canOpen: false,
			cellClassName: getDataTableCellClassNameFromModel(displayModel),
			contentClassName: params.contentClassName,
			displayClassName: getDataTableCellDisplayClassNameFromModel(displayModel),
		},
		runtimeKey,
	};
}

/*
 * Return visible SheetUI row slots for the designer preview grid.
 */
function getVerticalDataTableDesignerVisibleRows(params: {
	canvasHeight: number;
	designCellsByKey: Map<string, VerticalDataTableDesignerRuntimeColumn>;
	renderedRows: DataTableRowGQL[];
	rowCellsById: Map<string, Map<string, DataTableCellGQL>>;
	rowCount: number;
	rowWidth: number;
	stickyHeaderHeight: number;
	timeZone?: string | null;
	visibleColumns: SheetColumnMetric[];
	visibleRange: ReturnType<typeof getSheetVisibleRange>;
}): SheetUIRowSlot[] {
	const visibleRowSlots: SheetUIRowSlot[] = [];

	for (let rowIndex = params.visibleRange.rowStart; rowIndex < params.visibleRange.rowEnd; rowIndex += 1) {
		const row = params.renderedRows[rowIndex];
		const rowCellMap = row ? params.rowCellsById.get(row.id) : null;
		const cellsByKey: Record<string, SheetUICell | undefined> = {};
		const rowLayout = getVerticalDataTableDesignerRowLayout({
			canvasHeight: params.canvasHeight,
			rowIndex,
			rowCount: params.rowCount,
			stickyHeaderHeight: params.stickyHeaderHeight,
		});

		params.visibleColumns.forEach((columnMetric) => {
			const designCell = params.designCellsByKey.get(columnMetric.column.key);
			if (!designCell) {
				return;
			}

			const uiCell = getVerticalDataTableDesignerVisibleUICell({
				contentClassName: '',
				designCell,
				row,
				rowCellMap,
				timeZone: params.timeZone,
			});

			cellsByKey[uiCell.runtimeKey] = uiCell.cell;
		});

		visibleRowSlots.push({
			cellsByKey,
			deleted: row?.__deleted,
			rowId: row?.id || null,
			rowIndex,
			rowKey: row?.id || `empty-${rowIndex}`,
			rowNumber: null,
			rowHeight: rowLayout.rowHeight,
			hideBottomBorder: rowLayout.hideBottomBorder,
			rowTop: rowLayout.rowTop,
			rowWidth: params.rowWidth,
		});
	}

	return visibleRowSlots;
}

/*
 * Return the header left coordinate for one rendered column metric.
 */
function getVerticalDataTableDesignerColumnMetricHeaderLeft(metric: SheetColumnMetric, scrollLeft: number) {
	return (metric.columnIndex < VERTICAL_DATA_TABLE_DESIGNER_STICKY_COLUMN_COUNT ? scrollLeft : 0) + VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH + metric.left;
}

/*
 * Return the rectangle occupied by a dragged header at a pointer position.
 */
function getVerticalDataTableDesignerColumnReorderDraggedRect(params: { clientX: number; startClientX: number; startLeft: number; width: number }) {
	const left = params.startLeft + params.clientX - params.startClientX;

	return {
		left,
		right: left + params.width,
	};
}

/*
 * Return the raw visual insertion index nearest one pointer position.
 */
function getVerticalDataTableDesignerColumnReorderTargetIndex(params: {
	clientX: number;
	draggedColumnIndex?: number;
	draggedRect?: { left: number; right: number };
	metrics: SheetColumnMetric[];
	scrollLeft: number;
	scrollNode: HTMLElement;
}) {
	const viewportRect = params.scrollNode.getBoundingClientRect();
	const targetLeft = params.clientX - viewportRect.left + params.scrollLeft;

	for (let index = 0; index < params.metrics.length; index += 1) {
		const metric = params.metrics[index];
		if (!metric) {
			continue;
		}

		const metricLeft = getVerticalDataTableDesignerColumnMetricHeaderLeft(metric, params.scrollLeft);
		const metricRight = metricLeft + metric.width;

		if (params.draggedRect && params.draggedColumnIndex !== undefined) {
			if (metric.columnIndex < params.draggedColumnIndex) {
				if (params.draggedRect.left < metricRight - metric.width * VERTICAL_DATA_TABLE_DESIGNER_COLUMN_REORDER_OVERLAP_THRESHOLD) {
					return index;
				}

				continue;
			}

			if (metric.columnIndex > params.draggedColumnIndex) {
				if (params.draggedRect.right < metricLeft + metric.width * VERTICAL_DATA_TABLE_DESIGNER_COLUMN_REORDER_OVERLAP_THRESHOLD) {
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
 * Convert a raw insertion slot into the target index used after removing the dragged column.
 */
function getVerticalDataTableDesignerColumnReorderMoveIndex(visibleColumnKeys: string[], fromKey: string, toVisibleIndex: number) {
	const fromIndex = visibleColumnKeys.indexOf(fromKey);
	const boundedIndex = Math.max(0, Math.min(toVisibleIndex, visibleColumnKeys.length - 1));

	if (fromIndex < 0) {
		return boundedIndex;
	}

	return boundedIndex;
}

/*
 * Return a constrained insertion index that keeps unchecked columns behind checked columns.
 */
function getVerticalDataTableDesignerConstrainedTargetIndex(value: VerticalDataTableDesignerValue, columnKey: string, toVisibleIndex: number) {
	const columnKeys = value.columns.map((item) => item.key);
	const fromIndex = columnKeys.indexOf(columnKey);
	const column = fromIndex >= 0 ? value.columns[fromIndex] : null;

	if (!column || fromIndex < 0) {
		return toVisibleIndex;
	}

	const checkedCount = value.columns.filter((item) => item.checked).length;
	const rawMoveIndex = getVerticalDataTableDesignerColumnReorderMoveIndex(columnKeys, columnKey, toVisibleIndex);
	const minIndex = column.checked ? 0 : Math.max(0, checkedCount - (fromIndex < checkedCount ? 1 : 0));
	const maxIndex = column.checked ? Math.max(0, checkedCount - 1) : value.columns.length - 1;

	return Math.max(minIndex, Math.min(rawMoveIndex, maxIndex));
}

/*
 * Return the visual insertion guide left coordinate for a reorder target.
 */
function getVerticalDataTableDesignerColumnReorderGuideLeft(metrics: SheetColumnMetric[], toVisibleIndex: number, scrollLeft: number) {
	const targetMetric = metrics[toVisibleIndex];
	if (targetMetric) {
		return getVerticalDataTableDesignerColumnMetricHeaderLeft(targetMetric, scrollLeft) - 1;
	}

	const lastMetric = metrics[metrics.length - 1];
	if (!lastMetric) {
		return VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH;
	}

	return getVerticalDataTableDesignerColumnMetricHeaderLeft(lastMetric, scrollLeft) + lastMetric.width - 1;
}

/*
 * Return temporary header displacements while a VerticalDataTableDesigner column is dragged.
 */
function getVerticalDataTableDesignerColumnReorderHeaderDisplacements(params: {
	columnKey: string;
	metrics: SheetColumnMetric[];
	scrollLeft: number;
	toVisibleIndex: number;
	visibleColumnKeys: string[];
}) {
	const fromIndex = params.visibleColumnKeys.indexOf(params.columnKey);
	if (fromIndex < 0) {
		return null;
	}

	const toIndex = getVerticalDataTableDesignerColumnReorderMoveIndex(params.visibleColumnKeys, params.columnKey, params.toVisibleIndex);
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

	const currentLefts = new Map(params.metrics.map((metric) => [metric.column.key, getVerticalDataTableDesignerColumnMetricHeaderLeft(metric, params.scrollLeft)]));
	const displacements: SheetUIColumnReorderDisplacements = {};
	let nextLeft = 0;

	projectedOrder.forEach((columnKey) => {
		const metric = metricsByKey.get(columnKey);
		if (!metric) {
			return;
		}

		const projectedLeft = VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH + nextLeft + VERTICAL_DATA_TABLE_DESIGNER_COLUMN_GAP_WIDTH;
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
 * Return the constrained target index for the current column reorder pointer position.
 */
function getVerticalDataTableDesignerColumnReorderPointerTarget(params: {
	clientX: number;
	scrollLeft: number;
	scrollNode: HTMLElement;
	state: VerticalDataTableDesignerColumnReorderState;
	runtime: VerticalDataTableDesignerColumnReorderRuntime;
	value: VerticalDataTableDesignerValue;
}) {
	return getVerticalDataTableDesignerConstrainedTargetIndex(
		params.value,
		params.state.columnKey,
		getVerticalDataTableDesignerColumnReorderTargetIndex({
			clientX: params.clientX,
			draggedColumnIndex: params.state.startColumnIndex,
			draggedRect: getVerticalDataTableDesignerColumnReorderDraggedRect({
				clientX: params.clientX,
				startClientX: params.state.startClientX,
				startLeft: params.state.startLeft,
				width: params.state.startWidth,
			}),
			metrics: params.runtime.metrics,
			scrollLeft: params.scrollLeft,
			scrollNode: params.scrollNode,
		}),
	);
}

/*
 * Return a new VerticalDataTableDesigner value with one column moved to the supplied index.
 */
function moveVerticalDataTableDesignerColumn(value: VerticalDataTableDesignerValue, columnKey: string, toIndex: number): VerticalDataTableDesignerValue {
	const fromIndex = value.columns.findIndex((column) => column.key === columnKey);
	if (fromIndex < 0) {
		return value;
	}

	const boundedToIndex = Math.max(0, Math.min(toIndex, value.columns.length - 1));
	if (fromIndex === boundedToIndex) {
		return value;
	}

	const nextColumns = value.columns.slice(0);
	const [movedColumn] = nextColumns.splice(fromIndex, 1);
	if (!movedColumn) {
		return value;
	}

	nextColumns.splice(Math.max(0, Math.min(boundedToIndex, nextColumns.length)), 0, movedColumn);

	return {
		columns: getVerticalDataTableDesignerCheckedFirstColumns(nextColumns),
	};
}

/*
 * Return a new VerticalDataTableDesigner value after toggling one column's included state.
 */
function toggleVerticalDataTableDesignerColumnChecked(value: VerticalDataTableDesignerValue, columnKey: string): VerticalDataTableDesignerValue {
	const column = value.columns.find((item) => item.key === columnKey);
	if (!column) {
		return value;
	}

	const nextChecked = !column.checked;
	const nextColumns = value.columns
		.filter((item) => item.key !== columnKey)
		.concat([{ ...column, checked: nextChecked }]);

	return {
		columns: getVerticalDataTableDesignerCheckedFirstColumns(nextColumns),
	};
}

/*
 * Return a new VerticalDataTableDesigner value after changing one column width.
 */
function updateVerticalDataTableDesignerColumnWidth(value: VerticalDataTableDesignerValue, columnKey: string, width: number): VerticalDataTableDesignerValue {
	const currentColumn = value.columns.find((column) => column.key === columnKey);
	if (currentColumn && (currentColumn.width ?? null) === width) {
		return value;
	}

	return {
		columns: value.columns.map((column) => {
			return column.key === columnKey ? { ...column, width } : column;
		}),
	};
}

/*
 * Return a stable scroll state object unless the scroll coordinates changed.
 */
function getNextVerticalDataTableDesignerScrollState(currentState: VerticalDataTableDesignerScrollState, scrollNode: HTMLElement) {
	const nextScrollLeft = scrollNode.scrollLeft;
	const nextScrollTop = scrollNode.scrollTop;

	if (currentState.scrollLeft === nextScrollLeft && currentState.scrollTop === nextScrollTop) {
		return currentState;
	}

	return {
		scrollLeft: nextScrollLeft,
		scrollTop: nextScrollTop,
	};
}

/*
 * Cancel a pending animation frame ref and clear it.
 */
function cancelVerticalDataTableDesignerFrame(frameRef: MutableRefObject<number | null>) {
	if (frameRef.current !== null) {
		cancelAnimationFrame(frameRef.current);
		frameRef.current = null;
	}
}

/*
 * Render a local-state DataTable-style designer surface for arranging columns.
 */
export const VerticalDataTableDesigner = forwardRef<VerticalDataTableDesignerHandle, VerticalDataTableDesignerProps>((p, ref) => {
	const {
		bufferColumns = VERTICAL_DATA_TABLE_DESIGNER_BUFFER_COLUMNS,
		bufferRows = VERTICAL_DATA_TABLE_DESIGNER_BUFFER_ROWS,
		children,
		className,
		dataTable,
		defaultValue,
		disabled,
		onChange,
		rows: previewRows = [],
		timeZone,
		value,
	} = p;
	const scrollElement = useGridElementSize<HTMLDivElement>();
	const resizeStateRef = useRef<VerticalDataTableDesignerResizeState | null>(null);
	const resizeFrameRef = useRef<number | null>(null);
	const resizeCleanupRef = useRef<(() => void) | null>(null);
	const columnReorderRuntimeRef = useRef<VerticalDataTableDesignerColumnReorderRuntime | null>(null);
	const columnReorderStateRef = useRef<VerticalDataTableDesignerColumnReorderState | null>(null);
	const columnReorderFrameRef = useRef<number | null>(null);
	const columnReorderCleanupRef = useRef<(() => void) | null>(null);
	const currentValueRef = useRef<VerticalDataTableDesignerValue>({ columns: [] });
	const suppressNextHeaderClickRef = useRef(false);
	const runtimeColumns = useMemo(() => {
		return getVerticalDataTableDesignerRuntimeColumns(dataTable.design);
	}, [dataTable.design]);
	const isControlled = value !== undefined;
	const [localValue, setLocalValue] = useState<VerticalDataTableDesignerValue>(() => {
		return getNormalizedVerticalDataTableDesignerValue(runtimeColumns, defaultValue);
	});
	const [scrollState, setScrollState] = useState<VerticalDataTableDesignerScrollState>({ scrollLeft: 0, scrollTop: 0 });
	const [resizingColumnKey, setResizingColumnKey] = useState<string | null>(null);
	const [resizeGuideWidth, setResizeGuideWidth] = useState<number | null>(null);
	const [columnReorderVisualState, setColumnReorderVisualState] = useState<VerticalDataTableDesignerColumnReorderVisualState | null>(null);
	const [selectedCellState, setSelectedCellState] = useState<SheetUISelectedCellState | null>(null);
	const effectiveValue = useMemo(() => {
		return getNormalizedVerticalDataTableDesignerValue(
			runtimeColumns,
			getVerticalDataTableDesignerValueSource({
				defaultValue,
				isControlled,
				localValue,
				value,
			}),
		);
	}, [defaultValue, isControlled, localValue, runtimeColumns, value]);

	currentValueRef.current = effectiveValue;

	const setDesignerValue = useCallback((updater: VerticalDataTableDesignerValue | ((value: VerticalDataTableDesignerValue) => VerticalDataTableDesignerValue)) => {
		const nextValue = typeof updater === 'function' ? updater(currentValueRef.current) : updater;
		if (nextValue === currentValueRef.current || areVerticalDataTableDesignerValuesEqual(nextValue, currentValueRef.current)) {
			return;
		}

		currentValueRef.current = nextValue;
		if (!isControlled) {
			setLocalValue(nextValue);
		}

		onChange?.(nextValue);
	}, [isControlled, onChange]);

	useImperativeHandle(ref, () => ({
		getValue: () => currentValueRef.current,
		reset: (value?: Partial<VerticalDataTableDesignerValue>) => {
			const nextValue = getNormalizedVerticalDataTableDesignerValue(runtimeColumns, value || defaultValue);
			if (areVerticalDataTableDesignerValuesEqual(nextValue, currentValueRef.current)) {
				return;
			}

			currentValueRef.current = nextValue;
			if (!isControlled) {
				setLocalValue(nextValue);
			}

			onChange?.(nextValue);
		},
	}), [defaultValue, isControlled, onChange, runtimeColumns]);

	useEffect(() => {
		if (isControlled) {
			return;
		}

		setLocalValue((currentValue) => {
			const nextValue = getNormalizedVerticalDataTableDesignerValue(runtimeColumns, currentValue.columns.length ? currentValue : defaultValue);

			return areVerticalDataTableDesignerValuesEqual(nextValue, currentValue) ? currentValue : nextValue;
		});
	}, [dataTable.id, defaultValue, isControlled, runtimeColumns]);

	useEffect(() => {
		const scrollNode = scrollElement.node;
		if (!scrollNode) {
			return;
		}

		const onScroll = () => {
			setScrollState((currentState) => getNextVerticalDataTableDesignerScrollState(currentState, scrollNode));
		};

		scrollNode.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		return () => {
			scrollNode.removeEventListener('scroll', onScroll);
		};
	}, [scrollElement.node]);

	useEffect(() => {
		return () => {
			resizeCleanupRef.current?.();
			columnReorderCleanupRef.current?.();
			cancelVerticalDataTableDesignerFrame(resizeFrameRef);
			cancelVerticalDataTableDesignerFrame(columnReorderFrameRef);
		};
	}, []);

	const uiColumns = useMemo(() => {
		return getVerticalDataTableDesignerUIColumns(runtimeColumns, effectiveValue);
	}, [effectiveValue, runtimeColumns]);
	const columnWidths = useMemo(() => {
		return getVerticalDataTableDesignerColumnWidths(effectiveValue);
	}, [effectiveValue]);
	const columnMetricsData = useMemo(() => {
		return getSheetColumnMetrics(uiColumns, columnWidths);
	}, [columnWidths, uiColumns]);
	const columnMetricsByKey = useMemo(() => {
		return new Map(columnMetricsData.metrics.map((metric) => [metric.column.key, metric]));
	}, [columnMetricsData.metrics]);
	const visibleColumnKeys = useMemo(() => {
		return effectiveValue.columns.map((column) => column.key);
	}, [effectiveValue.columns]);
	const reorderColumnMetrics = useMemo(() => {
		return getVerticalDataTableDesignerReorderColumnMetrics(columnMetricsData.metrics);
	}, [columnMetricsData.metrics]);
	const designCellsByKey = useMemo(() => {
		return getVerticalDataTableDesignerRuntimeColumnsByKey(runtimeColumns);
	}, [runtimeColumns]);
	const renderedRows = useMemo(() => {
		return Array.isArray(previewRows) ? previewRows : [];
	}, [previewRows]);
	const rowCellsById = useMemo(() => {
		return getVerticalDataTableDesignerRowCellsById(renderedRows);
	}, [renderedRows]);
	const stickyHeaderHeight = SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE;
	const viewportHeight = scrollElement.size.height || stickyHeaderHeight + SHEET_ROW_HEIGHT * 20;
	const viewportWidth = scrollElement.size.width || 5 * SHEET_COLUMN_WIDTH;
	const viewportFillRowCount = Math.max(1, Math.floor((viewportHeight - stickyHeaderHeight) / SHEET_ROW_HEIGHT));
	const rowCount = Math.max(viewportFillRowCount, renderedRows.length);
	const rowsHeight = rowCount * SHEET_ROW_HEIGHT;
	const totalWidth = VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH + columnMetricsData.totalWidth + VERTICAL_DATA_TABLE_DESIGNER_COLUMN_GAP_WIDTH + VERTICAL_DATA_TABLE_DESIGNER_ROW_RIGHT_PADDING;
	const rowContentWidth = VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH + columnMetricsData.totalWidth + VERTICAL_DATA_TABLE_DESIGNER_COLUMN_GAP_WIDTH;
	const stickyColumnEndLeft = VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH;
	const totalHeight = stickyHeaderHeight + rowsHeight;
	const canvasHeight = Math.max(totalHeight, viewportHeight);
	const columnOffsetsWithGap = useMemo(() => {
		return getVerticalDataTableDesignerColumnOffsetsWithGap(columnMetricsData.offsets);
	}, [columnMetricsData.offsets]);
	const visibleRange = useMemo(() => {
		return getSheetVisibleRange({
			bufferColumns,
			bufferRows,
			columnCount: uiColumns.length,
			columnOffsets: columnOffsetsWithGap,
			containerHeight: viewportHeight,
			containerWidth: viewportWidth,
			headerHeight: stickyHeaderHeight,
			rowCount,
			rowHeaderWidth: VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH,
			scrollLeft: scrollState.scrollLeft,
			scrollTop: scrollState.scrollTop,
		});
	}, [
		bufferColumns,
		bufferRows,
		columnOffsetsWithGap,
		rowCount,
		scrollState.scrollLeft,
		scrollState.scrollTop,
		stickyHeaderHeight,
		uiColumns.length,
		viewportHeight,
		viewportWidth,
	]);
	const visibleColumns = useMemo(() => {
		const nextVisibleColumns: SheetColumnMetric[] = [];
		for (let index = visibleRange.columnStart; index < visibleRange.columnEnd; index += 1) {
			const metric = columnMetricsData.metrics[index];
			if (metric) {
				nextVisibleColumns.push({
					...getVerticalDataTableDesignerGapAdjustedColumnMetric(metric),
				});
			}
		}

		return nextVisibleColumns;
	}, [columnMetricsData.metrics, visibleRange.columnEnd, visibleRange.columnStart]);
	const visibleRows = useMemo(() => {
		return getVerticalDataTableDesignerVisibleRows({
			canvasHeight,
			designCellsByKey,
			renderedRows,
			rowCellsById,
			rowCount,
			rowWidth: Math.max(totalWidth, viewportWidth),
			stickyHeaderHeight,
			timeZone,
			visibleColumns,
			visibleRange,
		});
	}, [
		designCellsByKey,
		renderedRows,
		rowCellsById,
		canvasHeight,
		stickyHeaderHeight,
		timeZone,
		rowCount,
		totalWidth,
		viewportWidth,
		visibleColumns,
		visibleRange,
	]);

	columnReorderRuntimeRef.current = {
		metrics: reorderColumnMetrics,
		visibleColumnKeys,
	};

	const startColumnResize = useCallback((columnKey: string, clientX: number) => {
		const metric = columnMetricsByKey.get(columnKey);
		if (disabled || !metric || columnReorderStateRef.current?.started) {
			return;
		}

		resizeCleanupRef.current?.();
		resizeStateRef.current = {
			columnKey,
			startClientX: clientX,
			startWidth: metric.width,
		};
		setResizingColumnKey(columnKey);
		setResizeGuideWidth(metric.width);

		const finishResize = (finishClientX?: number) => {
			const resizeState = resizeStateRef.current;
			const latestWidth = resizeState
				? resizeState.latestWidth ?? (Number.isFinite(finishClientX) ? clampSheetColumnWidth(resizeState.startWidth + Number(finishClientX) - resizeState.startClientX) : resizeState.startWidth)
				: null;

			cancelVerticalDataTableDesignerFrame(resizeFrameRef);

			if (resizeState && latestWidth !== null) {
				setDesignerValue((currentValue) => updateVerticalDataTableDesignerColumnWidth(currentValue, resizeState.columnKey, latestWidth));
			}

			resizeStateRef.current = null;
			resizeCleanupRef.current?.();
			resizeCleanupRef.current = null;
			setResizingColumnKey(null);
			setResizeGuideWidth(null);
		};
		const cancelResize = () => {
			cancelVerticalDataTableDesignerFrame(resizeFrameRef);

			resizeStateRef.current = null;
			resizeCleanupRef.current?.();
			resizeCleanupRef.current = null;
			setResizingColumnKey(null);
			setResizeGuideWidth(null);
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
				setResizeGuideWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
			});
		};
		const onPointerUp = (event: PointerEvent) => {
			finishResize(event.clientX);
		};
		const onContextMenu = () => {
			finishResize();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				cancelResize();
			}
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerUp);
		window.addEventListener('contextmenu', onContextMenu, true);
		window.addEventListener('keydown', onKeyDown);
		resizeCleanupRef.current = () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
			window.removeEventListener('contextmenu', onContextMenu, true);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [columnMetricsByKey, disabled, setDesignerValue]);

	const startColumnReorder = useCallback((columnKey: string, clientX: number) => {
		const reorderRuntime = columnReorderRuntimeRef.current;
		const scrollNode = scrollElement.node;
		const metric = reorderRuntime?.metrics.find((item) => item.column.key === columnKey);

		if (disabled || !reorderRuntime || !scrollNode || !metric || reorderRuntime.visibleColumnKeys.length < 2) {
			return;
		}

		columnReorderCleanupRef.current?.();

		const startLeft = getVerticalDataTableDesignerColumnMetricHeaderLeft(metric, scrollState.scrollLeft);
		const initialReorderState: VerticalDataTableDesignerColumnReorderState = {
			columnKey,
			latestClientX: clientX,
			latestToVisibleIndex: 0,
			startClientX: clientX,
			startColumnIndex: metric.columnIndex,
			startLeft,
			startWidth: metric.width,
			started: false,
		};
		initialReorderState.latestToVisibleIndex = getVerticalDataTableDesignerColumnReorderPointerTarget({
			clientX,
			runtime: reorderRuntime,
			scrollLeft: scrollState.scrollLeft,
			scrollNode,
			state: initialReorderState,
			value: currentValueRef.current,
		});

		columnReorderStateRef.current = initialReorderState;

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

			cancelVerticalDataTableDesignerFrame(columnReorderFrameRef);

			if (reorderState && latestClientX !== undefined) {
				reorderState.latestClientX = latestClientX;
				reorderState.latestToVisibleIndex = getVerticalDataTableDesignerColumnReorderPointerTarget({
					clientX: latestClientX,
					runtime: reorderRuntime,
					scrollLeft: scrollState.scrollLeft,
					scrollNode,
					state: reorderState,
					value: currentValueRef.current,
				});
			}

			if (reorderState?.started) {
				const toIndex = getVerticalDataTableDesignerConstrainedTargetIndex(currentValueRef.current, reorderState.columnKey, reorderState.latestToVisibleIndex);

				setDesignerValue((currentValue) => moveVerticalDataTableDesignerColumn(currentValue, reorderState.columnKey, toIndex));
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
				suppressNextHeaderClickRef.current = true;
			}

			event.preventDefault();
			reorderState.latestClientX = event.clientX;
			reorderState.latestToVisibleIndex = getVerticalDataTableDesignerColumnReorderPointerTarget({
				clientX: event.clientX,
				runtime: reorderRuntime,
				scrollLeft: scrollState.scrollLeft,
				scrollNode,
				state: reorderState,
				value: currentValueRef.current,
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
	}, [disabled, scrollElement.node, scrollState.scrollLeft, setDesignerValue]);

	const onPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		const checkboxElement = getVerticalDataTableDesignerClosestElement(event.target, '[data-sheet-header-checkbox="true"]');
		if (checkboxElement) {
			return;
		}

		const handleElement = getVerticalDataTableDesignerClosestElement(event.target, '[data-sheet-column-resize-handle]');
		if (handleElement) {
			if (event.button !== 0) {
				return;
			}

			const columnKey = handleElement.dataset.sheetColumnResizeHandle;
			if (!columnKey) {
				return;
			}

			event.preventDefault();
			startColumnResize(columnKey, event.clientX);
			return;
		}

		const headerElement = getVerticalDataTableDesignerClosestElement(event.target, '[data-sheet-header-cell="true"]');
		if (headerElement?.dataset.sheetHeaderReorderable === 'true' && event.button === 0) {
			const columnKey = headerElement.dataset.cellKey;
			if (columnKey) {
				startColumnReorder(columnKey, event.clientX);
			}
			return;
		}

		const cellElement = getVerticalDataTableDesignerClosestElement(event.target, '[data-sheet-cell="true"]');
		const cellKey = cellElement?.dataset.cellKey;
		const rowId = cellElement?.dataset.rowId;
		if (cellKey && rowId) {
			setSelectedCellState({
				cellKey,
				rowId,
			});
		}
	}, [startColumnReorder, startColumnResize]);

	const onClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const checkboxElement = getVerticalDataTableDesignerClosestElement(event.target, '[data-sheet-header-checkbox="true"]');
		if (checkboxElement) {
			const columnKey = checkboxElement.dataset.cellKey;
			if (columnKey && !disabled) {
				setDesignerValue((currentValue) => toggleVerticalDataTableDesignerColumnChecked(currentValue, columnKey));
			}
			return;
		}

		if (suppressNextHeaderClickRef.current) {
			suppressNextHeaderClickRef.current = false;
		}
	}, [disabled, setDesignerValue]);

	const resizeGuide = useMemo<SheetUIResizeGuide | null>(() => {
		if (!resizingColumnKey || columnReorderVisualState) {
			return null;
		}

		const metric = columnMetricsByKey.get(resizingColumnKey);
		if (!metric) {
			return null;
		}

		return {
			columnKey: resizingColumnKey,
			height: canvasHeight,
			left: VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH + metric.left + VERTICAL_DATA_TABLE_DESIGNER_COLUMN_GAP_WIDTH + (resizeGuideWidth ?? metric.width),
		};
	}, [canvasHeight, columnMetricsByKey, columnReorderVisualState, resizeGuideWidth, resizingColumnKey]);
	const columnReorderGuide = useMemo<SheetUIColumnReorderGuide | null>(() => {
		if (!columnReorderVisualState) {
			return null;
		}

		return {
			columnKey: columnReorderVisualState.columnKey,
			height: SHEET_HEADER_HEIGHT,
			left: getVerticalDataTableDesignerColumnReorderGuideLeft(columnReorderRuntimeRef.current?.metrics || [], columnReorderVisualState.toVisibleIndex, scrollState.scrollLeft),
		};
	}, [columnReorderVisualState, scrollState.scrollLeft]);
	const columnReorderDrag = useMemo<SheetUIColumnReorderDrag | null>(() => {
		if (!columnReorderVisualState) {
			return null;
		}

		const metric = columnReorderRuntimeRef.current?.metrics.find((item) => item.column.key === columnReorderVisualState.columnKey);
		if (!metric) {
			return null;
		}

		return {
			columnKey: columnReorderVisualState.columnKey,
			label: metric.column.label,
			left: columnReorderVisualState.dragLeft,
			width: metric.width,
		};
	}, [columnReorderVisualState]);
	const columnReorderDisplacements = useMemo<SheetUIColumnReorderDisplacements | null>(() => {
		if (!columnReorderVisualState) {
			return null;
		}

		return getVerticalDataTableDesignerColumnReorderHeaderDisplacements({
			columnKey: columnReorderVisualState.columnKey,
			metrics: columnReorderRuntimeRef.current?.metrics || [],
			scrollLeft: scrollState.scrollLeft,
			toVisibleIndex: columnReorderVisualState.toVisibleIndex,
			visibleColumnKeys,
		});
	}, [columnReorderVisualState, scrollState.scrollLeft, visibleColumnKeys]);

	return <div
		className={cn('v_stretch h_f w_f max_w_f rel bg', className)}
		data-table-designer='true'
		style={VERTICAL_DATA_TABLE_DESIGNER_FILL_STYLE}
		onClickCapture={onClickCapture}
		onPointerDownCapture={onPointerDownCapture}
	>
		<DataTableUI
			canvasClassName='bg pattern_stripes active_bf'
			canvasHeight={canvasHeight}
			canvasWidth={Math.max(totalWidth, viewportWidth)}
			cellCount={rowCount * uiColumns.length}
			className='f'
			columnReorderDrag={columnReorderDrag}
			columnReorderDisplacements={columnReorderDisplacements}
			columnReorderEnabled={!disabled}
			columnReorderGuide={columnReorderGuide}
			columnCount={uiColumns.length}
			columns={visibleColumns}
			editState={undefined}
			headerCellsEditable={false}
			headerContent={children}
			headerCursorClassName='cs_grab'
			headerTooltipClosesWhilePointerDown
			headerEditState={null}
			headerSpacerWidth={rowContentWidth}
			headerWidth={Math.max(totalWidth, viewportWidth)}
			resizeGuide={resizeGuide}
			rowHeaderWidth={VERTICAL_DATA_TABLE_DESIGNER_ROW_HEADER_WIDTH}
			rows={visibleRows}
			// NOTE: You will need to put .bd_t_1.bd_lt here if you want to bring back the formula bar for this module.
			// scrollClassName='bd_t_1 bd_lt'
			scrollLeft={scrollState.scrollLeft}
			scrollRef={scrollElement.ref}
			scrollStyle={VERTICAL_DATA_TABLE_DESIGNER_FILL_STYLE}
			selectedCellKeyMap={null}
			selectedCellState={selectedCellState}
			sheetSurfaceHeight={canvasHeight}
			sheetSurfaceTop={0}
			style={VERTICAL_DATA_TABLE_DESIGNER_FILL_STYLE}
			hideStickyColumnSpacer
			showRowNumbers={false}
			stickyColumnEndLeft={stickyColumnEndLeft}
			stickyColumnCount={VERTICAL_DATA_TABLE_DESIGNER_STICKY_COLUMN_COUNT}
		/>
	</div>;
});

VerticalDataTableDesigner.displayName = 'VerticalDataTableDesigner';

export default VerticalDataTableDesigner;
