import { formatCalDateInTimeZone, parseDateInTimezone } from '@jsb188/app/utils/timeZone.ts';
import {
	DATA_TABLE_COLUMN_MAX_WIDTH,
	DATA_TABLE_COLUMN_MIN_WIDTH,
} from '../constants/dataTable.ts';
import type {
	DataTableDesignCellObj,
	DataTableDesignObj,
	DataTableDesignViewColumnObj,
	DataTableDesignViewGeneratorDimensionObj,
	DataTableDesignViewObj,
	DataTableFieldTypeEnum,
	DataTableRecordValue,
} from '../types/dataTable.d.ts';

export type GeneratedDataTableViewRowDefinition = {
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
 * Keep a user-resized dataTable column width inside the usable spreadsheet range.
 */

export function clampDataTableColumnWidth(width: number) {
	return Math.min(DATA_TABLE_COLUMN_MAX_WIDTH, Math.max(DATA_TABLE_COLUMN_MIN_WIDTH, Math.round(width)));
}

/*
 * Check whether a value is a non-array object.
 */

function isPlainObject(value: any): value is Record<string, any> {
	return !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
}

/*
 * Return non-hidden master dataTable design cells in their saved order.
 */

export function getOrderedDataTableDesignCells(design: DataTableDesignObj | null | undefined) {
	const cells = Array.isArray(design?.cells) ? design.cells : [];
	const cellsByKey = new Map(cells.map((cell) => [cell.key, cell]));
	const orderedCells = (design?.cellsOrder || [])
		.map((key) => cellsByKey.get(key))
		.filter((cell) => cell && !cell.hidden) as DataTableDesignCellObj[];
	const orderedKeys = new Set(orderedCells.map((cell) => cell.key));
	const remainingCells = cells.filter((cell) => !cell.hidden && !orderedKeys.has(cell.key));

	return orderedCells.concat(remainingCells);
}

/*
 * Return whether one dataTable view column reads from a master dataTable cell.
 */

export function isDataTableViewMasterCellColumn(column: DataTableDesignViewColumnObj | null | undefined) {
	return column?.source?.type === 'MASTER_CELL' && typeof column.source.cellKey === 'string' && !!column.source.cellKey;
}

/*
 * Return whether one dataTable field type stores and compares values as numbers.
 */

export function isDataTableNumberLikeFieldType(fieldType: DataTableFieldTypeEnum | null | undefined) {
	return fieldType === 'NUMBER' || fieldType === 'PRICE';
}

/*
 * Return whether one dataTable field type stores and compares values as dates.
 */

export function isDataTableDateLikeFieldType(fieldType: DataTableFieldTypeEnum | null | undefined) {
	return fieldType === 'DATE' || fieldType === 'WEEK_OF_MON' || fieldType === 'WEEK_OF_SUN';
}

/*
 * Return whether one dataTable field type displays a calendar week range.
 */

export function isDataTableWeekFieldType(fieldType: DataTableFieldTypeEnum | null | undefined) {
	return fieldType === 'WEEK_OF_MON' || fieldType === 'WEEK_OF_SUN';
}

/*
 * Return the UTC day-of-week index used as the start for a week field type.
 */

function getDataTableWeekStartDay(fieldType: DataTableFieldTypeEnum | null | undefined) {
	return fieldType === 'WEEK_OF_SUN' ? 0 : 1;
}

/*
 * Return the scalar value from a dataTable record-like object input.
 */

function getDataTableRecordScalarValue(value: DataTableRecordValue | Date) {
	if (isPlainObject(value) && 'value' in value) {
		return value.value as DataTableRecordValue;
	}

	return value;
}

/*
 * Return whether one value is a valid finite number input for a dataTable cell.
 */

function isValidDataTableNumberValue(value: DataTableRecordValue) {
	const numberValue = typeof value === 'number' ? value : Number(value);

	return Number.isFinite(numberValue);
}

/*
 * Return whether a date string points at a real calendar date.
 */

function isValidDataTableDateKey(value: string) {
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
 * Return a YYYY-MM-DD string for one date using UTC calendar fields.
 */

function formatDateKey(date: Date) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
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
 * Return whether one value can be stored as a dataTable date cell.
 */

function isValidDataTableDateValue(value: DataTableRecordValue | Date) {
	const scalarValue = getDataTableRecordScalarValue(value);

	if (scalarValue instanceof Date) {
		return Number.isFinite(scalarValue.getTime());
	}

	if (isValidDataTableDateKey(String(scalarValue).split('T')[0])) {
		return true;
	}

	return Number.isFinite(new Date(String(scalarValue)).getTime());
}

/*
 * Return the calendar date key represented by one date value in a timezone.
 */

function getDataTableDateValueCalendarKey(value: DataTableRecordValue | Date, timeZone?: string | null) {
	const scalarValue = getDataTableRecordScalarValue(value);

	if (scalarValue instanceof Date) {
		return formatCalDateInTimeZone(scalarValue, timeZone || null);
	}

	const stringValue = String(scalarValue);
	if (isValidDataTableDateKey(stringValue)) {
		return stringValue;
	}

	const parsedDate = parseDateInTimezone(stringValue, timeZone, 0, stringValue.includes('T'));
	if (Number.isFinite(parsedDate.getTime())) {
		return formatCalDateInTimeZone(parsedDate, timeZone || null);
	}

	return stringValue.split('T')[0];
}

/*
 * Return the canonical date key for a dataTable date-like value.
 */

export function getDataTableDateValueKey(value: DataTableRecordValue | Date) {
	const scalarValue = getDataTableRecordScalarValue(value);

	return scalarValue instanceof Date ? scalarValue.toISOString().split('T')[0] : String(scalarValue).split('T')[0];
}

/*
 * Return a date string normalized to the configured dataTable week start.
 */

export function normalizeDataTableWeekDateValue(value: DataTableRecordValue | Date, fieldType: DataTableFieldTypeEnum, timeZone?: string | null) {
	const dateKey = getDataTableDateValueCalendarKey(value, timeZone);
	const date = parseDateKey(dateKey);
	if (!date || !isDataTableWeekFieldType(fieldType)) {
		return dateKey;
	}

	const startDay = getDataTableWeekStartDay(fieldType);
	const offset = (date.getUTCDay() - startDay + 7) % 7;

	return formatDateKey(addDays(date, -offset));
}

/*
 * Return a date string normalized for storage by one date-like dataTable field.
 */

export function normalizeDataTableDateLikeValue(value: DataTableRecordValue | Date, fieldType: DataTableFieldTypeEnum, timeZone?: string | null) {
	return isDataTableWeekFieldType(fieldType) ? normalizeDataTableWeekDateValue(value, fieldType, timeZone) : getDataTableDateValueCalendarKey(value, timeZone);
}

/*
 * Return the canonical ISO datetime string for a dataTable datetime value in one timezone.
 */

export function normalizeDataTableDateTimeValue(value: DataTableRecordValue | Date, timeZone?: string | null) {
	const scalarValue = getDataTableRecordScalarValue(value);

	return parseDateInTimezone(
		scalarValue instanceof Date ? scalarValue : String(scalarValue),
		timeZone,
		0,
		typeof scalarValue === 'string',
	).toISOString();
}

/*
 * Return whether one value can be stored as a dataTable datetime cell.
 */

function isValidDataTableDateTimeValue(value: DataTableRecordValue) {
	const scalarValue = getDataTableRecordScalarValue(value);
	const date = scalarValue instanceof Date ? scalarValue : new Date(String(scalarValue));

	return Number.isFinite(date.getTime());
}

/*
 * Return whether one value is included in a dataTable cell's saved options.
 */

function isDataTableOptionValue(cell: DataTableDesignCellObj, value: unknown) {
	const validValues = new Set((cell.options || []).map((option) => String(option.value)));

	return validValues.has(String(value));
}

/*
 * Return the normalized string used for case-insensitive dataTable option matching.
 */

function getNormalizedDataTableOptionText(value: unknown) {
	return String(value).toLowerCase();
}

/*
 * Return whether one dataTable design cell should normalize select option values.
 */

function isDataTableSelectOptionNormalizeField(cell: DataTableDesignCellObj) {
	return cell.fieldType === 'SELECT' ||
		cell.fieldType === 'SELECT_OR_TEXT' ||
		cell.humanFieldType === 'SELECT' ||
		cell.humanFieldType === 'SELECT_OR_TEXT';
}

/*
 * Return the saved option value when one select-style cell input matches an option value or label.
 */

export function normalizeDataTableSelectOptionValue(cell: DataTableDesignCellObj, value: DataTableRecordValue) {
	if (value === null || !isDataTableSelectOptionNormalizeField(cell)) {
		return value;
	}

	if (isDataTableOptionValue(cell, value)) {
		return value;
	}

	const normalizedValue = getNormalizedDataTableOptionText(value);
	const option = (cell.options || []).find((item) => (
		getNormalizedDataTableOptionText(item.value) === normalizedValue ||
		getNormalizedDataTableOptionText(item.label) === normalizedValue
	));

	return option ? option.value : value;
}

/*
 * Return a user-readable validation error for an invalid dataTable cell value.
 */

export function getDataTableCellValueValidationError(
	cell: DataTableDesignCellObj,
	value: DataTableRecordValue,
) {
	if (value === null) {
		return null;
	}

	if (isDataTableNumberLikeFieldType(cell.fieldType) && !isValidDataTableNumberValue(value)) {
		return `${cell.key} must be a valid number.`;
	}

	if (isDataTableDateLikeFieldType(cell.fieldType) && !isValidDataTableDateValue(value)) {
		return `${cell.key} must be a valid date.`;
	}

	if (cell.fieldType === 'DATETIME' && !isValidDataTableDateTimeValue(value)) {
		return `${cell.key} must be a valid datetime.`;
	}

	if (cell.fieldType === 'SELECT' && cell.options?.length && !isDataTableOptionValue(cell, value)) {
		return `${cell.key} must be one of: ${(cell.options || []).map((option) => option.value).join(', ')}`;
	}

	if (cell.fieldType === 'SELECT_OR_TEXT' && !isDataTableOptionValue(cell, value) && typeof value !== 'string') {
		const optionsText = (cell.options || []).map((option) => option.value).join(', ');
		return optionsText ? `${cell.key} must be one of: ${optionsText}, or a text string.` : `${cell.key} must be a text string.`;
	}

	if (cell.fieldType === 'MULTI_SELECT') {
		if (!Array.isArray(value)) {
			return `${cell.key} must be an array of option values.`;
		}

		if (cell.options?.length) {
			const invalidValues = value.filter((item) => !isDataTableOptionValue(cell, item));
			if (invalidValues.length) {
				return `${cell.key} contains invalid option values: ${invalidValues.map((item) => String(item)).join(', ')}. ` +
					`Allowed values: ${(cell.options || []).map((option) => option.value).join(', ')}`;
			}
		}
	}

	return null;
}

/*
 * Return a compact month-day string for dataTable week display labels.
 */

function getDataTableWeekDisplayMonthDay(date: Date, showMonth: boolean) {
	const day = String(date.getUTCDate());
	if (!showMonth) {
		return day;
	}

	const month = date.toLocaleString('en-US', {
		month: 'short',
		timeZone: 'UTC',
	});

	return `${month} ${day}`;
}

/*
 * Return the display text for one date as a dataTable week range.
 */

export function formatDataTableWeekDateRange(value: DataTableRecordValue | Date, fieldType: DataTableFieldTypeEnum) {
	if (!isDataTableWeekFieldType(fieldType)) {
		return '';
	}

	const start = parseDateKey(normalizeDataTableWeekDateValue(value, fieldType));
	if (!start) {
		return '';
	}

	const end = addDays(start, 6);
	const startText = getDataTableWeekDisplayMonthDay(start, true);
	const endText = getDataTableWeekDisplayMonthDay(end, start.getUTCMonth() !== end.getUTCMonth());

	return `${startText} - ${endText}`;
}

/*
 * Return whether one saved view has a usable generated grouped-row model.
 */

export function isDataTableViewGeneratedRowsView(view: DataTableDesignViewObj | null | undefined) {
	return view?.rowModel?.type === 'GROUPED_ROWS' &&
		typeof view.rowModel.generator?.keyPrefix === 'string' &&
		!!view.rowModel.generator.keyPrefix;
}

/*
 * Return validated stored views from a dataTable design object.
 */

export function getDataTableDesignViews(design: DataTableDesignObj | null | undefined) {
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
	}) as DataTableDesignViewObj[];
}

/*
 * Return the stored views in the order that dataTable tabs should display them.
 */

export function getOrderedDataTableDesignViews(design: DataTableDesignObj | null | undefined) {
	const views = getDataTableDesignViews(design);
	const viewsById = new Map(views.map((view) => [view.id, view]));
	const orderedViews = (design?.viewsOrder || [])
		.map((viewId) => viewsById.get(viewId))
		.filter(Boolean) as DataTableDesignViewObj[];
	const orderedIds = new Set(orderedViews.map((view) => view.id));
	const remainingViews = views.filter((view) => !orderedIds.has(view.id));

	return orderedViews.concat(remainingViews);
}

/*
 * Return the displayable columns for one dataTable view in saved order.
 */

export function getOrderedDataTableDesignViewColumns(view: DataTableDesignViewObj | null | undefined) {
	const columns = Array.isArray(view?.columns) ? view.columns : [];
	const columnsByKey = new Map(columns.map((column) => [column.key, column]));
	const orderedColumns = (view?.columnsOrder || [])
		.map((columnKey) => columnsByKey.get(columnKey))
		.filter(Boolean) as DataTableDesignViewColumnObj[];
	const orderedKeys = new Set(orderedColumns.map((column) => column.key));
	const remainingColumns = columns.filter((column) => !orderedKeys.has(column.key));

	return orderedColumns.concat(remainingColumns);
}

/*
 * Return every column key once, honoring a saved order before appending missing keys.
 */

export function getCompleteDataTableColumnOrder(
	columnKeys: string[],
	savedOrder?: string[] | null,
) {
	const validKeys = new Set(columnKeys);
	const orderedKeys: string[] = [];
	const seenKeys = new Set<string>();

	(savedOrder || []).forEach((key) => {
		if (!validKeys.has(key) || seenKeys.has(key)) {
			return;
		}

		orderedKeys.push(key);
		seenKeys.add(key);
	});

	columnKeys.forEach((key) => {
		if (seenKeys.has(key)) {
			return;
		}

		orderedKeys.push(key);
		seenKeys.add(key);
	});

	return orderedKeys;
}

/*
 * Move one visible dataTable column while preserving hidden or unrendered key slots.
 */

export function moveVisibleDataTableColumnKeyInOrder(params: {
	allColumnKeys: string[];
	fromKey: string;
	savedOrder?: string[] | null;
	toVisibleIndex: number;
	visibleColumnKeys: string[];
}) {
	const fullOrder = getCompleteDataTableColumnOrder(params.allColumnKeys, params.savedOrder);
	const visibleKeySet = new Set(params.visibleColumnKeys);
	const visibleOrder = fullOrder.filter((key) => visibleKeySet.has(key));
	const fromIndex = visibleOrder.indexOf(params.fromKey);

	if (fromIndex < 0) {
		return fullOrder;
	}

	const nextVisibleOrder = visibleOrder.slice(0);
	const [movedKey] = nextVisibleOrder.splice(fromIndex, 1);
	const toIndex = Math.max(0, Math.min(params.toVisibleIndex, nextVisibleOrder.length));

	if (!movedKey) {
		return fullOrder;
	}

	nextVisibleOrder.splice(toIndex, 0, movedKey);

	let visibleIndex = 0;
	return fullOrder.map((key) => {
		if (!visibleKeySet.has(key)) {
			return key;
		}

		const nextKey = nextVisibleOrder[visibleIndex] || key;
		visibleIndex += 1;

		return nextKey;
	});
}

/*
 * Return the inclusive start and end dates for one generated date series.
 */

function getDataTableViewDateSeriesRange(
	dateSeries: NonNullable<NonNullable<DataTableDesignViewObj['rowModel']>['generator']>['dateSeries'],
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

function getDataTableViewDateSeriesValues(
	dateSeries: NonNullable<NonNullable<DataTableDesignViewObj['rowModel']>['generator']>['dateSeries'],
	referenceDate: Date,
) {
	const range = getDataTableViewDateSeriesRange(dateSeries, referenceDate);
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

function getDataTableViewGeneratorDimensionValues(
	dimension: DataTableDesignViewGeneratorDimensionObj,
	masterCellsByKey: Map<string, DataTableDesignCellObj>,
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

function getDataTableViewGeneratorValueGroups(
	view: DataTableDesignViewObj,
	masterCells: DataTableDesignCellObj[],
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

	const dateValues = getDataTableViewDateSeriesValues(generator?.dateSeries, referenceDate);
	if (dateValues.length) {
		groups.push(dateValues);
	}

	(generator?.dimensions || []).forEach((dimension) => {
		const values = getDataTableViewGeneratorDimensionValues(dimension, masterCellsByKey);
		if (values.length) {
			groups.push(values);
		}
	});

	return groups;
}

/*
 * Return every cartesian combination of generated date and dimension values.
 */

function getDataTableViewGeneratorCombinations(
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

function getDataTableViewGeneratedRowKey(
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

export function getDataTableViewGeneratedRowDefinitions(
	view: DataTableDesignViewObj,
	masterCells: DataTableDesignCellObj[],
	referenceDate: Date = new Date(),
) {
	if (!isDataTableViewGeneratedRowsView(view)) {
		return [];
	}

	const generator = view.rowModel!.generator!;
	const groups = getDataTableViewGeneratorValueGroups(view, masterCells, referenceDate);
	const combinations = getDataTableViewGeneratorCombinations(groups);

	return combinations.map((combination, index) => {
		const cellValues = combination.reduce((values, value) => {
			values[value.key] = value.label;
			return values;
		}, {} as Record<string, string | number>);
		const dateValue = combination.find((value) => value.key === generator.dateSeries?.key);
		const dimensionValues = combination.filter((value) => value.key !== generator.dateSeries?.key);

		return {
			viewRowKey: getDataTableViewGeneratedRowKey(generator.keyPrefix, combination),
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
		} satisfies GeneratedDataTableViewRowDefinition;
	});
}

/*
 * Convert a view column into the same design-cell shape used by the grid renderer.
 */

export function mapDataTableDesignViewColumnToCell(
	column: DataTableDesignViewColumnObj,
	masterCellsByKey: Map<string, DataTableDesignCellObj>,
) {
	const masterCell = isDataTableViewMasterCellColumn(column)
		? masterCellsByKey.get(column.source!.cellKey!)
		: null;

	return {
		key: column.key,
		label: column.label || masterCell?.label || column.key,
		humanLabel: column.humanLabel ?? null,
		iconName: column.iconName ?? masterCell?.iconName ?? null,
		fieldType: masterCell?.fieldType || column.fieldType || column.humanFieldType as DataTableFieldTypeEnum,
		humanFieldType: column.humanFieldType,
		format: masterCell?.format ?? null,
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
	} as DataTableDesignCellObj & {
		viewSource?: DataTableDesignViewColumnObj['source'] | null;
	};
}
