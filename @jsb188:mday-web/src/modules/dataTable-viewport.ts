import type { DataTableRowGQL } from '@jsb188/mday/types/dataTable.d.ts';
import {
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	type SheetColumnMetric,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import type { DataTableArrowNavigationDirection } from './DataTable-ContextMenu.tsx';

export type DataTableArrowNavigationRuntime = {
	columnMetrics: SheetColumnMetric[];
	renderedRows: DataTableRowGQL[];
	scrollLeft: number;
	scrollNode: HTMLDivElement | null;
	scrollTop: number;
	stickyColumnCount: number;
	stickyColumnEndLeft: number;
	stickyHeaderHeight: number;
	totalHeight: number;
	totalWidth: number;
	viewportHeight: number;
	viewportWidth: number;
};

/*
 * Return the next selected dataTable cell after one arrow-key movement.
 */

export function getDataTableArrowNavigationSelection(params: {
	columnMetrics: SheetColumnMetric[];
	direction: DataTableArrowNavigationDirection;
	renderedRows: DataTableRowGQL[];
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const { columnMetrics, direction, renderedRows, selectedCellState } = params;

	if (!columnMetrics.length || !renderedRows.length) {
		return null;
	}

	const currentColumnIndex = selectedCellState ? columnMetrics.findIndex((metric) => metric.column.key === selectedCellState.cellKey) : -1;
	const currentRowIndex = selectedCellState ? renderedRows.findIndex((row) => row.id === selectedCellState.rowId) : -1;

	if (currentColumnIndex < 0 || currentRowIndex < 0) {
		return {
			cellKey: columnMetrics[0].column.key,
			rowId: renderedRows[0].id,
		};
	}

	let nextColumnIndex = currentColumnIndex;
	let nextRowIndex = currentRowIndex;

	switch (direction) {
		case 'left':
			nextColumnIndex = Math.max(0, currentColumnIndex - 1);
			break;
		case 'right':
			nextColumnIndex = Math.min(columnMetrics.length - 1, currentColumnIndex + 1);
			break;
		case 'up':
			nextRowIndex = Math.max(0, currentRowIndex - 1);
			break;
		case 'down':
			nextRowIndex = Math.min(renderedRows.length - 1, currentRowIndex + 1);
			break;
		default:
	}

	const nextColumn = columnMetrics[nextColumnIndex];
	const nextRow = renderedRows[nextRowIndex];

	if (!nextColumn || !nextRow) {
		return null;
	}

	return {
		cellKey: nextColumn.column.key,
		rowId: nextRow.id,
	};
}

/*
 * Keep a dataTable scroll position inside the current canvas bounds.
 */

function clampDataTableScrollPosition(value: number, maxValue: number) {
	return Math.min(Math.max(0, value), Math.max(0, maxValue));
}

/*
 * Return the scroll position needed to keep one selected dataTable cell in view.
 */

export function getDataTableArrowNavigationScrollState(params: { columnMetric: SheetColumnMetric; rowIndex: number; runtime: DataTableArrowNavigationRuntime }) {
	const { columnMetric, rowIndex, runtime } = params;
	let nextScrollLeft = runtime.scrollLeft;
	let nextScrollTop = runtime.scrollTop;
	const cellTop = runtime.stickyHeaderHeight + rowIndex * SHEET_ROW_HEIGHT;
	const cellBottom = cellTop + SHEET_ROW_HEIGHT;
	const visibleTop = runtime.scrollTop + runtime.stickyHeaderHeight;
	const visibleBottom = runtime.scrollTop + runtime.viewportHeight;

	if (cellTop < visibleTop) {
		nextScrollTop = cellTop - runtime.stickyHeaderHeight;
	} else if (cellBottom > visibleBottom) {
		nextScrollTop = cellBottom - runtime.viewportHeight;
	}

	if (columnMetric.columnIndex >= runtime.stickyColumnCount) {
		const cellLeft = SHEET_ROW_NUMBER_WIDTH + columnMetric.left + SHEET_STICKY_SPACER_SIZE;
		const cellRight = cellLeft + columnMetric.width;
		const visibleLeft = runtime.scrollLeft + runtime.stickyColumnEndLeft;
		const visibleRight = runtime.scrollLeft + runtime.viewportWidth;

		if (cellLeft < visibleLeft) {
			nextScrollLeft = cellLeft - runtime.stickyColumnEndLeft;
		} else if (cellRight > visibleRight) {
			nextScrollLeft = cellRight - runtime.viewportWidth;
		}
	}

	return {
		scrollLeft: clampDataTableScrollPosition(nextScrollLeft, runtime.totalWidth - runtime.viewportWidth),
		scrollTop: clampDataTableScrollPosition(nextScrollTop, runtime.totalHeight - runtime.viewportHeight),
	};
}
