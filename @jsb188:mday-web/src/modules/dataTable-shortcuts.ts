import type { DataTableRowGQL } from '@jsb188/mday/types/dataTable.d.ts';
import {
	getSheetCellKey,
	type SheetColumnMetric,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import type { DataTableArrowNavigationDirection } from './DataTable-ContextMenu.tsx';
import { type DataTableInteractionCellSelection } from './dataTable-interaction-state.ts';

/*
 * Return the browser arrow key as a dataTable navigation direction.
 */

export function getDataTableShortcutArrowDirection(pressed?: string | null): DataTableArrowNavigationDirection | null {
	switch (pressed) {
		case 'ArrowLeft':
			return 'left';
		case 'ArrowRight':
			return 'right';
		case 'ArrowUp':
			return 'up';
		case 'ArrowDown':
			return 'down';
		default:
			return null;
	}
}

/*
 * Build a rectangular selection between an anchor cell and active cell.
 */

export function getDataTableRangeSelection(params: {
	activeCell: SheetUISelectedCellState;
	anchorCell: SheetUISelectedCellState;
	columnMetrics: SheetColumnMetric[];
	renderedRows: DataTableRowGQL[];
	selectedActiveCell?: SheetUISelectedCellState;
}): DataTableInteractionCellSelection {
	const activeColumnIndex = params.columnMetrics.findIndex((metric) => metric.column.key === params.activeCell.cellKey);
	const anchorColumnIndex = params.columnMetrics.findIndex((metric) => metric.column.key === params.anchorCell.cellKey);
	const activeRowIndex = params.renderedRows.findIndex((row) => row.id === params.activeCell.rowId);
	const anchorRowIndex = params.renderedRows.findIndex((row) => row.id === params.anchorCell.rowId);
	const selectedCellKeyMap: DataTableInteractionCellSelection['selectedCellKeyMap'] = {};

	if (activeColumnIndex < 0 || anchorColumnIndex < 0 || activeRowIndex < 0 || anchorRowIndex < 0) {
		selectedCellKeyMap[getSheetCellKey(params.activeCell.rowId, params.activeCell.cellKey)] = true;

		return {
			activeCell: params.selectedActiveCell || params.anchorCell,
			anchorCell: params.anchorCell,
			rangeEndCell: params.activeCell,
			selectedCellKeyMap,
		};
	}

	const columnStart = Math.min(activeColumnIndex, anchorColumnIndex);
	const columnEnd = Math.max(activeColumnIndex, anchorColumnIndex);
	const rowStart = Math.min(activeRowIndex, anchorRowIndex);
	const rowEnd = Math.max(activeRowIndex, anchorRowIndex);

	for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
		const row = params.renderedRows[rowIndex];
		if (!row) {
			continue;
		}

		for (let columnIndex = columnStart; columnIndex <= columnEnd; columnIndex += 1) {
			const column = params.columnMetrics[columnIndex]?.column;
			if (column) {
				selectedCellKeyMap[getSheetCellKey(row.id, column.key)] = true;
			}
		}
	}

	return {
		activeCell: params.selectedActiveCell || params.anchorCell,
		anchorCell: params.anchorCell,
		rangeEndCell: params.activeCell,
		selectedCellKeyMap,
	};
}

/*
 * Return selected cells in row-major order for clipboard operations.
 */

export function getDataTableOrderedSelectedCells(params: {
	columnMetrics: SheetColumnMetric[];
	renderedRows: DataTableRowGQL[];
	selection: DataTableInteractionCellSelection;
}) {
	const cells: SheetUISelectedCellState[] = [];

	params.renderedRows.forEach((row) => {
		params.columnMetrics.forEach((metric) => {
			if (params.selection.selectedCellKeyMap[getSheetCellKey(row.id, metric.column.key)]) {
				cells.push({
					cellKey: metric.column.key,
					rowId: row.id,
				});
			}
		});
	});

	return cells;
}

/*
 * Return the next active cell within the current selected cells.
 */

export function getDataTableNextActiveSelectedCell(params: {
	columnMetrics: SheetColumnMetric[];
	direction: 'forward' | 'backward';
	renderedRows: DataTableRowGQL[];
	selection: DataTableInteractionCellSelection;
}) {
	const selectedCells = getDataTableOrderedSelectedCells({
		columnMetrics: params.columnMetrics,
		renderedRows: params.renderedRows,
		selection: params.selection,
	});

	if (!selectedCells.length) {
		return null;
	}

	if (selectedCells.length === 1) {
		return selectedCells[0] || null;
	}

	const activeIndex = selectedCells.findIndex((cell) => {
		return cell.rowId === params.selection.activeCell.rowId && cell.cellKey === params.selection.activeCell.cellKey;
	});
	const currentIndex = activeIndex >= 0 ? activeIndex : 0;
	const offset = params.direction === 'backward' ? -1 : 1;
	const nextIndex = (currentIndex + offset + selectedCells.length) % selectedCells.length;

	return selectedCells[nextIndex] || null;
}

/*
 * Parse one delimited clipboard row with basic quoted-cell support.
 */

function parseDataTableDelimitedClipboardRow(rowText: string, delimiter: string) {
	const values: string[] = [];
	let currentValue = '';
	let quoted = false;

	for (let index = 0; index < rowText.length; index += 1) {
		const char = rowText[index];
		const nextChar = rowText[index + 1];

		if (char === '"' && quoted && nextChar === '"') {
			currentValue += '"';
			index += 1;
			continue;
		}

		if (char === '"') {
			quoted = !quoted;
			continue;
		}

		if (char === delimiter && !quoted) {
			values.push(currentValue);
			currentValue = '';
			continue;
		}

		currentValue += char;
	}

	values.push(currentValue);

	return values;
}

/*
 * Convert clipboard text from spreadsheets into a rectangular value grid.
 */

export function parseDataTableClipboardText(text: string) {
	const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const textWithoutTrailingLineBreak = normalizedText.endsWith('\n') ? normalizedText.slice(0, -1) : normalizedText;
	const delimiter = textWithoutTrailingLineBreak.includes('\t') ? '\t' : ',';

	if (!textWithoutTrailingLineBreak) {
		return [['']];
	}

	return textWithoutTrailingLineBreak.split('\n').map((rowText) => {
		return parseDataTableDelimitedClipboardRow(rowText, delimiter);
	});
}

/*
 * Map pasted clipboard values onto loaded dataTable cells.
 */

export function getDataTablePasteTargets(params: {
	activeCell: SheetUISelectedCellState;
	clipboardGrid: string[][];
	columnMetrics: SheetColumnMetric[];
	renderedRows: DataTableRowGQL[];
	selection: DataTableInteractionCellSelection;
}) {
	const selectionCells = getDataTableOrderedSelectedCells({
		columnMetrics: params.columnMetrics,
		renderedRows: params.renderedRows,
		selection: params.selection,
	});
	const shouldFillSelection = params.clipboardGrid.length === 1 && params.clipboardGrid[0]?.length === 1 && selectionCells.length > 1;
	const targets: Array<SheetUISelectedCellState & { value: string }> = [];

	if (shouldFillSelection) {
		const value = params.clipboardGrid[0]?.[0] || '';

		selectionCells.forEach((cell) => {
			targets.push({
				...cell,
				value,
			});
		});

		return targets;
	}

	const startColumnIndex = params.columnMetrics.findIndex((metric) => metric.column.key === params.activeCell.cellKey);
	const startRowIndex = params.renderedRows.findIndex((row) => row.id === params.activeCell.rowId);

	if (startColumnIndex < 0 || startRowIndex < 0) {
		return targets;
	}

	params.clipboardGrid.forEach((rowValues, rowOffset) => {
		const row = params.renderedRows[startRowIndex + rowOffset];
		if (!row) {
			return;
		}

		rowValues.forEach((value, columnOffset) => {
			const column = params.columnMetrics[startColumnIndex + columnOffset]?.column;
			if (!column) {
				return;
			}

			targets.push({
				cellKey: column.key,
				rowId: row.id,
				value,
			});
		});
	});

	return targets;
}
