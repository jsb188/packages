import {
	SHEET_COLUMN_MAX_WIDTH,
	SHEET_COLUMN_MIN_WIDTH,
} from '../constants/sheet.ts';
import type {
	SheetDesignCellObj,
	SheetDesignObj,
	SheetDesignViewColumnObj,
	SheetDesignViewGeneratorDimensionObj,
	SheetDesignViewObj,
	SheetFieldTypeEnum,
	SheetRecordValue,
} from '../types/sheet.d.ts';

export type GeneratedSheetViewRowDefinition = {
	viewRowKey: string;
	position: number;
	cellValues: Record<string, string | number>;
	criteria: {
		date?: {
			key: string;
			value: string;
			grain: 'DAY' | 'WEEK';
			sourceCellKey: string;
		};
		dimensions: Array<{
			key: string;
			value: string;
			sourceCellKey?: string | null;
		}>;
	};
};

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
 * Return whether one value is a valid finite number input for a sheet cell.
 */

function isValidSheetNumberValue(value: SheetRecordValue) {
	const numberValue = typeof value === 'number' ? value : Number(value);

	return Number.isFinite(numberValue);
}

/*
 * Return whether a date string points at a real calendar date.
 */

function isValidSheetDateKey(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day;
}

/*
 * Return whether one value can be stored as a sheet date cell.
 */

function isValidSheetDateValue(value: SheetRecordValue) {
	if (value instanceof Date) {
		return Number.isFinite(value.getTime());
	}

	return isValidSheetDateKey(String(value).split('T')[0]);
}

/*
 * Return whether one value can be stored as a sheet datetime cell.
 */

function isValidSheetDateTimeValue(value: SheetRecordValue) {
	const date = value instanceof Date ? value : new Date(String(value));

	return Number.isFinite(date.getTime());
}

/*
 * Return whether one value is included in a sheet cell's saved options.
 */

function isSheetOptionValue(cell: SheetDesignCellObj, value: unknown) {
	const validValues = new Set((cell.options || []).map((option) => String(option.value)));

	return validValues.has(String(value));
}

/*
 * Return a user-readable validation error for an invalid sheet cell value.
 */

export function getSheetCellValueValidationError(
	cell: SheetDesignCellObj,
	value: SheetRecordValue,
) {
	if (value === null) {
		return null;
	}

	if (cell.fieldType === 'NUMBER' && !isValidSheetNumberValue(value)) {
		return `${cell.key} must be a valid number.`;
	}

	if (cell.fieldType === 'DATE' && !isValidSheetDateValue(value)) {
		return `${cell.key} must be a valid date.`;
	}

	if (cell.fieldType === 'DATETIME' && !isValidSheetDateTimeValue(value)) {
		return `${cell.key} must be a valid datetime.`;
	}

	if (cell.fieldType === 'SELECT' && cell.options?.length && !isSheetOptionValue(cell, value)) {
		return `${cell.key} must be one of: ${(cell.options || []).map((option) => option.value).join(', ')}`;
	}

	if (cell.fieldType === 'SELECT_OR_TEXT' && !isSheetOptionValue(cell, value) && typeof value !== 'string') {
		const optionsText = (cell.options || []).map((option) => option.value).join(', ');
		return optionsText ? `${cell.key} must be one of: ${optionsText}, or a text string.` : `${cell.key} must be a text string.`;
	}

	if (cell.fieldType === 'MULTI_SELECT') {
		if (!Array.isArray(value)) {
			return `${cell.key} must be an array of option values.`;
		}

		if (cell.options?.length) {
			const invalidValues = value.filter((item) => !isSheetOptionValue(cell, item));
			if (invalidValues.length) {
				return `${cell.key} contains invalid option values: ${invalidValues.map((item) => String(item)).join(', ')}. ` +
					`Allowed values: ${(cell.options || []).map((option) => option.value).join(', ')}`;
			}
		}
	}

	return null;
}

/*
 * Return whether one saved view has a usable generated grouped-row model.
 */

export function isSheetViewGeneratedRowsView(view: SheetDesignViewObj | null | undefined) {
	return view?.rowModel?.type === 'GROUPED_ROWS' &&
		typeof view.rowModel.generator?.keyPrefix === 'string' &&
		!!view.rowModel.generator.keyPrefix;
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
 * Return a YYYY-MM-DD string for one date using UTC calendar fields.
 */

function formatDateKey(date: Date) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/*
 * Return a UTC date parsed from a YYYY-MM-DD string.
 */

function parseDateKey(value: string | null | undefined) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}

	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return date;
}

/*
 * Return a new UTC date offset by a number of days.
 */

function addDays(date: Date, days: number) {
	const nextDate = new Date(date.getTime());
	nextDate.setUTCDate(nextDate.getUTCDate() + days);

	return nextDate;
}

/*
 * Return the inclusive start and end dates for one generated date series.
 */

function getSheetViewDateSeriesRange(
	dateSeries: NonNullable<NonNullable<SheetDesignViewObj['rowModel']>['generator']>['dateSeries'],
	referenceDate: Date,
) {
	if (!dateSeries?.range) {
		return null;
	}

	if (dateSeries.range.type === 'FIXED') {
		const start = parseDateKey(dateSeries.range.start);
		const end = parseDateKey(dateSeries.range.end);

		return start && end && start.getTime() <= end.getTime() ? { start, end } : null;
	}

	if (dateSeries.range.type === 'CURRENT_MONTH') {
		const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
		const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0));

		return { start, end };
	}

	return null;
}

/*
 * Return generated date points for one date series.
 */

function getSheetViewDateSeriesValues(
	dateSeries: NonNullable<NonNullable<SheetDesignViewObj['rowModel']>['generator']>['dateSeries'],
	referenceDate: Date,
) {
	const range = getSheetViewDateSeriesRange(dateSeries, referenceDate);
	if (!dateSeries?.key || !range) {
		return [];
	}

	const values: Array<{
		key: string;
		value: string;
		label: string;
		grain: 'DAY' | 'WEEK';
		sourceCellKey: string;
	}> = [];
	let current = range.start;

	while (current.getTime() <= range.end.getTime()) {
		if (dateSeries.grain === 'DAY' || (dateSeries.grain === 'WEEK' && current.getUTCDay() === 1)) {
			const value = formatDateKey(current);
			values.push({
				key: dateSeries.key,
				value,
				label: value,
				grain: dateSeries.grain,
				sourceCellKey: dateSeries.sourceCellKey || dateSeries.key,
			});
		}

		current = addDays(current, 1);
	}

	return values;
}

/*
 * Return generated dimension values from static values or master cell options.
 */

function getSheetViewGeneratorDimensionValues(
	dimension: SheetDesignViewGeneratorDimensionObj,
	masterCellsByKey: Map<string, SheetDesignCellObj>,
) {
	if (!dimension?.key || !dimension.source) {
		return [];
	}

	if (dimension.source.type === 'STATIC_VALUES') {
		return (dimension.source.values || [])
			.filter((value) => typeof value?.value === 'string' && !!value.value)
			.map((value) => ({
				key: dimension.key,
				value: value.value,
				label: value.label || value.value,
				sourceCellKey: null,
			}));
	}

	if (dimension.source.type === 'MASTER_CELL_OPTIONS') {
		const cellKey = dimension.source.cellKey;
		const cell = masterCellsByKey.get(cellKey);

		return (cell?.options || [])
			.filter((option) => typeof option?.value === 'string' && !!option.value)
			.map((option) => ({
				key: dimension.key,
				value: option.value,
				label: option.label || option.value,
				sourceCellKey: cellKey,
			}));
	}

	return [];
}

/*
 * Return all dimension value groups for a generated grouped-row view.
 */

function getSheetViewGeneratorValueGroups(
	view: SheetDesignViewObj,
	masterCells: SheetDesignCellObj[],
	referenceDate: Date,
) {
	const generator = view.rowModel?.generator;
	const masterCellsByKey = new Map(masterCells.map((cell) => [cell.key, cell]));
	const groups: Array<Array<{
		key: string;
		value: string;
		label: string;
		grain?: 'DAY' | 'WEEK';
		sourceCellKey?: string | null;
	}>> = [];

	const dateValues = getSheetViewDateSeriesValues(generator?.dateSeries, referenceDate);
	if (dateValues.length) {
		groups.push(dateValues);
	}

	(generator?.dimensions || []).forEach((dimension) => {
		const values = getSheetViewGeneratorDimensionValues(dimension, masterCellsByKey);
		if (values.length) {
			groups.push(values);
		}
	});

	return groups;
}

/*
 * Return every cartesian combination of generated date and dimension values.
 */

function getSheetViewGeneratorCombinations(
	groups: Array<Array<{
		key: string;
		value: string;
		label: string;
		grain?: 'DAY' | 'WEEK';
		sourceCellKey?: string | null;
	}>>,
) {
	return groups.reduce((combinations, group) => {
		if (!combinations.length) {
			return group.map((value) => [value]);
		}

		return combinations.flatMap((combination) => group.map((value) => combination.concat(value)));
	}, [] as Array<Array<{
		key: string;
		value: string;
		label: string;
		grain?: 'DAY' | 'WEEK';
		sourceCellKey?: string | null;
	}>>);
}

/*
 * Return the stable row key for one generated row combination.
 */

function getSheetViewGeneratedRowKey(
	keyPrefix: string,
	combination: Array<{
		key: string;
		value: string;
	}>,
) {
	const segments = combination.map((value) => `${value.key}=${encodeURIComponent(value.value)}`);

	return `${keyPrefix}:${segments.join(':')}`;
}

/*
 * Return generated row definitions for one grouped-row view generator.
 */

export function getSheetViewGeneratedRowDefinitions(
	view: SheetDesignViewObj,
	masterCells: SheetDesignCellObj[],
	referenceDate: Date = new Date(),
) {
	if (!isSheetViewGeneratedRowsView(view)) {
		return [];
	}

	const generator = view.rowModel!.generator!;
	const groups = getSheetViewGeneratorValueGroups(view, masterCells, referenceDate);
	const combinations = getSheetViewGeneratorCombinations(groups);

	return combinations.map((combination, index) => {
		const cellValues = combination.reduce((values, value) => {
			values[value.key] = value.label;
			return values;
		}, {} as Record<string, string | number>);
		const dateValue = combination.find((value) => value.key === generator.dateSeries?.key);
		const dimensionValues = combination.filter((value) => value.key !== generator.dateSeries?.key);

		return {
			viewRowKey: getSheetViewGeneratedRowKey(generator.keyPrefix, combination),
			position: index + 1,
			cellValues,
			criteria: {
				date: dateValue && dateValue.grain
					? {
						key: dateValue.key,
						value: dateValue.value,
						grain: dateValue.grain,
						sourceCellKey: dateValue.sourceCellKey || dateValue.key,
					}
					: undefined,
				dimensions: dimensionValues.map((value) => ({
					key: value.key,
					value: value.value,
					sourceCellKey: value.sourceCellKey,
				})),
			},
		} satisfies GeneratedSheetViewRowDefinition;
	});
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
		fieldType: masterCell?.fieldType || column.fieldType || column.humanFieldType as SheetFieldTypeEnum,
		humanFieldType: column.humanFieldType,
		source: column.source?.type === 'RELATED_RECORD' && column.source.path && column.source.table
			? {
				path: column.source.path,
				table: column.source.table,
			}
			: masterCell?.source || null,
		options: column.options || masterCell?.options || [],
		openLink: column.openLink ?? masterCell?.openLink,
		humansOnly: masterCell?.humansOnly,
		humansCannotEdit: column.humansCannotEdit ?? masterCell?.humansCannotEdit ?? (
			column.source?.type !== 'MASTER_CELL' &&
			column.source?.type !== 'CUSTOM'
		),
		indexed: masterCell?.indexed,
		width: column.width ?? null,
		viewSource: column.source || null,
	} as SheetDesignCellObj & {
		viewSource?: SheetDesignViewColumnObj['source'] | null;
	};
}
