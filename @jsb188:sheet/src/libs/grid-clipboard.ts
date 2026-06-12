/*
 * Parse one delimited clipboard row with basic quoted-cell support.
 */
function parseGridDelimitedClipboardRow(rowText: string, delimiter: string) {
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
 * Convert spreadsheet clipboard text into a rectangular grid of values.
 */
export function parseGridClipboardText(text: string) {
	const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const textWithoutTrailingLineBreak = normalizedText.endsWith('\n') ? normalizedText.slice(0, -1) : normalizedText;
	const delimiter = textWithoutTrailingLineBreak.includes('\t') ? '\t' : ',';

	if (!textWithoutTrailingLineBreak) {
		return [['']];
	}

	return textWithoutTrailingLineBreak.split('\n').map((rowText) => {
		return parseGridDelimitedClipboardRow(rowText, delimiter);
	});
}

export type GridInternalClipboardCell = {
	columnIndex: number;
	rowIndex: number;
	value: string;
};

export type GridInternalClipboard = {
	grid: GridInternalClipboardCell[][];
	text: string;
};

// Last in-app copy payload; the system clipboard only carries plain TSV text,
// so the copy origin coordinates and unescaped cell values live here
let internalGridClipboard: GridInternalClipboard | null = null;

/*
 * Remember the source coordinates and raw cell values of one in-app copy so a
 * later paste can shift formula references relative to the copy origin.
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

