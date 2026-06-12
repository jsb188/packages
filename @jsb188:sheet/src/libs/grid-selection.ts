import {
	getSheetCellKey,
	SHEET_ROW_NUMBER_WIDTH,
	type SheetColumnMetric,
	type SheetUISelectedCellKeyMap,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import type { GridArrowDirection } from './grid-keyboard.ts';

export type GridSelectionBoxPosition = {
	height: number;
	left: number;
	top: number;
	width: number;
};

export type GridSelectionBoxRowMetric = {
	height: number;
	rowKey: string;
	top: number;
};

export type GridCellRangeSelection = {
	activeCell: SheetUISelectedCellState;
	anchorCell: SheetUISelectedCellState;
	rangeEndCell: SheetUISelectedCellState;
	selectedCellKeyMap: SheetUISelectedCellKeyMap;
};

/*
 * Build a selected-cell key map from already-ordered coordinate cells.
 */
export function getGridSelectedCellKeyMapFromCells(cells: SheetUISelectedCellState[]) {
	const selectedCellKeyMap: SheetUISelectedCellKeyMap = {};

	cells.forEach((cell) => {
		selectedCellKeyMap[getSheetCellKey(cell.rowId, cell.cellKey)] = true;
	});

	return selectedCellKeyMap;
}

/*
 * Return selected cells from a selected-cell key map in the map's key order.
 */
export function getGridSelectedCellsFromKeyMap(selectedCellKeyMap?: SheetUISelectedCellKeyMap | null) {
	const selectedCells: SheetUISelectedCellState[] = [];

	if (!selectedCellKeyMap) {
		return selectedCells;
	}

	for (const key in selectedCellKeyMap) {
		if (!selectedCellKeyMap[key]) {
			continue;
		}

		const [rowId, cellKey] = key.split(':');

		if (rowId && cellKey) {
			selectedCells.push({
				cellKey,
				rowId,
			});
		}
	}

	return selectedCells;
}

/*
 * Return an existing selected-cell map or fall back to a one-cell active selection.
 */
export function getGridResolvedSelectedCellKeyMap(params: {
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	if (params.selectedCellKeyMap) {
		return params.selectedCellKeyMap;
	}

	return params.selectedCellState
		? getGridSelectedCellKeyMapFromCells([params.selectedCellState])
		: null;
}

/*
 * Return whether a selected-cell key map contains at least two selected cells.
 */
export function gridSelectedCellKeyMapHasMultipleCells(selectedCellKeyMap?: SheetUISelectedCellKeyMap | null) {
	if (!selectedCellKeyMap) {
		return false;
	}

	let selectedCount = 0;

	for (const key in selectedCellKeyMap) {
		if (!selectedCellKeyMap[key]) {
			continue;
		}

		selectedCount += 1;

		if (selectedCount > 1) {
			return true;
		}
	}

	return false;
}

/*
 * Build a rectangular selected-cell key map from ordered row and column metrics.
 */
export function getGridSelectedCellKeyMapForRange(params: {
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
		return getGridSelectedCellKeyMapFromCells([params.activeCell]);
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
 * Build the full rectangular selection state for a generic grid.
 */
export function getGridRangeSelection(params: {
	activeCell: SheetUISelectedCellState;
	anchorCell: SheetUISelectedCellState;
	columnMetrics: SheetColumnMetric[];
	rowIds: string[];
	selectedActiveCell?: SheetUISelectedCellState;
}): GridCellRangeSelection {
	return {
		activeCell: params.selectedActiveCell || params.anchorCell,
		anchorCell: params.anchorCell,
		rangeEndCell: params.activeCell,
		selectedCellKeyMap: getGridSelectedCellKeyMapForRange({
			activeCell: params.activeCell,
			anchorCell: params.anchorCell,
			columnMetrics: params.columnMetrics,
			rowIds: params.rowIds,
		}),
	};
}

/*
 * Return the next selected grid cell after one arrow-key movement.
 */
export function getGridArrowNavigationSelection(params: {
	columnMetrics: SheetColumnMetric[];
	direction: GridArrowDirection;
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
 * Return whether a selected-cell key map forms one solid rectangle. Toggling
 * cells out of a selection (Cmd/Ctrl+click) can leave holes; range-shaped
 * features like the fill handle and range copy only run on solid rectangles.
 */
export function gridSelectedCellKeyMapIsSolidRectangle(params: {
	columnMetrics: SheetColumnMetric[];
	rowIds: string[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
}) {
	const { columnMetrics, rowIds, selectedCellKeyMap } = params;

	if (!selectedCellKeyMap) {
		return false;
	}

	let minColumnIndex = Infinity;
	let maxColumnIndex = -Infinity;
	let minRowIndex = Infinity;
	let maxRowIndex = -Infinity;
	let selectedCount = 0;

	rowIds.forEach((rowId, rowIndex) => {
		columnMetrics.forEach((metric, columnIndex) => {
			if (!selectedCellKeyMap[getSheetCellKey(rowId, metric.column.key)]) {
				return;
			}

			selectedCount += 1;
			minColumnIndex = Math.min(minColumnIndex, columnIndex);
			maxColumnIndex = Math.max(maxColumnIndex, columnIndex);
			minRowIndex = Math.min(minRowIndex, rowIndex);
			maxRowIndex = Math.max(maxRowIndex, rowIndex);
		});
	});

	if (!selectedCount) {
		return false;
	}

	return selectedCount === (maxColumnIndex - minColumnIndex + 1) * (maxRowIndex - minRowIndex + 1);
}

/*
 * Return a copy of a selected-cell key map with one cell toggled in or out.
 */
export function getGridSelectedCellKeyMapWithCellToggled(
	selectedCellKeyMap: SheetUISelectedCellKeyMap,
	cell: SheetUISelectedCellState,
) {
	const cellKey = getSheetCellKey(cell.rowId, cell.cellKey);
	const next = { ...selectedCellKeyMap };

	if (next[cellKey]) {
		delete next[cellKey];
	} else {
		next[cellKey] = true;
	}

	return next;
}

/*
 * Return the next selected grid cell after one Cmd/Ctrl+arrow jump to the edge
 * of the surrounding data block, Google Sheets style: from inside a block jump
 * to the block's last filled cell, from a block edge or an empty cell jump to
 * the next filled cell, and with no further content jump to the grid edge.
 */
export function getGridDataEdgeNavigationSelection(params: {
	columnMetrics: SheetColumnMetric[];
	direction: GridArrowDirection;
	hasCellContent: (rowId: string, cellKey: string) => boolean;
	rowIds: string[];
	selectedCellState?: SheetUISelectedCellState | null;
}) {
	const { columnMetrics, direction, hasCellContent, rowIds, selectedCellState } = params;

	if (!columnMetrics.length || !rowIds.length || !selectedCellState) {
		return null;
	}

	const currentColumnIndex = columnMetrics.findIndex((metric) => metric.column.key === selectedCellState.cellKey);
	const currentRowIndex = rowIds.indexOf(selectedCellState.rowId);

	if (currentColumnIndex < 0 || currentRowIndex < 0) {
		return null;
	}

	const vertical = direction === 'up' || direction === 'down';
	const step = direction === 'right' || direction === 'down' ? 1 : -1;
	const lastIndex = vertical ? rowIds.length - 1 : columnMetrics.length - 1;
	const currentIndex = vertical ? currentRowIndex : currentColumnIndex;
	const cellAt = (index: number) => {
		return {
			cellKey: vertical ? selectedCellState.cellKey : columnMetrics[index].column.key,
			rowId: vertical ? rowIds[index] : selectedCellState.rowId,
		};
	};
	const contentAt = (index: number) => {
		const cell = cellAt(index);

		return hasCellContent(cell.rowId, cell.cellKey);
	};

	const nextIndex = currentIndex + step;

	if (nextIndex < 0 || nextIndex > lastIndex) {
		return cellAt(currentIndex);
	}

	let targetIndex = nextIndex;

	if (contentAt(currentIndex) && contentAt(nextIndex)) {
		// Inside a filled block: stop on the block's last filled cell
		while (targetIndex + step >= 0 && targetIndex + step <= lastIndex && contentAt(targetIndex + step)) {
			targetIndex += step;
		}
	} else {
		// On an edge or in empty space: stop on the next filled cell, or the grid edge
		while (targetIndex >= 0 && targetIndex <= lastIndex && !contentAt(targetIndex)) {
			targetIndex += step;
		}

		if (targetIndex < 0 || targetIndex > lastIndex) {
			targetIndex = step > 0 ? lastIndex : 0;
		}
	}

	return cellAt(targetIndex);
}

/*
 * Return the stable anchor corner for an existing rectangular grid selection.
 */

export function getGridSelectionAnchorCell(params: {
	activeCell?: SheetUISelectedCellState | null;
	columnMetrics: SheetColumnMetric[];
	rowIds: string[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
}) {
	const { activeCell, columnMetrics, rowIds, selectedCellKeyMap } = params;

	if (!activeCell || !selectedCellKeyMap || !gridSelectedCellKeyMapHasMultipleCells(selectedCellKeyMap)) {
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
export function getGridSelectionBoxPosition(params: {
	columnMetrics: SheetColumnMetric[];
	getColumnDisplayLeft?: (metric: SheetColumnMetric) => number;
	getRowDisplayTop?: (metric: GridSelectionBoxRowMetric) => number;
	rowMetrics: GridSelectionBoxRowMetric[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
	stickyHeaderHeight: number;
}): GridSelectionBoxPosition | null {
	const selectedCellKeyMap = params.selectedCellKeyMap;

	if (!selectedCellKeyMap || !gridSelectedCellKeyMapHasMultipleCells(selectedCellKeyMap)) {
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
			const rowTop = params.getRowDisplayTop?.(rowMetric) ?? rowMetric.top;

			selectedCount += 1;
			minColumnLeft = Math.min(minColumnLeft, columnLeft);
			maxColumnRight = Math.max(maxColumnRight, columnLeft + columnMetric.width);
			minRowTop = Math.min(minRowTop, rowTop);
			maxRowBottom = Math.max(maxRowBottom, rowTop + rowMetric.height);
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
 * Return selected cells in row-major order from a generic grid.
 */
export function getOrderedGridSelectedCells(params: {
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
 * Return the top-left-most cell from a generic grid selection.
 */
export function getGridTopLeftSelectedCell(params: {
	columnMetrics: SheetColumnMetric[];
	fallbackCell?: SheetUISelectedCellState | null;
	rowIds: string[];
	selectedCellKeyMap?: SheetUISelectedCellKeyMap | null;
}) {
	if (!params.selectedCellKeyMap) {
		return params.fallbackCell || null;
	}

	for (const rowId of params.rowIds) {
		for (const metric of params.columnMetrics) {
			if (params.selectedCellKeyMap[getSheetCellKey(rowId, metric.column.key)]) {
				return {
					cellKey: metric.column.key,
					rowId,
				};
			}
		}
	}

	return params.fallbackCell || null;
}

/*
 * Return the next active cell within the current selected cells.
 */
export function getNextActiveGridSelectedCell(params: {
	activeCell?: SheetUISelectedCellState | null;
	columnMetrics: SheetColumnMetric[];
	direction: 'forward' | 'backward';
	rowIds: string[];
	selectedCellKeyMap: SheetUISelectedCellKeyMap;
}) {
	const selectedCells = getOrderedGridSelectedCells({
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
