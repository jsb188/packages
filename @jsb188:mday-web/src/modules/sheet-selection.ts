import {
	getSheetCellKey,
	SHEET_ROW_NUMBER_WIDTH,
	type SheetColumnMetric,
	type SheetUISelectedCellKeyMap,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import type { SheetGridArrowDirection } from './sheet-grid-keyboard.ts';

export type SheetGridSelectionBoxPosition = {
	height: number;
	left: number;
	top: number;
	width: number;
};

export type SheetGridSelectionBoxRowMetric = {
	height: number;
	rowKey: string;
	top: number;
};

export type SheetGridCellRangeSelection = {
	activeCell: SheetUISelectedCellState;
	anchorCell: SheetUISelectedCellState;
	rangeEndCell: SheetUISelectedCellState;
	selectedCellKeyMap: SheetUISelectedCellKeyMap;
};

/*
 * Build a selected-cell key map from already-ordered coordinate cells.
 */

export function getSheetSelectedCellKeyMapFromCells(cells: SheetUISelectedCellState[]) {
	const selectedCellKeyMap: SheetUISelectedCellKeyMap = {};

	cells.forEach((cell) => {
		selectedCellKeyMap[getSheetCellKey(cell.rowId, cell.cellKey)] = true;
	});

	return selectedCellKeyMap;
}

/*
 * Build a rectangular selected-cell key map from ordered row and column metrics.
 */

export function getSheetSelectedCellKeyMapForGridRange(params: {
	activeCell: SheetUISelectedCellState;
	anchorCell: SheetUISelectedCellState;
	columnMetrics: SheetColumnMetric[];
	rowIds: string[];
}) {
	const activeColumnIndex = params.columnMetrics.findIndex((metric) => metric.column.key === params.activeCell.cellKey);
	const anchorColumnIndex = params.columnMetrics.findIndex((metric) => metric.column.key === params.anchorCell.cellKey);
	const activeRowIndex = params.rowIds.indexOf(params.activeCell.rowId);
	const anchorRowIndex = params.rowIds.indexOf(params.anchorCell.rowId);

	if (activeColumnIndex < 0 || anchorColumnIndex < 0 || activeRowIndex < 0 || anchorRowIndex < 0) {
		return getSheetSelectedCellKeyMapFromCells([params.activeCell]);
	}

	const columnStart = Math.min(activeColumnIndex, anchorColumnIndex);
	const columnEnd = Math.max(activeColumnIndex, anchorColumnIndex);
	const rowStart = Math.min(activeRowIndex, anchorRowIndex);
	const rowEnd = Math.max(activeRowIndex, anchorRowIndex);
	const selectedCellKeyMap: SheetUISelectedCellKeyMap = {};

	for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
		const rowId = params.rowIds[rowIndex];
		if (!rowId) {
			continue;
		}

		for (let columnIndex = columnStart; columnIndex <= columnEnd; columnIndex += 1) {
			const column = params.columnMetrics[columnIndex]?.column;
			if (column) {
				selectedCellKeyMap[getSheetCellKey(rowId, column.key)] = true;
			}
		}
	}

	return selectedCellKeyMap;
}

/*
 * Build the full rectangular selection state for a generic sheet-like grid.
 */

export function getSheetGridRangeSelection(params: {
	activeCell: SheetUISelectedCellState;
	anchorCell: SheetUISelectedCellState;
	columnMetrics: SheetColumnMetric[];
	rowIds: string[];
	selectedActiveCell?: SheetUISelectedCellState;
}): SheetGridCellRangeSelection {
	return {
		activeCell: params.selectedActiveCell || params.anchorCell,
		anchorCell: params.anchorCell,
		rangeEndCell: params.activeCell,
		selectedCellKeyMap: getSheetSelectedCellKeyMapForGridRange({
			activeCell: params.activeCell,
			anchorCell: params.anchorCell,
			columnMetrics: params.columnMetrics,
			rowIds: params.rowIds,
		}),
	};
}

/*
 * Return the next selected sheet-like grid cell after one arrow-key movement.
 */

export function getSheetGridArrowNavigationSelection(params: {
	columnMetrics: SheetColumnMetric[];
	direction: SheetGridArrowDirection;
	rowIds: string[];
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const { columnMetrics, direction, rowIds, selectedCellState } = params;

	if (!columnMetrics.length || !rowIds.length) {
		return null;
	}

	const currentColumnIndex = selectedCellState ? columnMetrics.findIndex((metric) => metric.column.key === selectedCellState.cellKey) : -1;
	const currentRowIndex = selectedCellState ? rowIds.indexOf(selectedCellState.rowId) : -1;

	if (currentColumnIndex < 0 || currentRowIndex < 0) {
		return {
			cellKey: columnMetrics[0].column.key,
			rowId: rowIds[0],
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
			nextRowIndex = Math.min(rowIds.length - 1, currentRowIndex + 1);
			break;
		default:
	}

	const nextColumn = columnMetrics[nextColumnIndex];
	const nextRowId = rowIds[nextRowIndex];

	if (!nextColumn || !nextRowId) {
		return null;
	}

	return {
		cellKey: nextColumn.column.key,
		rowId: nextRowId,
	};
}

/*
 * Return the stable anchor corner for an existing rectangular grid selection.
 */

export function getSheetGridSelectionAnchorCell(params: {
	activeCell?: SheetUISelectedCellState | null;
	columnMetrics: SheetColumnMetric[];
	rowIds: string[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
}) {
	const { activeCell, columnMetrics, rowIds, selectedCellKeyMap } = params;

	if (!activeCell || !selectedCellKeyMap || Object.keys(selectedCellKeyMap).length <= 1) {
		return activeCell || null;
	}

	let minColumnIndex = Infinity;
	let maxColumnIndex = -Infinity;
	let minRowIndex = Infinity;
	let maxRowIndex = -Infinity;

	rowIds.forEach((rowId, rowIndex) => {
		columnMetrics.forEach((metric, columnIndex) => {
			if (!selectedCellKeyMap[getSheetCellKey(rowId, metric.column.key)]) {
				return;
			}

			minColumnIndex = Math.min(minColumnIndex, columnIndex);
			maxColumnIndex = Math.max(maxColumnIndex, columnIndex);
			minRowIndex = Math.min(minRowIndex, rowIndex);
			maxRowIndex = Math.max(maxRowIndex, rowIndex);
		});
	});

	const activeColumnIndex = columnMetrics.findIndex((metric) => metric.column.key === activeCell.cellKey);
	const activeRowIndex = rowIds.indexOf(activeCell.rowId);

	if (
		activeColumnIndex < 0 ||
		activeRowIndex < 0 ||
		!Number.isFinite(minColumnIndex) ||
		!Number.isFinite(maxColumnIndex) ||
		!Number.isFinite(minRowIndex) ||
		!Number.isFinite(maxRowIndex)
	) {
		return activeCell;
	}

	const anchorColumnIndex = activeColumnIndex <= minColumnIndex ? maxColumnIndex : minColumnIndex;
	const anchorRowIndex = activeRowIndex <= minRowIndex ? maxRowIndex : minRowIndex;
	const anchorColumn = columnMetrics[anchorColumnIndex];
	const anchorRowId = rowIds[anchorRowIndex];

	if (!anchorColumn || !anchorRowId) {
		return activeCell;
	}

	return {
		cellKey: anchorColumn.column.key,
		rowId: anchorRowId,
	};
}

/*
 * Return one rectangle that surrounds an active multi-cell grid selection.
 */

export function getSheetGridSelectionBoxPosition(params: {
	columnMetrics: SheetColumnMetric[];
	getColumnDisplayLeft?: (metric: SheetColumnMetric) => number;
	rowMetrics: SheetGridSelectionBoxRowMetric[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	stickyHeaderHeight: number;
}): SheetGridSelectionBoxPosition | null {
	const selectedCellKeyMap = params.selectedCellKeyMap;

	if (!selectedCellKeyMap || Object.keys(selectedCellKeyMap).length <= 1) {
		return null;
	}

	let selectedCount = 0;
	let minColumnLeft = Infinity;
	let maxColumnRight = -Infinity;
	let minRowTop = Infinity;
	let maxRowBottom = -Infinity;

	params.rowMetrics.forEach((rowMetric) => {
		params.columnMetrics.forEach((columnMetric) => {
			if (!selectedCellKeyMap[getSheetCellKey(rowMetric.rowKey, columnMetric.column.key)]) {
				return;
			}

			const columnLeft = params.getColumnDisplayLeft?.(columnMetric) ?? columnMetric.left;

			selectedCount += 1;
			minColumnLeft = Math.min(minColumnLeft, columnLeft);
			maxColumnRight = Math.max(maxColumnRight, columnLeft + columnMetric.width);
			minRowTop = Math.min(minRowTop, rowMetric.top);
			maxRowBottom = Math.max(maxRowBottom, rowMetric.top + rowMetric.height);
		});
	});

	if (selectedCount <= 1 || !Number.isFinite(minColumnLeft) || !Number.isFinite(maxColumnRight) || !Number.isFinite(minRowTop) || !Number.isFinite(maxRowBottom)) {
		return null;
	}

	return {
		height: maxRowBottom - minRowTop + 1,
		left: SHEET_ROW_NUMBER_WIDTH + minColumnLeft - 1,
		top: params.stickyHeaderHeight + minRowTop - 1,
		width: maxColumnRight - minColumnLeft + 1,
	};
}

/*
 * Return selected cells in row-major order from a generic sheet-like grid.
 */

export function getOrderedSheetSelectedCells(params: {
	columnMetrics: SheetColumnMetric[];
	rowIds: string[];
	selectedCellKeyMap: SheetUISelectedCellKeyMap;
}) {
	const selectedCells: SheetUISelectedCellState[] = [];

	params.rowIds.forEach((rowId) => {
		params.columnMetrics.forEach((metric) => {
			if (params.selectedCellKeyMap[getSheetCellKey(rowId, metric.column.key)]) {
				selectedCells.push({
					cellKey: metric.column.key,
					rowId,
				});
			}
		});
	});

	return selectedCells;
}

/*
 * Return the next active cell within the current selected cells.
 */

export function getNextActiveSheetSelectedCell(params: {
	activeCell?: SheetUISelectedCellState | null;
	columnMetrics: SheetColumnMetric[];
	direction: 'forward' | 'backward';
	rowIds: string[];
	selectedCellKeyMap: SheetUISelectedCellKeyMap;
}) {
	const selectedCells = getOrderedSheetSelectedCells({
		columnMetrics: params.columnMetrics,
		rowIds: params.rowIds,
		selectedCellKeyMap: params.selectedCellKeyMap,
	});

	if (!selectedCells.length) {
		return null;
	}

	const activeIndex = params.activeCell
		? selectedCells.findIndex((cell) => cell.rowId === params.activeCell?.rowId && cell.cellKey === params.activeCell?.cellKey)
		: -1;
	const currentIndex = activeIndex >= 0 ? activeIndex : 0;
	const offset = params.direction === 'backward' ? -1 : 1;
	const nextIndex = (currentIndex + offset + selectedCells.length) % selectedCells.length;

	return selectedCells[nextIndex] || null;
}
