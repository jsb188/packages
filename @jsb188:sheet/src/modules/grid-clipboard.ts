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

