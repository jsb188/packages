import type { TableDesignColumn, TableHeaderObj } from '../../ui/TableUI';

/**
 * Return a complete column order by applying saved keys before default columns.
 */
export function getOrderedTableColumnKeys(columns: TableDesignColumn[], columnOrder?: string[] | null) {
	const columnKeys = columns.map((column) => column.key);
	const columnKeySet = new Set(columnKeys);
	const seenColumnKeys = new Set<string>();
	const orderedColumnKeys = (columnOrder || []).reduce((acc, columnKey) => {
		if (!columnKeySet.has(columnKey) || seenColumnKeys.has(columnKey)) {
			return acc;
		}

		seenColumnKeys.add(columnKey);
		acc.push(columnKey);
		return acc;
	}, [] as string[]);

	columnKeys.forEach((columnKey) => {
		if (!seenColumnKeys.has(columnKey)) {
			orderedColumnKeys.push(columnKey);
		}
	});

	return orderedColumnKeys;
}

/**
 * Return table columns in the requested visual order.
 */
export function getOrderedTableColumns(columns: TableDesignColumn[], columnOrder?: string[] | null) {
	const columnsByKey = new Map(columns.map((column) => [column.key, column]));

	return getOrderedTableColumnKeys(columns, columnOrder).reduce((acc, columnKey) => {
		const column = columnsByKey.get(columnKey);

		if (column) {
			acc.push(column);
		}

		return acc;
	}, [] as TableDesignColumn[]);
}

/**
 * Return positional header overrides in the same order as the rendered columns.
 */
export function getOrderedTableHeaders(
	headers: Partial<TableHeaderObj>[] | null | undefined,
	sourceColumns: TableDesignColumn[],
	orderedColumns: TableDesignColumn[],
) {
	if (!headers) {
		return headers;
	}

	const sourceIndexByColumnKey = new Map(sourceColumns.map((column, index) => [column.key, index]));

	return orderedColumns.map((column) => {
		const sourceIndex = sourceIndexByColumnKey.get(column.key);

		return sourceIndex === undefined ? {} : headers[sourceIndex] || {};
	});
}

/**
 * Return positional cell class names in the same order as the rendered columns.
 */
export function getOrderedTableCellClassNames(
	cellClassNames: string | (string | undefined)[] | undefined,
	sourceColumns: TableDesignColumn[],
	orderedColumns: TableDesignColumn[],
) {
	if (!Array.isArray(cellClassNames)) {
		return cellClassNames;
	}

	const sourceIndexByColumnKey = new Map(sourceColumns.map((column, index) => [column.key, index]));

	return orderedColumns.map((column) => {
		const sourceIndex = sourceIndexByColumnKey.get(column.key);

		return sourceIndex === undefined ? undefined : cellClassNames[sourceIndex];
	});
}
