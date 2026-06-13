import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { TableDesignColumn } from '../../ui/TableUI';

const TABLE_COLUMN_REORDER_DRAG_THRESHOLD = 5;
const TABLE_COLUMN_REORDER_OVERLAP_THRESHOLD = 0.35;

type TableColumnReorderMetric = {
	column: TableDesignColumn;
	columnIndex: number;
	height: number;
	left: number;
	width: number;
};

type TableColumnReorderState = {
	cleanupBodyStyle?: () => void;
	columnKey: string;
	height: number;
	latestClientX: number;
	latestToIndex: number;
	label: string;
	pointerId: number;
	startClientX: number;
	startIndex: number;
	startLeft: number;
	started: boolean;
	width: number;
};

export type TableColumnReorderDisplacements = Record<string, number>;

export type TableColumnReorderVisualState = {
	columnKey: string;
	dragOffset: number;
	displacements: TableColumnReorderDisplacements | null;
};

/**
 * Return the rendered header cell element for a column key.
 */
function getTableColumnHeaderCellElement(headerTableElement: HTMLDivElement, columnKey: string) {
	const headerCells = Array.from(headerTableElement.querySelectorAll<HTMLElement>('[data-table-column-key]'));

	return headerCells.find((cell) => cell.dataset.tableColumnKey === columnKey) || null;
}

/**
 * Return visible header metrics in table content coordinates.
 */
function getTableColumnReorderMetrics(headerTableElement: HTMLDivElement | null, columns: TableDesignColumn[]) {
	if (!headerTableElement) {
		return [];
	}

	const tableRect = headerTableElement.getBoundingClientRect();

	return columns.reduce((acc, column, columnIndex) => {
		const cellElement = getTableColumnHeaderCellElement(headerTableElement, column.key);

		if (!cellElement) {
			return acc;
		}

		const cellRect = cellElement.getBoundingClientRect();

		acc.push({
			column,
			columnIndex,
			height: cellRect.height,
			left: cellRect.left - tableRect.left,
			width: cellRect.width,
		});
		return acc;
	}, [] as TableColumnReorderMetric[]);
}

/**
 * Return true when two ordered column key lists are identical.
 */
function areColumnOrdersEqual(left: string[], right: string[]) {
	return left.length === right.length && left.every((columnKey, index) => columnKey === right[index]);
}

/**
 * Return true when two header displacement maps carry the same offsets.
 */
function areTableColumnReorderDisplacementsEqual(
	left: TableColumnReorderDisplacements | null | undefined,
	right: TableColumnReorderDisplacements | null | undefined,
) {
	if (!left || !right) {
		return left === right;
	}

	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);

	return leftKeys.length === rightKeys.length && leftKeys.every((columnKey) => left[columnKey] === right[columnKey]);
}

/**
 * Move one column key into a target visual index.
 */
export function moveTableColumnOrder(columnKeys: string[], columnKey: string, toIndex: number) {
	const fromIndex = columnKeys.indexOf(columnKey);

	if (fromIndex < 0) {
		return columnKeys;
	}

	const nextColumnKeys = [...columnKeys];
	const [columnKeyToMove] = nextColumnKeys.splice(fromIndex, 1);
	const safeToIndex = Math.min(nextColumnKeys.length, Math.max(0, toIndex));

	nextColumnKeys.splice(safeToIndex, 0, columnKeyToMove);
	return nextColumnKeys;
}

/**
 * Return the horizontal rectangle for a dragged header at one pointer position.
 */
function getTableColumnReorderDraggedRect(state: TableColumnReorderState, clientX: number) {
	const left = state.startLeft + clientX - state.startClientX;

	return {
		left,
		right: left + state.width,
	};
}

/**
 * Return the target index represented by the current drag pointer.
 */
function getTableColumnReorderTargetIndex(
	metrics: TableColumnReorderMetric[],
	state: TableColumnReorderState,
	clientX: number,
) {
	const draggedRect = getTableColumnReorderDraggedRect(state, clientX);
	const dragDelta = clientX - state.startClientX;
	let targetIndex = state.startIndex;

	if (dragDelta < 0) {
		for (let index = state.startIndex - 1; index >= 0; index -= 1) {
			const metric = metrics[index];
			if (!metric) {
				continue;
			}
			const metricRight = metric.left + metric.width;
			if (draggedRect.left < metricRight - metric.width * TABLE_COLUMN_REORDER_OVERLAP_THRESHOLD) {
				targetIndex = metric.columnIndex;
			}
		}

		return targetIndex;
	}

	if (dragDelta > 0) {
		for (let index = state.startIndex + 1; index < metrics.length; index += 1) {
			const metric = metrics[index];
			if (!metric) {
				continue;
			}
			if (draggedRect.right > metric.left + metric.width * TABLE_COLUMN_REORDER_OVERLAP_THRESHOLD) {
				targetIndex = metric.columnIndex;
			}
		}

		return targetIndex;
	}

	return targetIndex;
}

/**
 * Return transform offsets that make header cells slide aside during a column drag.
 */
function getTableColumnReorderHeaderDisplacements(
	metrics: TableColumnReorderMetric[],
	state: TableColumnReorderState,
	toIndex: number,
) {
	const columnKeys = metrics.map((metric) => metric.column.key);
	const nextColumnKeys = moveTableColumnOrder(columnKeys, state.columnKey, toIndex);

	if (areColumnOrdersEqual(columnKeys, nextColumnKeys)) {
		return null;
	}

	const metricsByKey = new Map(metrics.map((metric) => [metric.column.key, metric]));
	const currentLefts = new Map(metrics.map((metric) => [metric.column.key, metric.left]));
	const displacements: TableColumnReorderDisplacements = {};
	let nextLeft = 0;

	nextColumnKeys.forEach((columnKey) => {
		const metric = metricsByKey.get(columnKey);
		if (!metric) {
			return;
		}

		const currentLeft = currentLefts.get(columnKey);
		const displacement = currentLeft === undefined ? 0 : nextLeft - currentLeft;

		if (columnKey !== state.columnKey && displacement) {
			displacements[columnKey] = displacement;
		}

		nextLeft += metric.width;
	});

	return Object.keys(displacements).length ? displacements : null;
}

/**
 * Apply global cursor styles while a header column is being reordered.
 */
function lockTableColumnReorderCursor() {
	const previousCursor = document.body.style.cursor;
	const previousUserSelect = document.body.style.userSelect;

	document.body.style.cursor = 'grabbing';
	document.body.style.userSelect = 'none';

	return () => {
		document.body.style.cursor = previousCursor;
		document.body.style.userSelect = previousUserSelect;
	};
}

/**
 * Manage header pointer drag interactions for table column reordering.
 */
export function useTableColumnReorderController(p: {
	columns: TableDesignColumn[];
	enabled?: boolean;
	headerTableRef: RefObject<HTMLDivElement | null>;
	onColumnOrderCommit?: (columnOrder: string[]) => void;
}) {
	const { columns, enabled, headerTableRef, onColumnOrderCommit } = p;
	const frameRef = useRef<number | null>(null);
	const metricsRef = useRef<TableColumnReorderMetric[]>([]);
	const stateRef = useRef<TableColumnReorderState | null>(null);
	const [visualState, setVisualState] = useState<TableColumnReorderVisualState | null>(null);
	const canReorderColumns = Boolean(enabled && onColumnOrderCommit && columns.length > 1);

	/**
	 * Schedule the visible header displacement update.
	 */
	const scheduleVisualStateUpdate = useCallback(() => {
		const state = stateRef.current;
		const metrics = metricsRef.current;

		if (!state?.started || !metrics.length) {
			return;
		}

		if (frameRef.current !== null) {
			cancelAnimationFrame(frameRef.current);
		}

		frameRef.current = requestAnimationFrame(() => {
			const latestState = stateRef.current;
			const latestMetrics = metricsRef.current;

			frameRef.current = null;

			if (!latestState?.started || !latestMetrics.length) {
				return;
			}

			const nextDisplacements = getTableColumnReorderHeaderDisplacements(latestMetrics, latestState, latestState.latestToIndex);

			setVisualState((currentState) => {
				const stableDisplacements = areTableColumnReorderDisplacementsEqual(currentState?.displacements, nextDisplacements)
					? currentState?.displacements || null
					: nextDisplacements;
				const dragOffset = latestState.latestClientX - latestState.startClientX;
				const nextState = {
					columnKey: latestState.columnKey,
					dragOffset,
					displacements: stableDisplacements,
				};

				if (
					currentState?.columnKey === nextState.columnKey &&
					currentState?.dragOffset === nextState.dragOffset &&
					currentState?.displacements === nextState.displacements
				) {
					return currentState;
				}

				return nextState;
			});
		});
	}, []);

	/**
	 * Clear any active column reorder state and visual affordances.
	 */
	const clearColumnReorderState = useCallback(() => {
		if (frameRef.current !== null) {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}

		stateRef.current?.cleanupBodyStyle?.();
		stateRef.current = null;
		metricsRef.current = [];
		setVisualState(null);
	}, []);

	/**
	 * Finish the current column reorder interaction and commit the new order.
	 */
	const finishColumnReorder = useCallback((clientX?: number) => {
		const state = stateRef.current;
		const metrics = metricsRef.current;

		if (state?.started && metrics.length) {
			const latestClientX = Number.isFinite(clientX) ? Number(clientX) : state.latestClientX;
			const toIndex = getTableColumnReorderTargetIndex(metrics, state, latestClientX);
			const columnKeys = columns.map((column) => column.key);
			const nextColumnOrder = moveTableColumnOrder(columnKeys, state.columnKey, toIndex);

			if (!areColumnOrdersEqual(columnKeys, nextColumnOrder)) {
				onColumnOrderCommit?.(nextColumnOrder);
			}
		}

		clearColumnReorderState();
	}, [clearColumnReorderState, columns, onColumnOrderCommit]);

	/**
	 * Start tracking one header pointer as a potential reorder drag.
	 */
	const onColumnReorderPointerDown = useCallback((
		event: ReactPointerEvent<HTMLDivElement>,
		column: TableDesignColumn,
		columnIndex: number,
	) => {
		if (!canReorderColumns || event.button !== 0) {
			return;
		}

		const target = event.target as HTMLElement | null;
		if (target?.closest('[data-table-column-resize-handle]')) {
			return;
		}

		const metrics = getTableColumnReorderMetrics(headerTableRef.current, columns);
		const metric = metrics.find((item) => item.column.key === column.key);

		if (!metric) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		metricsRef.current = metrics;
		stateRef.current?.cleanupBodyStyle?.();
		stateRef.current = {
			columnKey: column.key,
			height: metric.height,
			latestClientX: event.clientX,
			latestToIndex: columnIndex,
			label: column.header?.text || column.key,
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startIndex: metric.columnIndex,
			startLeft: metric.left,
			started: false,
			width: metric.width,
		};
	}, [canReorderColumns, columns, headerTableRef]);

	/**
	 * Update the reorder target while the active pointer moves.
	 */
	const onColumnReorderPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		const state = stateRef.current;
		const metrics = metricsRef.current;

		if (!state || state.pointerId !== event.pointerId) {
			return;
		}

		if (event.buttons !== 1) {
			finishColumnReorder(event.clientX);
			return;
		}

		const distance = Math.abs(event.clientX - state.startClientX);

		if (!state.started && distance < TABLE_COLUMN_REORDER_DRAG_THRESHOLD) {
			return;
		}

		event.preventDefault();

		if (!state.started) {
			state.started = true;
			state.cleanupBodyStyle = lockTableColumnReorderCursor();

      // setTimeout(() => {
      //   debugger;
      // }, 1000);
		}

		state.latestClientX = event.clientX;
		state.latestToIndex = getTableColumnReorderTargetIndex(metrics, state, event.clientX);
		scheduleVisualStateUpdate();
	}, [finishColumnReorder, scheduleVisualStateUpdate]);

	/**
	 * Release pointer capture and commit the current reorder interaction.
	 */
	const onColumnReorderPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		finishColumnReorder(event.clientX);
	}, [finishColumnReorder]);

	/**
	 * Cancel pointer capture and discard the current reorder interaction.
	 */
	const onColumnReorderPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		clearColumnReorderState();
	}, [clearColumnReorderState]);

	/**
	 * Return pointer props for a reorderable header cell.
	 */
	const getHeaderCellReorderProps = useCallback((column: TableDesignColumn, columnIndex: number) => {
		if (!canReorderColumns) {
			return undefined;
		}

		return {
			'aria-grabbed': visualState?.columnKey === column.key ? true : undefined,
			className: 'cs_default_to_grabing',
			'data-table-column-before-reorder-source': columns[columnIndex + 1]?.key === visualState?.columnKey ? 'true' : undefined,
			'data-table-column-reorder-handle': column.key,
			onPointerCancel: onColumnReorderPointerCancel,
			onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => onColumnReorderPointerDown(event, column, columnIndex),
			onPointerMove: onColumnReorderPointerMove,
			onPointerUp: onColumnReorderPointerUp,
			style: {
				cursor: visualState?.columnKey === column.key ? 'grabbing' : 'grab',
				opacity: visualState?.columnKey === column.key ? 1 : undefined,
				transform: visualState?.columnKey === column.key
					? `translateX(${visualState.dragOffset}px)`
					: visualState?.displacements?.[column.key]
					? `translateX(${visualState.displacements[column.key]}px)`
					: undefined,
				transition: visualState && visualState.columnKey !== column.key
					? 'transform 120ms ease'
					: undefined,
				zIndex: visualState?.columnKey === column.key ? 7 : undefined,
			},
		};
	}, [
		canReorderColumns,
		onColumnReorderPointerCancel,
		onColumnReorderPointerDown,
		onColumnReorderPointerMove,
		onColumnReorderPointerUp,
		visualState?.columnKey,
		visualState?.dragOffset,
		visualState?.displacements,
	]);

	useEffect(() => {
		return () => {
			clearColumnReorderState();
		};
	}, [clearColumnReorderState]);

	return {
		getHeaderCellReorderProps,
		visualState,
	};
}
