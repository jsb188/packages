import type { TableColumnWidth, TableDesignColumn } from '../../ui/TableUI';
import type { TableDividerResizeTarget } from './types';

export const TABLE_COLUMN_MIN_WIDTH = 50;
export const TABLE_COLUMN_MAX_WIDTH = 800;
export const TABLE_RESIZE_GUIDE_WIDTH = 3;
export const TABLE_CONTENT_WIDTH_CSS_VAR = '--table-grid-content-width';
export const TABLE_TRAILING_EMPTY_COLUMN_WIDTH = 40;

/**
 * Keep a route table column resize inside a practical pixel range.
 */
export function clampTableColumnWidth(width: number) {
	return Math.min(TABLE_COLUMN_MAX_WIDTH, Math.max(TABLE_COLUMN_MIN_WIDTH, Math.round(width)));
}

/**
 * Return a pixel width from a table column width value.
 */
export function getTableColumnPixelWidth(width: TableColumnWidth | undefined, resizedWidth?: number) {
	if (Number.isFinite(resizedWidth)) {
		return resizedWidth as number;
	}

	if (typeof width === 'number') {
		return width;
	}

	const pxMatch = width?.trim().match(/^(\d+(?:\.\d+)?)px$/);
	return pxMatch ? Number(pxMatch[1]) : null;
}

/**
 * Return a concrete pixel width that respects the table column minimum.
 */
export function getSafeTableColumnPixelWidth(width: TableColumnWidth | undefined, resizedWidth?: number) {
	const pixelWidth = getTableColumnPixelWidth(width, resizedWidth);
	return pixelWidth === null ? null : Math.max(TABLE_COLUMN_MIN_WIDTH, pixelWidth);
}

/**
 * Return true when a column owns an explicit width and can be resized.
 */
export function isResizableTableColumn(column: TableDesignColumn, resizedWidths: Record<string, number>) {
	return getTableColumnPixelWidth(column.width, resizedWidths[column.key]) !== null;
}

/**
 * Resolve which column a divider should resize.
 */
export function getTableDividerResizeTarget(columns: TableDesignColumn[], dividerIndex: number, resizedWidths: Record<string, number>): TableDividerResizeTarget | null {
	const leftColumn = columns[dividerIndex];

	if (leftColumn && isResizableTableColumn(leftColumn, resizedWidths)) {
		return {
			column: leftColumn,
			dividerIndex,
			widthDirection: 1 as const,
		};
	}

	return null;
}

/**
 * Resolve all concrete table column widths from design and saved resize values.
 */
export function getResolvedTableColumnWidths(columns: TableDesignColumn[], resizedWidths: Record<string, number>) {
	return columns.reduce((acc, column) => {
		const width = getSafeTableColumnPixelWidth(column.width, resizedWidths[column.key]);

		if (width !== null) {
			acc[column.key] = width;
		}

		return acc;
	}, {} as Record<string, number>);
}

/**
 * Resolve one table column into a CSS grid track.
 */
export function getTableColumnGridTrack(column: TableDesignColumn, resizedWidths: Record<string, number>) {
	const pixelWidth = getSafeTableColumnPixelWidth(column.width, resizedWidths[column.key]);
	if (pixelWidth !== null) {
		return `${pixelWidth}px`;
	}

	return column.width || `${TABLE_COLUMN_MIN_WIDTH}px`;
}

/**
 * Build the shared CSS grid template for all table rows.
 */
export function getTableGridTemplateColumns(columns: TableDesignColumn[], resizedWidths: Record<string, number>) {
	return [
		...columns.map((column) => getTableColumnGridTrack(column, resizedWidths)),
		`minmax(${TABLE_TRAILING_EMPTY_COLUMN_WIDTH}px, 1fr)`,
	].join(' ');
}

/**
 * Return the summed fixed pixel width for a table column list.
 */
export function getTableContentWidthValue(columns: TableDesignColumn[], resizedWidths: Record<string, number>) {
	return columns.reduce((total, column) => {
		return total + (getSafeTableColumnPixelWidth(column.width, resizedWidths[column.key]) || 0);
	}, 0);
}

/**
 * Return the summed fixed pixel width for a table column list and trailing empty column.
 */
export function getTableWidthValue(columns: TableDesignColumn[], resizedWidths: Record<string, number>) {
	return getTableContentWidthValue(columns, resizedWidths) + TABLE_TRAILING_EMPTY_COLUMN_WIDTH;
}

/**
 * Resolve the grid table width from fixed tracks and the container width.
 */
export function getTableWidthStyle(columns: TableDesignColumn[], resizedWidths: Record<string, number>, containerWidth = 0) {
	return `${Math.max(containerWidth, getTableWidthValue(columns, resizedWidths))}px`;
}

/**
 * Read the current visible width of the element wrapping a grid table.
 */
export function getTableContainerWidth(containerElement: HTMLDivElement | null) {
	return Math.ceil(containerElement?.getBoundingClientRect().width || 0);
}

/**
 * Convert a measured table container width into a CSS min-width style value.
 */
export function getTableMinWidthStyle(containerWidth: number) {
	return containerWidth > 0 ? `${containerWidth}px` : '100%';
}

/**
 * Return the element that owns a visible box for a display-contents table row.
 */
export function getTableRowLayoutElement(rowElement: Element | null): HTMLElement | null {
	if (!(rowElement instanceof HTMLElement)) {
		return null;
	}

	const rect = rowElement.getBoundingClientRect();
	if (rect.width || rect.height) {
		return rowElement;
	}

	return rowElement.querySelector<HTMLElement>('.table_grid_cell');
}

/**
 * Apply grid column and width styles directly to table roots.
 */
export function applyGridTableLayout(tableElements: (HTMLDivElement | null | undefined)[], columns: TableDesignColumn[], columnWidths: Record<string, number>, tableWidth: number) {
	const gridTemplateColumns = getTableGridTemplateColumns(columns, columnWidths);

	for (const tableElement of tableElements) {
		if (!tableElement) {
			continue;
		}

		tableElement.style.gridTemplateColumns = gridTemplateColumns;
		tableElement.style.width = `${tableWidth}px`;
		setResolvedTableContentWidthStyle(tableElement, columns.length);
	}
}

/**
 * Read the resolved width of real table columns.
 */
export function getResolvedTableContentWidth(tableElement: HTMLDivElement | null, columnCount: number) {
	const trackWidths = getResolvedTableGridTrackWidths(tableElement);

	return trackWidths.slice(0, columnCount).reduce((total, width) => total + width, 0);
}

/**
 * Set a CSS variable for the resolved width of real table columns.
 */
export function setResolvedTableContentWidthStyle(tableElement: HTMLDivElement | null, columnCount: number) {
	const contentWidth = getResolvedTableContentWidth(tableElement, columnCount);

	if (tableElement && contentWidth > 0) {
		tableElement.style.setProperty(TABLE_CONTENT_WIDTH_CSS_VAR, `${contentWidth}px`);
	} else if (tableElement) {
		tableElement.style.removeProperty(TABLE_CONTENT_WIDTH_CSS_VAR);
	}
}

/**
 * Copy the body grid's resolved column tracks to the sticky header grid.
 */
export function syncHeaderGridLayoutFromBody(headerTableElement: HTMLDivElement | null, bodyTableElement: HTMLDivElement | null, columnCount?: number) {
	if (!bodyTableElement) {
		return;
	}

	const resolvedGridTemplateColumns = getComputedStyle(bodyTableElement).gridTemplateColumns;

	if (columnCount !== undefined) {
		setResolvedTableContentWidthStyle(bodyTableElement, columnCount);
	}

	if (!headerTableElement) {
		return;
	}

	if (resolvedGridTemplateColumns && resolvedGridTemplateColumns !== 'none') {
		headerTableElement.style.gridTemplateColumns = resolvedGridTemplateColumns;
	}

	headerTableElement.style.width = bodyTableElement.style.width;

	if (columnCount !== undefined) {
		headerTableElement.style.setProperty(TABLE_CONTENT_WIDTH_CSS_VAR, bodyTableElement.style.getPropertyValue(TABLE_CONTENT_WIDTH_CSS_VAR));
	}
}

/**
 * Read resolved grid track widths from the body table root.
 */
export function getResolvedTableGridTrackWidths(tableElement: HTMLDivElement | null) {
	const gridTemplateColumns = tableElement ? getComputedStyle(tableElement).gridTemplateColumns : '';

	return gridTemplateColumns.split(/\s+/).reduce((acc, value) => {
		const width = Number(value.replace('px', ''));

		if (Number.isFinite(width)) {
			acc.push(width);
		}

		return acc;
	}, [] as number[]);
}

/**
 * Return the x-position of a divider from resolved grid track widths.
 */
export function getTableDividerLeftFromGrid(tableElement: HTMLDivElement | null, dividerIndex: number) {
	const trackWidths = getResolvedTableGridTrackWidths(tableElement);

	return trackWidths.slice(0, dividerIndex + 1).reduce((total, width) => total + width, 0);
}

/**
 * Set the absolute resize guide position without rerendering table rows.
 */
export function setResizeGuidePosition(guideElement: HTMLDivElement | null, left: number, scrollLeft = 0) {
	if (!guideElement) {
		return;
	}

	guideElement.style.display = 'block';
	guideElement.style.transform = `translateX(${left - scrollLeft - (TABLE_RESIZE_GUIDE_WIDTH / 2)}px)`;
}

/**
 * Hide the absolute resize guide.
 */
export function hideResizeGuide(guideElement: HTMLDivElement | null) {
	if (guideElement) {
		guideElement.style.display = 'none';
	}
}

/**
 * Apply global cursor styles while dragging a column divider.
 */
export function lockColumnResizeCursor() {
	const previousCursor = document.body.style.cursor;
	const previousUserSelect = document.body.style.userSelect;

	document.body.style.cursor = 'col-resize';
	document.body.style.userSelect = 'none';

	return () => {
		document.body.style.cursor = previousCursor;
		document.body.style.userSelect = previousUserSelect;
	};
}
