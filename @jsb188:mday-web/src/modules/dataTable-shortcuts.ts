import type { DataTableRowGQL } from '@jsb188/mday/types/dataTable.d.ts';
import {
	type SheetColumnMetric,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';
import { type DataTableInteractionCellSelection } from './dataTable-interaction-state.ts';
import {
	getSheetGridRangeSelection,
	getNextActiveSheetSelectedCell,
	getOrderedSheetSelectedCells,
} from './sheet-selection.ts';

/*
 * Return DataTable row ids in their rendered order for shared grid helpers.
 */

function getDataTableRenderedRowIds(renderedRows: DataTableRowGQL[]) {
	return renderedRows.map((row) => row.id);
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
	return getSheetGridRangeSelection({
		activeCell: params.activeCell,
		anchorCell: params.anchorCell,
		columnMetrics: params.columnMetrics,
		rowIds: getDataTableRenderedRowIds(params.renderedRows),
		selectedActiveCell: params.selectedActiveCell,
	});
}

/*
 * Return selected cells in row-major order for clipboard operations.
 */

export function getDataTableOrderedSelectedCells(params: {
	columnMetrics: SheetColumnMetric[];
	renderedRows: DataTableRowGQL[];
	selection: DataTableInteractionCellSelection;
}) {
	return getOrderedSheetSelectedCells({
		columnMetrics: params.columnMetrics,
		rowIds: getDataTableRenderedRowIds(params.renderedRows),
		selectedCellKeyMap: params.selection.selectedCellKeyMap,
	});
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
	return getNextActiveSheetSelectedCell({
		activeCell: params.selection.activeCell,
		columnMetrics: params.columnMetrics,
		direction: params.direction,
		rowIds: getDataTableRenderedRowIds(params.renderedRows),
		selectedCellKeyMap: params.selection.selectedCellKeyMap,
	});
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
