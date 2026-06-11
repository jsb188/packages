const SHEET_TEXT_MEASURE_CELL_PADDING_X = 8;
const SHEET_TEXT_MEASURE_LINE_GAP = 2;
const SHEET_TEXT_MEASURE_FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/*
 * Return a browser canvas context for measuring Sheet text when one is available.
 */
function getSheetTextMeasureCanvasContext() {
	if (typeof globalThis.document === 'undefined') {
		return null;
	}

	return globalThis.document.createElement('canvas').getContext('2d');
}

/*
 * Return a measured or estimated width for one text segment at the requested font size.
 */
function getSheetTextMeasureSegmentWidth(ctx: CanvasRenderingContext2D | null, text: string, fontSize: number) {
	if (ctx) {
		return ctx.measureText(text).width;
	}

	return text.length * fontSize * 0.55;
}

/*
 * Return the wrapped display lines for one Sheet cell text value.
 */
function getSheetMeasuredWrappedTextLines(ctx: CanvasRenderingContext2D | null, text: string, maxWidth: number, fontSize: number) {
	const lines: string[] = [];

	String(text || '').split(/\r?\n/).forEach((paragraph) => {
		let line = '';

		paragraph.split(/(\s+)/).forEach((word) => {
			const nextLine = line + word;

			if (line && getSheetTextMeasureSegmentWidth(ctx, nextLine, fontSize) > maxWidth) {
				lines.push(line.trimEnd());
				line = word.trimStart();

				while (line && getSheetTextMeasureSegmentWidth(ctx, line, fontSize) > maxWidth) {
					let splitIndex = 1;

					while (
						splitIndex < line.length &&
						getSheetTextMeasureSegmentWidth(ctx, line.slice(0, splitIndex + 1), fontSize) <= maxWidth
					) {
						splitIndex += 1;
					}

					lines.push(line.slice(0, splitIndex));
					line = line.slice(splitIndex);
				}

				return;
			}

			line = nextLine;
		});

		lines.push(line.trimEnd());
	});

	return lines;
}

/*
 * Return the minimum Sheet row height needed to display one cell's text at a font size.
 */
export function getSheetCellTextRequiredRowHeight(params: {
	columnWidth: number;
	fontSize: number;
	text: string;
}) {
	const fontSize = Math.max(1, Number(params.fontSize) || 1);
	const lineHeight = fontSize * 1.4;
	const maxWidth = Math.max(0, params.columnWidth - SHEET_TEXT_MEASURE_CELL_PADDING_X * 2);
	const ctx = getSheetTextMeasureCanvasContext();

	if (ctx) {
		ctx.font = `${fontSize}px ${SHEET_TEXT_MEASURE_FONT_FAMILY}`;
	}

	const lines = getSheetMeasuredWrappedTextLines(ctx, params.text, maxWidth, fontSize);
	const lineCount = Math.max(1, lines.length);
	const textHeight = lineCount * lineHeight + Math.max(0, lineCount - 1) * SHEET_TEXT_MEASURE_LINE_GAP;

	return Math.ceil(textHeight + 2);
}
