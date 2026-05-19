import { useEditSheetCell } from '@jsb188/graphql/hooks/use-sheet-mtn';
import { useReactiveSheetRows, useSheetRows } from '@jsb188/graphql/hooks/use-sheet-qry';
import type {
  SheetCellGQL,
  SheetDesignCellGQL,
  SheetFieldTypeGQL,
  SheetGQL,
  SheetRowGQL,
} from '@jsb188/mday/types/sheet.d.ts';
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
  type SheetUIResizeGuide,
  type SheetUIRowSlot,
} from '@jsb188/react-web/ui/SheetUI';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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
}

type ElementSize = {
	height: number;
	width: number;
};

type SheetRowsState = {
	hasMoreRows: boolean;
	rowIds: string[];
	rowsById: Record<string, SheetRowGQL>;
	sheetId: string;
};

type SheetParsedEditorValue = {
	value: string | null;
	error?: string;
};

type SheetCellLookup = {
	cell?: SheetCellGQL | null;
	designCell: SheetDesignCellGQL;
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
	designCellsByKey: Map<string, SheetDesignCellGQL>;
	disabled?: boolean;
	editState?: SheetUIEditState | null;
	optimisticValues: Record<string, string | null>;
	openCell: (params: SheetOpenCellParams) => void;
	rowsById: Map<string, SheetRowGQL>;
	saveCellValue: (lookup: SheetCellLookup, value: string | null) => Promise<void>;
	sheet: SheetGQL;
	startColumnResize: (columnKey: string, clientX: number) => void;
};

type SheetResizeState = {
	columnKey: string;
	startClientX: number;
	startWidth: number;
};

/**
 * Constants
 */

const SHEET_ROWS_LIMIT = 200;
const SHEET_BUFFER_ROWS = 8;
const SHEET_BUFFER_COLUMNS = 3;
const SHEET_FETCH_BUFFER_ROWS = 12;
const SHEET_ROW_RIGHT_PADDING = 64;

/*
 * Build an empty row collection state for one sheet.
 */

function getInitialSheetRowsState(sheetId: string): SheetRowsState {
	return {
		hasMoreRows: true,
		rowIds: [],
		rowsById: {},
		sheetId,
	};
}

/*
 * Sort loaded sheet rows by visual position and then id.
 */

function sortSheetRowsByPosition(rows: SheetRowGQL[]) {
	return rows.slice(0).sort((a, b) => {
		if (a.position !== b.position) {
			return a.position - b.position;
		}

		return a.id.localeCompare(b.id);
	});
}

/*
 * Return a stable comparison key for one sheet cell payload.
 */

function getSheetCellStateKey(cell: SheetCellGQL) {
	return [
		cell.id,
		cell.cellKey,
		cell.value ?? '',
		cell.textValue ?? '',
		cell.numberValue ?? '',
		cell.booleanValue === undefined || cell.booleanValue === null ? '' : String(cell.booleanValue),
		cell.dateValue ?? '',
		cell.datetimeValue ?? '',
		cell.updatedAt ?? '',
	].join('\u0000');
}

/*
 * Return whether two row payloads contain the same rendered sheet data.
 */

function areSheetRowsEquivalent(a?: SheetRowGQL, b?: SheetRowGQL) {
	if (a === b) {
		return true;
	}

	if (!a || !b) {
		return false;
	}

	if (
		a.id !== b.id ||
		a.position !== b.position ||
		a.cursor !== b.cursor ||
		a.updatedAt !== b.updatedAt ||
		(a.cells?.length || 0) !== (b.cells?.length || 0)
	) {
		return false;
	}

	const aCells = (a.cells || []).map(getSheetCellStateKey).sort();
	const bCells = (b.cells || []).map(getSheetCellStateKey).sort();

	return aCells.every((cellKey, index) => cellKey === bCells[index]);
}

/*
 * Return whether two ordered row id collections have the same contents.
 */

function areSheetRowIdsEqual(a: string[], b: string[]) {
	return a.length === b.length && a.every((rowId, index) => rowId === b[index]);
}

/*
 * Merge one fetched page of rows into the loaded row collection.
 */

function mergeSheetRowsState(
	currentState: SheetRowsState,
	sheetId: string,
	rows: SheetRowGQL[],
	limit: number,
): SheetRowsState {
	const baseState = currentState.sheetId === sheetId ? currentState : getInitialSheetRowsState(sheetId);
	const rowsById = { ...baseState.rowsById };

	rows.forEach((row) => {
		rowsById[row.id] = row;
	});

	const rowIds = sortSheetRowsByPosition(Object.values(rowsById)).map((row) => row.id);
	const hasMoreRows = rows.length < limit ? false : baseState.hasMoreRows;

	if (
		currentState.sheetId === sheetId &&
		currentState.hasMoreRows === hasMoreRows &&
		areSheetRowIdsEqual(currentState.rowIds, rowIds) &&
		rowIds.every((rowId) => areSheetRowsEquivalent(currentState.rowsById[rowId], rowsById[rowId]))
	) {
		return currentState;
	}

	return {
		hasMoreRows,
		rowIds,
		rowsById,
		sheetId,
	};
}

/*
 * Return ordered design cells from immutable sheet design configuration.
 */

export function getOrderedSheetDesignCells(sheet: SheetGQL): SheetDesignCellGQL[] {
	const cells = sheet.design?.cells || [];
	const cellsByKey = new Map(cells.map((cell) => [cell.key, cell]));
	const orderedCells = (sheet.design?.cellsOrder || [])
		.map((key) => cellsByKey.get(key))
		.filter(Boolean) as SheetDesignCellGQL[];
	const orderedKeys = new Set(orderedCells.map((cell) => cell.key));
	const remainingCells = cells.filter((cell) => !orderedKeys.has(cell.key));

	return orderedCells.concat(remainingCells);
}

/*
 * Keep the current size of one DOM element in React state.
 */

function useElementSize<T extends HTMLElement>() {
	const [node, setNode] = useState<T | null>(null);
	const [size, setSize] = useState<ElementSize>({
		height: 0,
		width: 0,
	});
	const ref = useCallback((nextNode: T | null) => {
		setNode(nextNode);
	}, []);

	useEffect(() => {
		if (!node) {
			return;
		}

		const updateSize = () => {
			setSize((currentSize) => {
				const nextSize = {
					height: node.clientHeight || 0,
					width: node.clientWidth || 0,
				};

				if (currentSize.height === nextSize.height && currentSize.width === nextSize.width) {
					return currentSize;
				}

				return nextSize;
			});
		};

		updateSize();

		if (typeof ResizeObserver === 'undefined') {
			return;
		}

		const observer = new ResizeObserver(updateSize);
		observer.observe(node);

		return () => {
			observer.disconnect();
		};
	}, [node]);

	return {
		node,
		ref,
		size,
	};
}

/*
 * Convert a GraphQL design cell into an app-agnostic UI column.
 */

function getSheetUIColumn(designCell: SheetDesignCellGQL): SheetUIColumn {
	return {
		id: designCell.key,
		key: designCell.key,
		label: designCell.label || designCell.key,
		fieldType: designCell.fieldType as SheetUIFieldType,
		options: designCell.options || [],
		openLink: designCell.openLink,
		humansCannotEdit: designCell.humansCannotEdit,
	};
}

/*
 * Parse one persisted sheet cell string into a displayable JavaScript value.
 */

function parseSheetRawValue(value?: string | null) {
	if (value === undefined || value === null || value === '') {
		return null;
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

	if (designCell.fieldType === 'NUMBER' && cell.numberValue !== undefined && cell.numberValue !== null) {
		return String(cell.numberValue);
	}

	if (designCell.fieldType === 'BOOLEAN' && cell.booleanValue !== undefined && cell.booleanValue !== null) {
		return cell.booleanValue ? 'true' : 'false';
	}

	if (designCell.fieldType === 'DATE' && cell.dateValue) {
		return cell.dateValue;
	}

	if (designCell.fieldType === 'DATETIME' && cell.datetimeValue) {
		return cell.datetimeValue;
	}

	return cell.value ?? cell.textValue ?? null;
}

/*
 * Find the sheet cell for one design column on a row.
 */

function getSheetCellForDesign(row: SheetRowGQL, designCell: SheetDesignCellGQL) {
	return row.cells?.find((cell) => cell.cellKey === designCell.key) || null;
}

/*
 * Find the label for a select value from one design cell.
 */

function getSheetOptionLabel(designCell: SheetDesignCellGQL, value: string) {
	return designCell.options?.find((option) => option.value === value)?.label || value;
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

	if (designCell.fieldType === 'SELECT' && typeof rawValue === 'string') {
		return getSheetOptionLabel(designCell, rawValue);
	}

	if (designCell.fieldType === 'MULTI_SELECT') {
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
 * Convert one cell value into an editable draft string.
 */

function getSheetEditorDraftValue(
	cell: SheetCellGQL | null | undefined,
	designCell: SheetDesignCellGQL,
	optimisticValue?: string | null,
) {
	const serializedValue = getSheetCellSerializedValue(cell, designCell, optimisticValue);
	const rawValue = parseSheetRawValue(serializedValue);

	if (designCell.fieldType === 'MULTI_SELECT' && Array.isArray(rawValue)) {
		return rawValue.map((value) => String(value)).join(', ');
	}

	if (designCell.fieldType === 'DATETIME' && typeof rawValue === 'string') {
		return rawValue.slice(0, 16);
	}

	return stringifySheetDisplayValue(rawValue);
}

/*
 * Parse the current editor draft into the serialized value stored by GraphQL.
 */

export function parseSheetEditorValue(fieldType: SheetFieldTypeGQL, draftValue: string): SheetParsedEditorValue {
	const value = draftValue.trim();

	if (!value) {
		return { value: null };
	}

	if (fieldType === 'NUMBER') {
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

	if (fieldType === 'MULTI_SELECT') {
		if (value.startsWith('[')) {
			try {
				const parsedValue = JSON.parse(value);

				if (!Array.isArray(parsedValue)) {
					return {
						error: 'Invalid list',
						value: null,
					};
				}

				return { value: JSON.stringify(parsedValue.map((item) => String(item))) };
			} catch {
				return {
					error: 'Invalid list',
					value: null,
				};
			}
		}

		return {
			value: JSON.stringify(value.split(',').map((item) => item.trim()).filter(Boolean)),
		};
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
		cell: getSheetCellForDesign(row, designCell),
		designCell,
		row,
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
		bufferColumns = SHEET_BUFFER_COLUMNS,
		bufferRows = SHEET_BUFFER_ROWS,
		children,
		className,
		disabled,
		limit = SHEET_ROWS_LIMIT,
		sheet,
	} = p;
	const sheetId = sheet.id;
	const organizationId = sheet.organizationId;
	const scrollElement = useElementSize<HTMLDivElement>();
	const fetchingMoreRef = useRef(false);
	const runtimeRef = useRef<SheetRuntimeState | null>(null);
	const resizeStateRef = useRef<SheetResizeState | null>(null);
	const resizeFrameRef = useRef<number | null>(null);
	const resizeCleanupRef = useRef<(() => void) | null>(null);
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
	const [editState, setEditState] = useState<SheetUIEditState | null>(null);
	const [columnWidths, setColumnWidths] = useState<SheetColumnWidths>({});
	const [hoveredResizeColumnKey, setHoveredResizeColumnKey] = useState<string | null>(null);
	const [optimisticValues, setOptimisticValues] = useState<Record<string, string | null>>({});
	const [resizingColumnKey, setResizingColumnKey] = useState<string | null>(null);
	const [rowState, setRowState] = useState<SheetRowsState>(() => getInitialSheetRowsState(sheetId));
	const [scrollState, setScrollState] = useState({
		scrollLeft: 0,
		scrollTop: 0,
	});
	const {
		sheetRows,
		fetchMore,
	} = useSheetRows(sheetId, organizationId, null, limit);
	const { editSheetCell } = useEditSheetCell();

	const columns = useMemo(() => {
		return getOrderedSheetDesignCells(sheet);
	}, [sheet]);
	const uiColumns = useMemo(() => {
		return columns.map(getSheetUIColumn);
	}, [columns]);
	const columnMetricsData = useMemo(() => {
		return getSheetColumnMetrics(uiColumns, columnWidths);
	}, [columnWidths, uiColumns]);
	const columnMetricsByKey = useMemo(() => {
		return new Map(columnMetricsData.metrics.map((metric) => [metric.column.key, metric]));
	}, [columnMetricsData.metrics]);
	const designCellsByKey = useMemo(() => {
		return new Map(columns.map((cell) => [cell.key, cell]));
	}, [columns]);

	useEffect(() => {
		setColumnWidths({});
		setEditState(null);
		setOptimisticValues({});
		setRowState(getInitialSheetRowsState(sheetId));
		setScrollState({
			scrollLeft: 0,
			scrollTop: 0,
		});
		cellUICacheRef.current.clear();
	}, [sheetId]);

	useEffect(() => {
		if (Array.isArray(sheetRows)) {
			setRowState((currentState) => mergeSheetRowsState(currentState, sheetId, sheetRows as SheetRowGQL[], limit));
		}
	}, [limit, sheetId, sheetRows]);

	const rows = useMemo(() => {
		return rowState.rowIds.map((rowId) => rowState.rowsById[rowId]).filter(Boolean);
	}, [rowState.rowIds, rowState.rowsById]);
	const reactiveRows = useReactiveSheetRows(rows) as SheetRowGQL[] | null;
	const renderedRows = reactiveRows || rows;
	const rowsById = useMemo(() => {
		return new Map(renderedRows.map((row) => [row.id, row]));
	}, [renderedRows]);
	const saveCellValue = useCallback(async (lookup: SheetCellLookup, value: string | null) => {
		await editSheetCell({
			variables: {
				organizationId,
				sheetId,
				sheetRowId: lookup.row.id,
				cellKey: lookup.designCell.key,
				value,
			},
		});

		setOptimisticValues((currentValues) => ({
			...currentValues,
			[getSheetCellKey(lookup.row.id, lookup.designCell.key)]: value,
		}));
	}, [editSheetCell, organizationId, sheetId]);
	const fetchMoreRows = useCallback(async () => {
		if (fetchingMoreRef.current || !rowState.hasMoreRows || !renderedRows.length) {
			return;
		}

		const lastRow = renderedRows[renderedRows.length - 1];
		if (!lastRow?.cursor) {
			return;
		}

		fetchingMoreRef.current = true;

		try {
			const result = await fetchMore({
				variables: {
					sheetId,
					organizationId,
					cursor: lastRow.cursor,
					limit,
				},
			});
			const nextRows = result?.data?.sheetRows || result?.sheetRows || [];

			if (Array.isArray(nextRows)) {
				setRowState((currentState) => mergeSheetRowsState(currentState, sheetId, nextRows as SheetRowGQL[], limit));
			}
		} finally {
			fetchingMoreRef.current = false;
		}
	}, [fetchMore, limit, organizationId, renderedRows, rowState.hasMoreRows, sheetId]);
	const startColumnResize = useCallback((columnKey: string, clientX: number) => {
		const metric = runtimeRef.current?.columnMetricsByKey.get(columnKey);

		if (!metric) {
			return;
		}

		resizeCleanupRef.current?.();
		resizeStateRef.current = {
			columnKey,
			startClientX: clientX,
			startWidth: metric.width,
		};
		setHoveredResizeColumnKey(null);
		setResizingColumnKey(columnKey);

		const finishResize = () => {
			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
				resizeFrameRef.current = null;
			}

			resizeStateRef.current = null;
			resizeCleanupRef.current?.();
			resizeCleanupRef.current = null;
			setHoveredResizeColumnKey(null);
			setResizingColumnKey(null);
		};
		const onPointerMove = (event: PointerEvent) => {
			if (event.buttons !== 1) {
				finishResize();
				return;
			}

			const resizeState = resizeStateRef.current;
			if (!resizeState) {
				return;
			}

			const nextWidth = clampSheetColumnWidth(resizeState.startWidth + event.clientX - resizeState.startClientX);

			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
			}

			resizeFrameRef.current = requestAnimationFrame(() => {
				resizeFrameRef.current = null;
				setColumnWidths((currentWidths) => {
					if ((currentWidths[resizeState.columnKey] || metric.width) === nextWidth) {
						return currentWidths;
					}

					return {
						...currentWidths,
						[resizeState.columnKey]: nextWidth,
					};
				});
			});
		};
		const onPointerUp = () => {
			finishResize();
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
	}, []);
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
		const parsedValue = parseSheetEditorValue(lookup.designCell.fieldType, draftValue);

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

		setEditState(null);

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
		disabled,
		editState,
		optimisticValues,
		openCell: openSheetCellLink,
		rowsById,
		saveCellValue,
		sheet,
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
			const cellElement = getClosestSheetElement(event.target, '[data-sheet-cell="true"]');
			const runtime = runtimeRef.current;

			if (!cellElement || !runtime || cellElement.dataset.sheetCellOpenLink !== 'true') {
				return;
			}

			const lookup = getSheetCellLookup(runtime, cellElement.dataset.rowId, cellElement.dataset.cellKey);

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
			const cellElement = getClosestSheetElement(event.target, '[data-sheet-cell="true"]');
			const runtime = runtimeRef.current;

			if (!cellElement || !runtime || runtime.disabled || cellElement.dataset.sheetCellEditable !== 'true') {
				return;
			}

			const lookup = getSheetCellLookup(runtime, cellElement.dataset.rowId, cellElement.dataset.cellKey);

			if (!lookup || runtime.sheet.design?.humansCannotEdit || lookup.designCell.humansCannotEdit) {
				return;
			}

			const optimisticKey = getSheetCellKey(lookup.row.id, lookup.designCell.key);
			setEditState({
				cellKey: lookup.designCell.key,
				draftValue: getSheetEditorDraftValue(
					lookup.cell,
					lookup.designCell,
					runtime.optimisticValues[optimisticKey],
				),
				rowId: lookup.row.id,
			});
		};
		const onFocusOut = (event: FocusEvent) => {
			const editorElement = getClosestSheetElement(event.target, '[data-sheet-editor="true"]');

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
			const editorElement = getClosestSheetElement(event.target, '[data-sheet-editor="true"]');

			if (!editorElement) {
				return;
			}

			if (event.key === 'Escape') {
				event.preventDefault();
				setEditState(null);
				return;
			}

			if (event.key === 'Enter' && editorElement.dataset.fieldType !== 'JSON' && !event.shiftKey) {
				event.preventDefault();
				void commitEditorElement(editorElement);
			}
		};
		const onPointerOver = (event: PointerEvent) => {
			const handleElement = getClosestSheetElement(event.target, '[data-sheet-column-resize-handle]');

			if (handleElement && !resizeStateRef.current) {
				setHoveredResizeColumnKey(handleElement.dataset.sheetColumnResizeHandle || null);
			}
		};
		const onPointerOut = (event: PointerEvent) => {
			const handleElement = getClosestSheetElement(event.target, '[data-sheet-column-resize-handle]');

			if (
				handleElement &&
				event.relatedTarget instanceof Node &&
				handleElement.contains(event.relatedTarget)
			) {
				return;
			}

			if (handleElement && !resizeStateRef.current) {
				setHoveredResizeColumnKey(null);
			}
		};
		const onPointerDown = (event: PointerEvent) => {
			const handleElement = getClosestSheetElement(event.target, '[data-sheet-column-resize-handle]');
			const runtime = runtimeRef.current;

			if (!handleElement || !runtime) {
				return;
			}

			if (event.button !== 0) {
				setHoveredResizeColumnKey(null);
				return;
			}

			const columnKey = handleElement.dataset.sheetColumnResizeHandle;

			if (!columnKey) {
				return;
			}

			event.preventDefault();
			runtime.startColumnResize(columnKey, event.clientX);
		};
		const onContextMenu = (event: MouseEvent) => {
			const handleElement = getClosestSheetElement(event.target, '[data-sheet-column-resize-handle]');

			if (handleElement) {
				setHoveredResizeColumnKey(null);

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
		scrollNode.addEventListener('pointerover', onPointerOver);
		scrollNode.addEventListener('pointerout', onPointerOut);
		scrollNode.addEventListener('pointerdown', onPointerDown);
		scrollNode.addEventListener('contextmenu', onContextMenu);

		return () => {
			scrollNode.removeEventListener('scroll', onScroll);
			scrollNode.removeEventListener('click', onClick);
			scrollNode.removeEventListener('dblclick', onDoubleClick);
			scrollNode.removeEventListener('focusout', onFocusOut);
			scrollNode.removeEventListener('input', onInput);
			scrollNode.removeEventListener('keydown', onKeyDown);
			scrollNode.removeEventListener('pointerover', onPointerOver);
			scrollNode.removeEventListener('pointerout', onPointerOut);
			scrollNode.removeEventListener('pointerdown', onPointerDown);
			scrollNode.removeEventListener('contextmenu', onContextMenu);

			if (scrollFrameRef.current !== null) {
				cancelAnimationFrame(scrollFrameRef.current);
				scrollFrameRef.current = null;
			}
		};
	}, [commitEditorElement, scrollElement.node]);

	useEffect(() => {
		return () => {
			resizeCleanupRef.current?.();

			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
			}
		};
	}, []);

	const stickyColumnCount = sheet.design?.stickyLeft || 0;
	const stickyHeaderHeight = SHEET_HEADER_HEIGHT + SHEET_STICKY_SPACER_SIZE;
	const viewportHeight = scrollElement.size.height || stickyHeaderHeight + SHEET_ROW_HEIGHT * 20;
	const viewportWidth = scrollElement.size.width || SHEET_ROW_NUMBER_WIDTH + 5 * SHEET_COLUMN_WIDTH;
	const visualRowCount = Math.max(
		renderedRows.length,
		getSheetMinimumRowCount(viewportHeight, stickyHeaderHeight),
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
	const totalHeight = stickyHeaderHeight + visualRowCount * SHEET_ROW_HEIGHT;
	const sheetSurfaceHeight = Math.max(
		stickyHeaderHeight + visualRowCount * SHEET_ROW_HEIGHT,
		viewportHeight,
	);
	const sheetSurfaceTop = 0;
	const columnOffsetsWithStickySpacer = useMemo(() => {
		return columnMetricsData.offsets.map((offset, index) => {
			return index > stickyColumnCount ? offset + SHEET_STICKY_SPACER_SIZE : offset;
		});
	}, [columnMetricsData.offsets, stickyColumnCount]);

	useEffect(() => {
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
		return columnMetricsData.metrics
			.slice(visibleRange.columnStart, visibleRange.columnEnd)
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
			const rowCellMap = new Map((row?.cells || []).map((cell) => [cell.cellKey, cell]));
			const cellsByKey: Record<string, SheetUICell | undefined> = {};

			if (row) {
				visibleColumns.forEach((columnMetric) => {
					const designCell = designCellsByKey.get(columnMetric.column.key);

					if (!designCell) {
						return;
					}

					const cell = rowCellMap.get(designCell.key);
					const optimisticKey = getSheetCellKey(row.id, designCell.key);
					const optimisticValue = optimisticValues[optimisticKey];
					const displayValue = getSheetCellDisplayValue(cell, designCell, optimisticValue);
					const draftValue = getSheetEditorDraftValue(cell, designCell, optimisticValue);
					const canEdit = !disabled && !sheet.design?.humansCannotEdit && !designCell.humansCannotEdit;
					const canOpen = Boolean(designCell.openLink);
					const signature = [
						displayValue,
						draftValue,
						canEdit ? '1' : '0',
						canOpen ? '1' : '0',
					].join('\u0000');
					const cachedCell = cellUICacheRef.current.get(optimisticKey);

					if (cachedCell?.signature === signature) {
						cellsByKey[designCell.key] = cachedCell.cell;
						return;
					}

					const uiCell: SheetUICell = {
						cellKey: designCell.key,
						displayValue,
						draftValue,
						canEdit,
						canOpen,
					};

					cellUICacheRef.current.set(optimisticKey, {
						cell: uiCell,
						signature,
					});
					cellsByKey[designCell.key] = uiCell;
				});
			}

			visibleRowSlots.push({
				cellsByKey,
				rowId: row?.id || null,
				rowIndex,
				rowKey: row?.id || `empty-${rowIndex}`,
				rowNumber: rowIndex + 1,
				rowTop: stickyHeaderHeight + rowIndex * SHEET_ROW_HEIGHT,
				rowWidth,
			});
		}

		return visibleRowSlots;
	}, [
		designCellsByKey,
		disabled,
		optimisticValues,
		renderedRows,
		sheet.design?.humansCannotEdit,
		stickyHeaderHeight,
		totalWidth,
		viewportWidth,
		visibleColumns,
		visibleRange.rowEnd,
		visibleRange.rowStart,
	]);
	const highlightedResizeColumnKey = resizingColumnKey || hoveredResizeColumnKey;
	const resizeGuide = useMemo<SheetUIResizeGuide | null>(() => {
		if (!highlightedResizeColumnKey) {
			return null;
		}

		const metric = columnMetricsByKey.get(highlightedResizeColumnKey);

		if (!metric) {
			return null;
		}

		const isStickyLeft = metric.columnIndex < (sheet.design?.stickyLeft || 0);

		return {
			columnKey: highlightedResizeColumnKey,
			height: sheetSurfaceHeight,
			left: (isStickyLeft ? scrollState.scrollLeft : 0) +
				SHEET_ROW_NUMBER_WIDTH +
				metric.left +
				(metric.columnIndex < stickyColumnCount ? 0 : SHEET_STICKY_SPACER_SIZE) +
				metric.width -
				1,
		};
	}, [
		columnMetricsByKey,
		highlightedResizeColumnKey,
		scrollState.scrollLeft,
		stickyColumnCount,
		sheetSurfaceHeight,
	]);

	return <SheetUI
		canvasHeight={Math.max(totalHeight, viewportHeight)}
		canvasWidth={Math.max(totalWidth, viewportWidth)}
		cellCount={visualRowCount * uiColumns.length}
		className={className}
		columnCount={uiColumns.length}
		columns={visibleColumns}
		editState={editState}
		headerContent={children}
		headerSpacerWidth={rowContentWidth}
		headerWidth={Math.max(totalWidth, viewportWidth)}
		resizeGuide={resizeGuide}
		rows={visibleRows}
		scrollLeft={scrollState.scrollLeft}
		scrollRef={scrollElement.ref}
		sheetSurfaceHeight={sheetSurfaceHeight}
		sheetSurfaceTop={sheetSurfaceTop}
		stickyColumnEndLeft={stickyColumnEndLeft}
		stickyColumnCount={stickyColumnCount}
	/>;
}

export default Sheet;
