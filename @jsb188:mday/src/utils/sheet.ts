import {
	SHEET_COLUMN_MAX_WIDTH,
	SHEET_COLUMN_MIN_WIDTH,
} from '../constants/sheet.ts';
import type {
	SheetDesignCellObj,
	SheetDesignObj,
	SheetDesignViewColumnObj,
	SheetDesignViewObj,
	SheetFieldTypeEnum,
} from '../types/sheet.d.ts';

/*
 * Keep a user-resized sheet column width inside the usable spreadsheet range.
 */

export function clampSheetColumnWidth(width: number) {
	return Math.min(SHEET_COLUMN_MAX_WIDTH, Math.max(SHEET_COLUMN_MIN_WIDTH, Math.round(width)));
}

/*
 * Check whether a value is a non-array object.
 */

function isPlainObject(value: any) {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/*
 * Return whether one sheet view column reads from a master sheet cell.
 */

export function isSheetViewMasterCellColumn(column: SheetDesignViewColumnObj | null | undefined) {
	return column?.source?.type === 'MASTER_CELL' && typeof column.source.cellKey === 'string' && !!column.source.cellKey;
}

/*
 * Return validated stored views from a sheet design object.
 */

export function getSheetDesignViews(design: SheetDesignObj | null | undefined) {
	const views = design?.views;
	if (!Array.isArray(views)) {
		return [];
	}

	return views.filter((view) => {
		return (
			isPlainObject(view) &&
			typeof view.id === 'string' &&
			!!view.id &&
			typeof view.name === 'string' &&
			!!view.name &&
			view.layout === 'GRID' &&
			Array.isArray(view.columns)
		);
	}) as SheetDesignViewObj[];
}

/*
 * Return the stored views in the order that sheet tabs should display them.
 */

export function getOrderedSheetDesignViews(design: SheetDesignObj | null | undefined) {
	const views = getSheetDesignViews(design);
	const viewsById = new Map(views.map((view) => [view.id, view]));
	const orderedViews = (design?.viewsOrder || [])
		.map((viewId) => viewsById.get(viewId))
		.filter(Boolean) as SheetDesignViewObj[];
	const orderedIds = new Set(orderedViews.map((view) => view.id));
	const remainingViews = views.filter((view) => !orderedIds.has(view.id));

	return orderedViews.concat(remainingViews);
}

/*
 * Return the displayable columns for one sheet view in saved order.
 */

export function getOrderedSheetDesignViewColumns(view: SheetDesignViewObj | null | undefined) {
	const columns = Array.isArray(view?.columns) ? view.columns : [];
	const columnsByKey = new Map(columns.map((column) => [column.key, column]));
	const orderedColumns = (view?.columnsOrder || [])
		.map((columnKey) => columnsByKey.get(columnKey))
		.filter(Boolean) as SheetDesignViewColumnObj[];
	const orderedKeys = new Set(orderedColumns.map((column) => column.key));
	const remainingColumns = columns.filter((column) => !orderedKeys.has(column.key));

	return orderedColumns.concat(remainingColumns);
}

/*
 * Convert a view column into the same design-cell shape used by the grid renderer.
 */

export function mapSheetDesignViewColumnToCell(
	column: SheetDesignViewColumnObj,
	masterCellsByKey: Map<string, SheetDesignCellObj>,
) {
	const masterCell = isSheetViewMasterCellColumn(column)
		? masterCellsByKey.get(column.source!.cellKey!)
		: null;

	return {
		key: column.key,
		label: column.label || masterCell?.label || column.key,
		humanLabel: column.humanLabel ?? null,
		iconName: column.iconName ?? masterCell?.iconName ?? null,
		fieldType: masterCell?.fieldType || column.humanFieldType as SheetFieldTypeEnum,
		humanFieldType: column.humanFieldType,
		source: masterCell?.source || null,
		options: column.options || masterCell?.options || [],
		openLink: column.openLink ?? masterCell?.openLink,
		humansOnly: masterCell?.humansOnly,
		humansCannotEdit: column.humansCannotEdit ?? masterCell?.humansCannotEdit ?? column.source?.type !== 'MASTER_CELL',
		indexed: masterCell?.indexed,
		width: column.width ?? null,
		viewSource: column.source || null,
	} as SheetDesignCellObj & {
		viewSource?: SheetDesignViewColumnObj['source'] | null;
	};
}
