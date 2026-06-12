import type { SheetCellStyleObj } from '@jsb188/mday/types/sheet.d.ts';

/*
 * Convert spreadsheet clipboard text into a rectangular grid of values with a
 * single quote-aware scan, so quoted cells can carry embedded delimiters AND
 * embedded newlines (Google Sheets exports multiline cells that way).
 */
export function parseGridClipboardText(text: string) {
	const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const textWithoutTrailingLineBreak = normalizedText.endsWith('\n') ? normalizedText.slice(0, -1) : normalizedText;
	const delimiter = textWithoutTrailingLineBreak.includes('\t') ? '\t' : ',';

	if (!textWithoutTrailingLineBreak) {
		return [['']];
	}

	const grid: string[][] = [];
	let currentRow: string[] = [];
	let currentValue = '';
	let quoted = false;

	for (let index = 0; index < textWithoutTrailingLineBreak.length; index += 1) {
		const char = textWithoutTrailingLineBreak[index];
		const nextChar = textWithoutTrailingLineBreak[index + 1];

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
			currentRow.push(currentValue);
			currentValue = '';
			continue;
		}

		if (char === '\n' && !quoted) {
			currentRow.push(currentValue);
			grid.push(currentRow);
			currentRow = [];
			currentValue = '';
			continue;
		}

		currentValue += char;
	}

	currentRow.push(currentValue);
	grid.push(currentRow);

	return grid;
}

export type GridInternalClipboardCell = {
	columnIndex: number;
	/* Presentation fields captured at copy time so in-app pastes carry formatting */
	format?: string | null;
	note?: string | null;
	rowIndex: number;
	style?: SheetCellStyleObj | null;
	value: string;
};

export type GridInternalClipboard = {
	/* Cut clipboards move their source: the first in-app paste clears the source cells */
	cut?: boolean;
	grid: GridInternalClipboardCell[][];
	text: string;
};

// Last in-app copy payload; the system clipboard only carries plain TSV text,
// so the copy origin coordinates, unescaped cell values, and cell formatting
// live here
let internalGridClipboard: GridInternalClipboard | null = null;

/*
 * Remember the source coordinates, raw cell values, and formatting of one
 * in-app copy or cut so a later paste can shift formula references relative to
 * the copy origin, carry the source formatting, and move cut sources.
 */
export function setInternalGridClipboard(payload: GridInternalClipboard | null) {
	internalGridClipboard = payload;
}

/*
 * Return the internal clipboard payload only while the system clipboard still
 * holds the exact text written by the same copy; any external copy in between
 * changes the text and invalidates the payload.
 */
export function getInternalGridClipboard(clipboardText: string): GridInternalClipboard | null {
	return internalGridClipboard && internalGridClipboard.text === clipboardText
		? internalGridClipboard
		: null;
}
