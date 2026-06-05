import {
	SHEET_HEADER_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	type SheetColumnMetric,
	type SheetRowMetric,
} from '@jsb188/react-web/ui/SheetUI';

/*
 * Return the visible canvas X coordinate for one column metric.
 */
export function getSheetCanvasColumnDisplayLeft(metric: SheetColumnMetric, scrollLeft: number, stickyColumnCount: number) {
	const sticky = metric.columnIndex < stickyColumnCount;
	const spacer = sticky || !stickyColumnCount ? 0 : SHEET_STICKY_SPACER_SIZE;

	return SHEET_ROW_NUMBER_WIDTH + metric.left + spacer - (sticky ? 0 : scrollLeft);
}

/*
 * Return the visible canvas X coordinate for one column metric's right edge.
 */
export function getSheetCanvasColumnDisplayRight(metric: SheetColumnMetric, scrollLeft: number, stickyColumnCount: number) {
	return getSheetCanvasColumnDisplayLeft(metric, scrollLeft, stickyColumnCount) + metric.width;
}

/*
 * Return the visible canvas Y coordinate for one row metric.
 */
export function getSheetCanvasRowDisplayTop(metric: SheetRowMetric, scrollTop: number) {
	return SHEET_HEADER_HEIGHT + metric.top - scrollTop;
}

/*
 * Return the visible canvas Y coordinate for one row metric's bottom edge.
 */
export function getSheetCanvasRowDisplayBottom(metric: SheetRowMetric, scrollTop: number) {
	return getSheetCanvasRowDisplayTop(metric, scrollTop) + metric.height;
}

/*
 * Return the visible canvas X coordinate for the real right edge of the Sheet grid.
 */
export function getSheetCanvasGridDisplayRight(columns: SheetColumnMetric[], scrollLeft: number, stickyColumnCount: number) {
	const lastColumn = columns.at(-1);

	if (!lastColumn) {
		return SHEET_ROW_NUMBER_WIDTH;
	}

	return getSheetCanvasColumnDisplayRight(lastColumn, scrollLeft, stickyColumnCount);
}

/*
 * Return whether one rectangle intersects the current canvas viewport.
 */
export function sheetCanvasRectIsVisible(rect: { height: number; left: number; top: number; width: number }, viewportWidth: number, viewportHeight: number) {
	return rect.left < viewportWidth &&
		rect.left + rect.width > 0 &&
		rect.top < viewportHeight &&
		rect.top + rect.height > 0;
}
