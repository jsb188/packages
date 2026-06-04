import { cn } from '@jsb188/app/utils/string.ts';
import type {
	DataTableCellGQL,
	DataTableDesignCellGQL,
	DataTableDesignGQL,
	DataTableDesignViewColumnGQL,
	DataTableDesignViewGQL,
	DataTableGQL,
	DataTableRowGQL,
} from '@jsb188/mday/types/dataTable.d.ts';
import {
	getOrderedDataTableDesignCells,
	getOrderedDataTableDesignViewColumns,
	mapDataTableDesignViewColumnToCell,
} from '@jsb188/mday/utils/dataTable.ts';
import { DataTableUI } from '@jsb188/react-web/ui/DataTableUI';
import {
	clampSheetColumnWidth,
	getSheetColumnMetrics,
	getSheetMinimumRowCount,
	getSheetVisibleRange,
	SHEET_COLUMN_WIDTH,
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_HEIGHT,
	SHEET_STICKY_SPACER_SIZE,
	type SheetColumnMetric,
	type SheetColumnWidths,
	type SheetUICell,
	type SheetUIColumnReorderDisplacements,
	type SheetUIColumnReorderDrag,
	type SheetUIColumnReorderGuide,
	type SheetUIHeaderEditState,
	type SheetUIResizeGuide,
	type SheetUIRowSlot,
} from '@jsb188/react-web/ui/SheetUI';
import { useGridElementSize } from '@jsb188/sheet/modules/grid-runtime';
import {
	getDataTableCellClassNameFromModel,
	getDataTableCellDisplayClassNameFromModel,
	getDataTableCellDisplayModel,
	getDataTableDesignCellHeaderLabel,
	getDataTableOpenLinkIconName,
	getDataTableRuntimeCellKey,
	getDataTableRuntimeColumnKey,
	getDataTableSheetUIColumn,
	parseDataTableRawValue,
	type DataTableRuntimeDesignCell,
} from './dataTable-cell-editing.tsx';
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
} from 'react';

/**
 * Types
 */

export type TableDesignerValueColumn = {
	key: string;
	designKey: string;
	sourceCellKey?: string | null;
	checked: boolean;
	headerValue: string;
	width?: number | null;
};

export type TableDesignerValue = {
	columns: TableDesignerValueColumn[];
};

export type TableDesignerHandle = {
	getValue: () => TableDesignerValue;
	reset: (value?: Partial<TableDesignerValue>) => void;
};

export type TableDesignerProps = {
	dataTable: DataTableGQL;
	rows?: DataTableRowGQL[] | null;
	value?: TableDesignerValue;
	defaultValue?: Partial<TableDesignerValue>;
	onChange?: (value: TableDesignerValue) => void;
	activeViewId?: string | null;
	disabled?: boolean;
	className?: string;
	bufferRows?: number;
	bufferColumns?: number;
	timeZone?: string | null;
};

type TableDesignerRuntimeColumn = DataTableRuntimeDesignCell & {
	sourceCellKey?: string | null;
};

type TableDesignerColumnReorderState = {
	columnKey: string;
	latestClientX: number;
	latestToVisibleIndex: number;
	startClientX: number;
	startColumnIndex: number;
	startLeft: number;
	startWidth: number;
	started: boolean;
};

type TableDesignerColumnReorderVisualState = {
	columnKey: string;
	dragLeft: number;
	toVisibleIndex: number;
};

type TableDesignerResizeState = {
	columnKey: string;
	latestWidth?: number;
	startClientX: number;
	startWidth: number;
};

type TableDesignerColumnReorderRuntime = {
	metrics: SheetColumnMetric[];
	visibleColumnKeys: string[];
};

/**
 * Constants
 */

const TABLE_DESIGNER_BUFFER_COLUMNS = 3;
const TABLE_DESIGNER_BUFFER_ROWS = 8;
const TABLE_DESIGNER_MOCK_ROW_COUNT = 5;
const TABLE_DESIGNER_MOCK_CELL_TEXT = '... ... ...';
const TABLE_DESIGNER_ROW_RIGHT_PADDING = 64;
const TABLE_DESIGNER_ROW_HEADER_WIDTH = 0;
const TABLE_DESIGNER_STICKY_COLUMN_COUNT = 0;
const TABLE_DESIGNER_COLUMN_REORDER_OVERLAP_THRESHOLD = 0.35;

/*
 * Return the raw string value from one event target when it is an editor element.
 */
function getTableDesignerEditorElementValue(element: EventTarget | null) {
	if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
		return element.value;
	}

	return '';
}

/*
 * Return the closest element matching a selector from a browser event target.
 */
function getTableDesignerClosestElement(target: EventTarget | null, selector: string) {
	return target instanceof Element ? target.closest(selector) as HTMLElement | null : null;
}

/*
 * Return active view data when the caller asks TableDesigner to design one view.
 */
function getTableDesignerActiveView(design: DataTableDesignGQL, activeViewId?: string | null) {
	if (!activeViewId) {
		return null;
	}

	return (design.views || []).find((view) => view.id === activeViewId) || null;
}

/*
 * Return whether a view column backed by a hidden master cell should be skipped.
 */
function isTableDesignerViewColumnVisible(column: DataTableDesignViewColumnGQL, masterCellsByKey: Map<string, DataTableDesignCellGQL>) {
	if (column.source?.type !== 'MASTER_CELL' || !column.source.cellKey) {
		return true;
	}

	return !masterCellsByKey.get(column.source.cellKey)?.hidden;
}

/*
 * Add stable runtime keys when duplicated source keys would collide in the sheet grid.
 */
function getTableDesignerRuntimeColumnsWithUniqueKeys(cells: TableDesignerRuntimeColumn[]) {
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
 * Return the runtime columns TableDesigner should render for the selected source.
 */
function getTableDesignerRuntimeColumns(dataTable: DataTableGQL, activeView?: DataTableDesignViewGQL | null) {
	const masterCells = getOrderedDataTableDesignCells(dataTable.design as any) as DataTableDesignCellGQL[];

	if (!activeView) {
		return getTableDesignerRuntimeColumnsWithUniqueKeys(masterCells.map((cell) => ({
			...cell,
			sourceCellKey: cell.key,
		})));
	}

	const masterCellsByKey = new Map(masterCells.map((cell) => [cell.key, cell]));
	const viewColumns = getOrderedDataTableDesignViewColumns(activeView as any)
		.filter((column) => isTableDesignerViewColumnVisible(column as DataTableDesignViewColumnGQL, masterCellsByKey))
		.map((column) => {
			const runtimeCell = mapDataTableDesignViewColumnToCell(column as any, masterCellsByKey as any) as TableDesignerRuntimeColumn;

			return {
				...runtimeCell,
				sourceCellKey: column.source?.cellKey || runtimeCell.key,
			};
		});

	return getTableDesignerRuntimeColumnsWithUniqueKeys(viewColumns);
}

/*
 * Return default TableDesigner column output for one runtime column.
 */
function getTableDesignerDefaultValueColumn(column: TableDesignerRuntimeColumn): TableDesignerValueColumn {
	return {
		key: getDataTableRuntimeColumnKey(column),
		designKey: column.key,
		sourceCellKey: column.sourceCellKey || getDataTableRuntimeCellKey(column),
		checked: true,
		headerValue: getDataTableDesignCellHeaderLabel(column),
		width: Number.isFinite(column.width) ? Number(column.width) : null,
	};
}

/*
 * Return the canonical checked-first column order for TableDesigner output.
 */
function getTableDesignerCheckedFirstColumns(columns: TableDesignerValueColumn[]) {
	const checkedColumns = columns.filter((column) => column.checked);
	const uncheckedColumns = columns.filter((column) => !column.checked);

	return checkedColumns.concat(uncheckedColumns);
}

/*
 * Merge caller-provided TableDesigner value data with the current runtime columns.
 */
function getNormalizedTableDesignerValue(columns: TableDesignerRuntimeColumn[], value?: Partial<TableDesignerValue> | null): TableDesignerValue {
	const defaultColumns = columns.map(getTableDesignerDefaultValueColumn);
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
			width: inputColumn?.width ?? defaultColumn.width,
		};
	});

	return {
		columns: getTableDesignerCheckedFirstColumns(nextColumns),
	};
}

/*
 * Return column widths keyed by runtime column id for SheetUI metrics.
 */
function getTableDesignerColumnWidths(value: TableDesignerValue) {
	return value.columns.reduce((widths, column) => {
		if (Number.isFinite(column.width)) {
			widths[column.key] = clampSheetColumnWidth(Number(column.width));
		}

		return widths;
	}, {} as SheetColumnWidths);
}

/*
 * Return SheetUI columns enriched with TableDesigner header values and checked state.
 */
function getTableDesignerUIColumns(columns: TableDesignerRuntimeColumn[], value: TableDesignerValue) {
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
			headerChecked: valueColumn.checked,
			headerClassName: cn(!valueColumn.checked ? 'op_40' : ''),
			cellClassName: cn(!valueColumn.checked ? 'op_40' : ''),
		};
	}).filter(Boolean) as ReturnType<typeof getDataTableSheetUIColumn>[];
}

/*
 * Return a map of runtime design columns by SheetUI column key.
 */
function getTableDesignerRuntimeColumnsByKey(columns: TableDesignerRuntimeColumn[]) {
	return new Map(columns.map((column) => [getDataTableRuntimeColumnKey(column), column]));
}

/*
 * Return row cells grouped by row id and source cell key.
 */
function getTableDesignerRowCellsById(rows: DataTableRowGQL[]) {
	return new Map(
		rows.map((row) => {
			return [row.id, new Map((row.cells || []).map((cell) => [cell.cellKey, cell]))];
		}),
	);
}

/*
 * Return one dataTable cell's numeric value for computed preview fallbacks.
 */
function getTableDesignerCellNumericValue(cell: DataTableCellGQL | null | undefined) {
	if (!cell) {
		return 0;
	}

	if (typeof cell.numberValue === 'number' && Number.isFinite(cell.numberValue)) {
		return cell.numberValue;
	}

	const numberValue = Number(parseDataTableRawValue(cell.value ?? cell.textValue ?? null));

	return Number.isFinite(numberValue) ? numberValue : 0;
}

/*
 * Build a read-only computed SUM cell if preview rows do not include one.
 */
function getTableDesignerComputedFallbackCell(row: DataTableRowGQL, rowCellMap: Map<string, DataTableCellGQL> | null | undefined, designCell: TableDesignerRuntimeColumn) {
	if (designCell.viewSource?.type !== 'COMPUTED' || designCell.viewSource.operation !== 'SUM') {
		return null;
	}

	const value = (designCell.viewSource.sourceCellKeys || []).reduce((sum, cellKey) => {
		return sum + getTableDesignerCellNumericValue(rowCellMap?.get(cellKey));
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
 * Return the preview cell for one row and runtime column.
 */
function getTableDesignerCellForRuntimeColumn(row: DataTableRowGQL, rowCellMap: Map<string, DataTableCellGQL> | null | undefined, designCell: TableDesignerRuntimeColumn) {
	return rowCellMap?.get(getDataTableRuntimeCellKey(designCell)) || getTableDesignerComputedFallbackCell(row, rowCellMap, designCell);
}

/*
 * Build one placeholder cell used when preview rows do not fill the viewport.
 */
function getTableDesignerPlaceholderUICell(cellKey: string): SheetUICell {
	return {
		cellKey,
		displayValue: TABLE_DESIGNER_MOCK_CELL_TEXT,
		displayClassName: 'mock active bl min_w_50_pc op_20',
		draftValue: '',
	};
}

/*
 * Return the header left coordinate for one rendered column metric.
 */
function getTableDesignerColumnMetricHeaderLeft(metric: SheetColumnMetric, scrollLeft: number) {
	return (metric.columnIndex < TABLE_DESIGNER_STICKY_COLUMN_COUNT ? scrollLeft : 0) + TABLE_DESIGNER_ROW_HEADER_WIDTH + metric.left;
}

/*
 * Return the rectangle occupied by a dragged header at a pointer position.
 */
function getTableDesignerColumnReorderDraggedRect(params: { clientX: number; startClientX: number; startLeft: number; width: number }) {
	const left = params.startLeft + params.clientX - params.startClientX;

	return {
		left,
		right: left + params.width,
	};
}

/*
 * Return the raw visual insertion index nearest one pointer position.
 */
function getTableDesignerColumnReorderTargetIndex(params: {
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

		const metricLeft = getTableDesignerColumnMetricHeaderLeft(metric, params.scrollLeft);
		const metricRight = metricLeft + metric.width;

		if (params.draggedRect && params.draggedColumnIndex !== undefined) {
			if (metric.columnIndex < params.draggedColumnIndex) {
				if (params.draggedRect.left < metricRight - metric.width * TABLE_DESIGNER_COLUMN_REORDER_OVERLAP_THRESHOLD) {
					return index;
				}

				continue;
			}

			if (metric.columnIndex > params.draggedColumnIndex) {
				if (params.draggedRect.right < metricLeft + metric.width * TABLE_DESIGNER_COLUMN_REORDER_OVERLAP_THRESHOLD) {
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
 * Convert a raw insertion slot into an index after removing the dragged column.
 */
function getTableDesignerColumnReorderMoveIndex(visibleColumnKeys: string[], fromKey: string, toVisibleIndex: number) {
	const fromIndex = visibleColumnKeys.indexOf(fromKey);
	const boundedIndex = Math.max(0, Math.min(toVisibleIndex, visibleColumnKeys.length));

	if (fromIndex < 0) {
		return boundedIndex;
	}

	return boundedIndex > fromIndex ? boundedIndex - 1 : boundedIndex;
}

/*
 * Return a constrained insertion index that keeps unchecked columns behind checked columns.
 */
function getTableDesignerConstrainedTargetIndex(value: TableDesignerValue, columnKey: string, toVisibleIndex: number) {
	const column = value.columns.find((item) => item.key === columnKey);
	if (!column) {
		return toVisibleIndex;
	}

	const checkedCount = value.columns.filter((item) => item.checked).length;
	const fromIndex = value.columns.findIndex((item) => item.key === columnKey);
	const rawMoveIndex = getTableDesignerColumnReorderMoveIndex(value.columns.map((item) => item.key), columnKey, toVisibleIndex);
	const minIndex = column.checked ? 0 : Math.max(0, checkedCount - (fromIndex < checkedCount ? 1 : 0));
	const maxIndex = column.checked ? Math.max(0, checkedCount - 1) : value.columns.length - 1;

	return Math.max(minIndex, Math.min(rawMoveIndex, maxIndex));
}

/*
 * Return the visual insertion guide left coordinate for a reorder target.
 */
function getTableDesignerColumnReorderGuideLeft(metrics: SheetColumnMetric[], toVisibleIndex: number, scrollLeft: number) {
	const targetMetric = metrics[toVisibleIndex];
	if (targetMetric) {
		return getTableDesignerColumnMetricHeaderLeft(targetMetric, scrollLeft) - 1;
	}

	const lastMetric = metrics[metrics.length - 1];
	if (!lastMetric) {
		return TABLE_DESIGNER_ROW_HEADER_WIDTH;
	}

	return getTableDesignerColumnMetricHeaderLeft(lastMetric, scrollLeft) + lastMetric.width - 1;
}

/*
 * Return temporary header displacements while a TableDesigner column is dragged.
 */
function getTableDesignerColumnReorderHeaderDisplacements(params: {
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

	const toIndex = Math.max(0, Math.min(params.toVisibleIndex, params.visibleColumnKeys.length - 1));
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

	const currentLefts = new Map(params.metrics.map((metric) => [metric.column.key, getTableDesignerColumnMetricHeaderLeft(metric, params.scrollLeft)]));
	const displacements: SheetUIColumnReorderDisplacements = {};
	let nextLeft = 0;

	projectedOrder.forEach((columnKey) => {
		const metric = metricsByKey.get(columnKey);
		if (!metric) {
			return;
		}

		const projectedLeft = TABLE_DESIGNER_ROW_HEADER_WIDTH + nextLeft + SHEET_STICKY_SPACER_SIZE;
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
 * Return a new TableDesigner value with one column moved to the supplied index.
 */
function moveTableDesignerColumn(value: TableDesignerValue, columnKey: string, toIndex: number): TableDesignerValue {
	const fromIndex = value.columns.findIndex((column) => column.key === columnKey);
	if (fromIndex < 0) {
		return value;
	}

	const nextColumns = value.columns.slice(0);
	const [movedColumn] = nextColumns.splice(fromIndex, 1);
	if (!movedColumn) {
		return value;
	}

	nextColumns.splice(Math.max(0, Math.min(toIndex, nextColumns.length)), 0, movedColumn);

	return {
		columns: getTableDesignerCheckedFirstColumns(nextColumns),
	};
}

/*
 * Return a new TableDesigner value after toggling one column's included state.
 */
function toggleTableDesignerColumnChecked(value: TableDesignerValue, columnKey: string): TableDesignerValue {
	const column = value.columns.find((item) => item.key === columnKey);
	if (!column) {
		return value;
	}

	const nextChecked = !column.checked;
	const nextColumns = value.columns
		.filter((item) => item.key !== columnKey)
		.concat([{ ...column, checked: nextChecked }]);

	return {
		columns: getTableDesignerCheckedFirstColumns(nextColumns),
	};
}

/*
 * Return a new TableDesigner value after changing one header formula string.
 */
function updateTableDesignerHeaderValue(value: TableDesignerValue, columnKey: string, headerValue: string): TableDesignerValue {
	return {
		columns: value.columns.map((column) => {
			return column.key === columnKey ? { ...column, headerValue } : column;
		}),
	};
}

/*
 * Return a new TableDesigner value after changing one column width.
 */
function updateTableDesignerColumnWidth(value: TableDesignerValue, columnKey: string, width: number): TableDesignerValue {
	return {
		columns: value.columns.map((column) => {
			return column.key === columnKey ? { ...column, width } : column;
		}),
	};
}

/*
 * Render a local-state DataTable-style designer surface for arranging columns.
 */
export const TableDesigner = forwardRef<TableDesignerHandle, TableDesignerProps>((p, ref) => {
	const {
		activeViewId = null,
		bufferColumns = TABLE_DESIGNER_BUFFER_COLUMNS,
		bufferRows = TABLE_DESIGNER_BUFFER_ROWS,
		className,
		dataTable,
		disabled,
		rows: previewRows = [],
		timeZone,
	} = p;
	const scrollElement = useGridElementSize<HTMLDivElement>();
	const resizeStateRef = useRef<TableDesignerResizeState | null>(null);
	const resizeFrameRef = useRef<number | null>(null);
	const resizeCleanupRef = useRef<(() => void) | null>(null);
	const columnReorderRuntimeRef = useRef<TableDesignerColumnReorderRuntime | null>(null);
	const columnReorderStateRef = useRef<TableDesignerColumnReorderState | null>(null);
	const columnReorderFrameRef = useRef<number | null>(null);
	const columnReorderCleanupRef = useRef<(() => void) | null>(null);
	const currentValueRef = useRef<TableDesignerValue>({ columns: [] });
	const suppressNextHeaderClickRef = useRef(false);
	const [localValue, setLocalValue] = useState<TableDesignerValue>(() => ({ columns: [] }));
	const [headerEditState, setHeaderEditState] = useState<SheetUIHeaderEditState | null>(null);
	const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollTop: 0 });
	const [resizingColumnKey, setResizingColumnKey] = useState<string | null>(null);
	const [resizeGuideWidth, setResizeGuideWidth] = useState<number | null>(null);
	const [columnReorderVisualState, setColumnReorderVisualState] = useState<TableDesignerColumnReorderVisualState | null>(null);
	const activeView = useMemo(() => {
		return getTableDesignerActiveView(dataTable.design, activeViewId);
	}, [activeViewId, dataTable.design]);
	const runtimeColumns = useMemo(() => {
		return getTableDesignerRuntimeColumns(dataTable, activeView);
	}, [activeView, dataTable]);
	const effectiveValue = useMemo(() => {
		return getNormalizedTableDesignerValue(runtimeColumns, p.value || localValue.columns.length ? p.value || localValue : p.defaultValue);
	}, [localValue, p.defaultValue, p.value, runtimeColumns]);

	currentValueRef.current = effectiveValue;

	const setDesignerValue = useCallback((updater: TableDesignerValue | ((value: TableDesignerValue) => TableDesignerValue)) => {
		const nextValue = typeof updater === 'function' ? updater(currentValueRef.current) : updater;

		currentValueRef.current = nextValue;
		if (!p.value) {
			setLocalValue(nextValue);
		}

		p.onChange?.(nextValue);
	}, [p]);

	useImperativeHandle(ref, () => ({
		getValue: () => currentValueRef.current,
		reset: (value?: Partial<TableDesignerValue>) => {
			const nextValue = getNormalizedTableDesignerValue(runtimeColumns, value || p.defaultValue);

			currentValueRef.current = nextValue;
			if (!p.value) {
				setLocalValue(nextValue);
			}

			p.onChange?.(nextValue);
		},
	}), [p, runtimeColumns]);

	useEffect(() => {
		setLocalValue((currentValue) => getNormalizedTableDesignerValue(runtimeColumns, currentValue.columns.length ? currentValue : p.defaultValue));
	}, [dataTable.id, activeViewId, runtimeColumns]);

	useEffect(() => {
		const scrollNode = scrollElement.node;
		if (!scrollNode) {
			return;
		}

		const onScroll = () => {
			setScrollState({
				scrollLeft: scrollNode.scrollLeft,
				scrollTop: scrollNode.scrollTop,
			});
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

			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
			}

			if (columnReorderFrameRef.current !== null) {
				cancelAnimationFrame(columnReorderFrameRef.current);
			}
		};
	}, []);

	const uiColumns = useMemo(() => {
		return getTableDesignerUIColumns(runtimeColumns, effectiveValue);
	}, [effectiveValue, runtimeColumns]);
	const columnWidths = useMemo(() => {
		return getTableDesignerColumnWidths(effectiveValue);
	}, [effectiveValue]);
	const columnMetricsData = useMemo(() => {
		return getSheetColumnMetrics(uiColumns, columnWidths);
	}, [columnWidths, uiColumns]);
	const columnMetricsByKey = useMemo(() => {
		return new Map(columnMetricsData.metrics.map((metric) => [metric.column.key, metric]));
	}, [columnMetricsData.metrics]);
	const designCellsByKey = useMemo(() => {
		return getTableDesignerRuntimeColumnsByKey(runtimeColumns);
	}, [runtimeColumns]);
	const renderedRows = useMemo(() => {
		return Array.isArray(previewRows) ? previewRows : [];
	}, [previewRows]);
	const rowCellsById = useMemo(() => {
		return getTableDesignerRowCellsById(renderedRows);
	}, [renderedRows]);
	const stickyHeaderHeight = SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE;
	const viewportHeight = scrollElement.size.height || stickyHeaderHeight + SHEET_ROW_HEIGHT * 20;
	const viewportWidth = scrollElement.size.width || 5 * SHEET_COLUMN_WIDTH;
	const minimumVisualRowCount = getSheetMinimumRowCount(viewportHeight, stickyHeaderHeight);
	const visualRowCount = Math.max(renderedRows.length || TABLE_DESIGNER_MOCK_ROW_COUNT, minimumVisualRowCount);
	const visualRowsHeight = visualRowCount * SHEET_ROW_HEIGHT;
	const totalWidth = TABLE_DESIGNER_ROW_HEADER_WIDTH + columnMetricsData.totalWidth + SHEET_STICKY_SPACER_SIZE + TABLE_DESIGNER_ROW_RIGHT_PADDING;
	const rowContentWidth = TABLE_DESIGNER_ROW_HEADER_WIDTH + columnMetricsData.totalWidth + SHEET_STICKY_SPACER_SIZE;
	const stickyColumnEndLeft = TABLE_DESIGNER_ROW_HEADER_WIDTH;
	const totalHeight = stickyHeaderHeight + visualRowsHeight;
	const columnOffsetsWithStickySpacer = useMemo(() => {
		return columnMetricsData.offsets.map((offset, index) => {
			return index > TABLE_DESIGNER_STICKY_COLUMN_COUNT ? offset + SHEET_STICKY_SPACER_SIZE : offset;
		});
	}, [columnMetricsData.offsets]);
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
			rowHeaderWidth: TABLE_DESIGNER_ROW_HEADER_WIDTH,
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

		for (let index = visibleRange.columnStart; index < visibleRange.columnEnd; index += 1) {
			visibleColumnIndexes.add(index);
		}

		return Array.from(visibleColumnIndexes)
			.sort((a, b) => a - b)
			.map((index) => columnMetricsData.metrics[index])
			.filter(Boolean)
			.map((metric) => ({
				...metric,
				left: metric.left + SHEET_STICKY_SPACER_SIZE,
			}));
	}, [columnMetricsData.metrics, visibleRange.columnEnd, visibleRange.columnStart]);
	const visibleRows = useMemo(() => {
		const rowWidth = Math.max(totalWidth, viewportWidth);
		const visibleRowSlots: SheetUIRowSlot[] = [];

		for (let rowIndex = visibleRange.rowStart; rowIndex < visibleRange.rowEnd; rowIndex += 1) {
			const row = renderedRows[rowIndex];
			const rowCellMap = row ? rowCellsById.get(row.id) : null;
			const cellsByKey: Record<string, SheetUICell | undefined> = {};

			visibleColumns.forEach((columnMetric) => {
				const designCell = designCellsByKey.get(columnMetric.column.key);
				if (!designCell) {
					return;
				}

				const runtimeKey = getDataTableRuntimeColumnKey(designCell);

				if (!row) {
					cellsByKey[runtimeKey] = getTableDesignerPlaceholderUICell(runtimeKey);
					return;
				}

				const cell = getTableDesignerCellForRuntimeColumn(row, rowCellMap, designCell);
				const displayModel = getDataTableCellDisplayModel({
					canEdit: false,
					cell,
					designCell,
					iconName: (cell && 'iconName' in cell ? cell.iconName : null) || designCell.iconName || getDataTableOpenLinkIconName(cell, designCell),
					rowDeleted: row.__deleted,
					timeZone,
				});

				cellsByKey[runtimeKey] = {
					cellKey: runtimeKey,
					displayValue: displayModel.text,
					draftValue: displayModel.draftValue,
					iconName: displayModel.iconName,
					canEdit: false,
					canOpen: false,
					cellClassName: getDataTableCellClassNameFromModel(displayModel),
					displayClassName: getDataTableCellDisplayClassNameFromModel(displayModel),
				};
			});

			visibleRowSlots.push({
				cellsByKey,
				deleted: row?.__deleted,
				rowId: row?.id || null,
				rowIndex,
				rowKey: row?.id || `empty-${rowIndex}`,
				rowNumber: null,
				rowHeight: SHEET_ROW_HEIGHT,
				rowTop: stickyHeaderHeight + rowIndex * SHEET_ROW_HEIGHT,
				rowWidth,
			});
		}

		return visibleRowSlots;
	}, [
		designCellsByKey,
		renderedRows,
		rowCellsById,
		stickyHeaderHeight,
		timeZone,
		totalWidth,
		viewportWidth,
		visibleColumns,
		visibleRange.rowEnd,
		visibleRange.rowStart,
	]);

	columnReorderRuntimeRef.current = {
		metrics: columnMetricsData.metrics.map((metric) => ({
			...metric,
			left: metric.left + SHEET_STICKY_SPACER_SIZE,
		})),
		visibleColumnKeys: effectiveValue.columns.map((column) => column.key),
	};

	const commitHeaderEditorElement = useCallback((editorElement: HTMLElement) => {
		const cellKey = editorElement.dataset.cellKey;
		if (!cellKey) {
			setHeaderEditState(null);
			return;
		}

		const draftValue = getTableDesignerEditorElementValue(editorElement);
		setHeaderEditState(null);
		setDesignerValue((currentValue) => updateTableDesignerHeaderValue(currentValue, cellKey, draftValue));
	}, [setDesignerValue]);

	const startHeaderEdit = useCallback((cellKey: string) => {
		if (disabled) {
			return;
		}

		const valueColumn = currentValueRef.current.columns.find((column) => column.key === cellKey);
		if (!valueColumn) {
			return;
		}

		setHeaderEditState({
			cellKey,
			draftValue: valueColumn.headerValue,
		});
	}, [disabled]);

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

			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
				resizeFrameRef.current = null;
			}

			if (resizeState && latestWidth !== null) {
				setDesignerValue((currentValue) => updateTableDesignerColumnWidth(currentValue, resizeState.columnKey, latestWidth));
			}

			resizeStateRef.current = null;
			resizeCleanupRef.current?.();
			resizeCleanupRef.current = null;
			setResizingColumnKey(null);
			setResizeGuideWidth(null);
		};
		const cancelResize = () => {
			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
				resizeFrameRef.current = null;
			}

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
				setResizeGuideWidth(nextWidth);
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

		const startLeft = getTableDesignerColumnMetricHeaderLeft(metric, scrollState.scrollLeft);
		const initialTargetIndex = getTableDesignerConstrainedTargetIndex(
			currentValueRef.current,
			columnKey,
			getTableDesignerColumnReorderTargetIndex({
				clientX,
				draggedColumnIndex: metric.columnIndex,
				draggedRect: getTableDesignerColumnReorderDraggedRect({
					clientX,
					startClientX: clientX,
					startLeft,
					width: metric.width,
				}),
				metrics: reorderRuntime.metrics,
				scrollLeft: scrollState.scrollLeft,
				scrollNode,
			}),
		);

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
				reorderState.latestToVisibleIndex = getTableDesignerConstrainedTargetIndex(
					currentValueRef.current,
					reorderState.columnKey,
					getTableDesignerColumnReorderTargetIndex({
						clientX: latestClientX,
						draggedColumnIndex: reorderState.startColumnIndex,
						draggedRect: getTableDesignerColumnReorderDraggedRect({
							clientX: latestClientX,
							startClientX: reorderState.startClientX,
							startLeft: reorderState.startLeft,
							width: reorderState.startWidth,
						}),
						metrics: reorderRuntime.metrics,
						scrollLeft: scrollState.scrollLeft,
						scrollNode,
					}),
				);
			}

			if (reorderState?.started) {
				const toIndex = getTableDesignerConstrainedTargetIndex(currentValueRef.current, reorderState.columnKey, reorderState.latestToVisibleIndex);

				setDesignerValue((currentValue) => moveTableDesignerColumn(currentValue, reorderState.columnKey, toIndex));
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
				setHeaderEditState(null);
			}

			event.preventDefault();
			reorderState.latestClientX = event.clientX;
			reorderState.latestToVisibleIndex = getTableDesignerConstrainedTargetIndex(
				currentValueRef.current,
				reorderState.columnKey,
				getTableDesignerColumnReorderTargetIndex({
					clientX: event.clientX,
					draggedColumnIndex: reorderState.startColumnIndex,
					draggedRect: getTableDesignerColumnReorderDraggedRect({
						clientX: event.clientX,
						startClientX: reorderState.startClientX,
						startLeft: reorderState.startLeft,
						width: reorderState.startWidth,
					}),
					metrics: reorderRuntime.metrics,
					scrollLeft: scrollState.scrollLeft,
					scrollNode,
				}),
			);
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
		const checkboxElement = getTableDesignerClosestElement(event.target, '[data-sheet-header-checkbox="true"]');
		if (checkboxElement) {
			return;
		}

		const handleElement = getTableDesignerClosestElement(event.target, '[data-sheet-column-resize-handle]');
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

		const headerElement = getTableDesignerClosestElement(event.target, '[data-sheet-header-cell="true"]');
		if (headerElement?.dataset.sheetHeaderReorderable === 'true' && event.button === 0) {
			const columnKey = headerElement.dataset.cellKey;
			if (columnKey) {
				startColumnReorder(columnKey, event.clientX);
			}
		}
	}, [startColumnReorder, startColumnResize]);

	const onClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const checkboxElement = getTableDesignerClosestElement(event.target, '[data-sheet-header-checkbox="true"]');
		if (checkboxElement) {
			const columnKey = checkboxElement.dataset.cellKey;
			if (columnKey && !disabled) {
				setHeaderEditState(null);
				setDesignerValue((currentValue) => toggleTableDesignerColumnChecked(currentValue, columnKey));
			}
			return;
		}

		const headerElement = getTableDesignerClosestElement(event.target, '[data-sheet-header-cell="true"]');
		if (!headerElement || disabled) {
			return;
		}

		if (suppressNextHeaderClickRef.current) {
			suppressNextHeaderClickRef.current = false;
			return;
		}

		const columnKey = headerElement.dataset.cellKey;
		if (columnKey) {
			startHeaderEdit(columnKey);
		}
	}, [disabled, setDesignerValue, startHeaderEdit]);

	const onBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
		const headerEditorElement = getTableDesignerClosestElement(event.target, '[data-sheet-header-editor="true"]');

		if (headerEditorElement) {
			commitHeaderEditorElement(headerEditorElement);
		}
	}, [commitHeaderEditorElement]);

	const onKeyDownCapture = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
		const headerEditorElement = getTableDesignerClosestElement(event.target, '[data-sheet-header-editor="true"]');
		if (!headerEditorElement) {
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			commitHeaderEditorElement(headerEditorElement);
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			setHeaderEditState(null);
		}
	}, [commitHeaderEditorElement]);

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
			height: Math.max(totalHeight, viewportHeight),
			left: TABLE_DESIGNER_ROW_HEADER_WIDTH + metric.left + SHEET_STICKY_SPACER_SIZE + (resizeGuideWidth ?? metric.width),
		};
	}, [columnMetricsByKey, columnReorderVisualState, resizeGuideWidth, resizingColumnKey, totalHeight, viewportHeight]);
	const columnReorderGuide = useMemo<SheetUIColumnReorderGuide | null>(() => {
		if (!columnReorderVisualState) {
			return null;
		}

		return {
			columnKey: columnReorderVisualState.columnKey,
			height: SHEET_HEADER_HEIGHT,
			left: getTableDesignerColumnReorderGuideLeft(columnReorderRuntimeRef.current?.metrics || [], columnReorderVisualState.toVisibleIndex, scrollState.scrollLeft),
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

		return getTableDesignerColumnReorderHeaderDisplacements({
			columnKey: columnReorderVisualState.columnKey,
			metrics: columnReorderRuntimeRef.current?.metrics || [],
			scrollLeft: scrollState.scrollLeft,
			toVisibleIndex: columnReorderVisualState.toVisibleIndex,
			visibleColumnKeys: effectiveValue.columns.map((column) => column.key),
		});
	}, [columnReorderVisualState, effectiveValue.columns, scrollState.scrollLeft]);

	return <div
		className={cn('v_stretch h_f w_f rel bg', className)}
		data-table-designer='true'
		onBlurCapture={onBlurCapture}
		onClickCapture={onClickCapture}
		onKeyDownCapture={onKeyDownCapture}
		onPointerDownCapture={onPointerDownCapture}
	>
		<DataTableUI
			canvasHeight={Math.max(totalHeight, viewportHeight)}
			canvasWidth={Math.max(totalWidth, viewportWidth)}
			cellCount={visualRowCount * uiColumns.length}
			className={undefined}
			columnReorderDrag={columnReorderDrag}
			columnReorderDisplacements={columnReorderDisplacements}
			columnReorderEnabled={!disabled}
			columnReorderGuide={columnReorderGuide}
			columnCount={uiColumns.length}
			columns={visibleColumns}
			editState={undefined}
			headerCellsEditable={!disabled}
			headerEditState={headerEditState}
			headerSpacerWidth={rowContentWidth}
			headerWidth={Math.max(totalWidth, viewportWidth)}
			resizeGuide={resizeGuide}
			rowHeaderWidth={TABLE_DESIGNER_ROW_HEADER_WIDTH}
			rows={visibleRows}
			scrollLeft={scrollState.scrollLeft}
			scrollRef={scrollElement.ref}
			selectedCellKeyMap={null}
			selectedCellState={null}
			sheetSurfaceHeight={Math.max(totalHeight, viewportHeight)}
			sheetSurfaceTop={0}
			showRowNumbers={false}
			stickyColumnEndLeft={stickyColumnEndLeft}
			stickyColumnCount={TABLE_DESIGNER_STICKY_COLUMN_COUNT}
		/>
	</div>;
});

TableDesigner.displayName = 'TableDesigner';

export default TableDesigner;
