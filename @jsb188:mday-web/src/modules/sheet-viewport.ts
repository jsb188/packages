import {
	getSheetColumnIndexAtOffset,
	getSheetRowIndexAtOffset,
	SHEET_ROW_NUMBER_WIDTH,
	type SheetColumnMetric,
	type SheetRowMetric,
	type SheetUISelectedCellState,
} from '@jsb188/react-web/ui/SheetUI';

/*
 * Return cells that are visible in the current Sheet viewport.
 */

export function getSheetViewportVisibleCells(params: {
	columnMetrics: SheetColumnMetric[];
	columnOffsets: number[];
	frozenColumnCount: number;
	rowMetrics: SheetRowMetric[];
	rowOffsets: number[];
	scrollLeft: number;
	scrollTop: number;
	stickyHeaderHeight: number;
	viewportHeight: number;
	viewportWidth: number;
}) {
	const visibleBodyHeight = Math.max(0, params.viewportHeight - params.stickyHeaderHeight);
	const visibleBodyTop = Math.max(0, params.scrollTop - params.stickyHeaderHeight);
	const visibleBodyBottom = Math.max(visibleBodyTop, visibleBodyTop + visibleBodyHeight - 1);
	const visibleRowStart = getSheetRowIndexAtOffset(params.rowOffsets, visibleBodyTop);
	const visibleRowEnd = getSheetRowIndexAtOffset(params.rowOffsets, visibleBodyBottom) + 1;
	const bodyScrollLeft = Math.max(0, params.scrollLeft - SHEET_ROW_NUMBER_WIDTH);
	const bodyScrollRight = Math.max(bodyScrollLeft, bodyScrollLeft + params.viewportWidth - 1);
	const visibleColumnStart = getSheetColumnIndexAtOffset(params.columnOffsets, bodyScrollLeft);
	const visibleColumnEnd = getSheetColumnIndexAtOffset(params.columnOffsets, bodyScrollRight) + 1;
	const visibleColumnIndexes = new Set<number>();

	for (let columnIndex = 0; columnIndex < params.frozenColumnCount && columnIndex < params.columnMetrics.length; columnIndex += 1) {
		visibleColumnIndexes.add(columnIndex);
	}

	for (let columnIndex = visibleColumnStart; columnIndex < visibleColumnEnd; columnIndex += 1) {
		visibleColumnIndexes.add(columnIndex);
	}

	const visibleRows = params.rowMetrics.slice(visibleRowStart, visibleRowEnd);
	const visibleColumns = Array.from(visibleColumnIndexes)
		.sort((a, b) => a - b)
		.map((columnIndex) => params.columnMetrics[columnIndex])
		.filter(Boolean);

	return visibleRows.flatMap((rowMetric): SheetUISelectedCellState[] => {
		return visibleColumns.map((columnMetric) => ({
			cellKey: columnMetric.column.key,
			rowId: rowMetric.rowKey,
		}));
	});
}
