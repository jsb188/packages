import i18n from '@jsb188/app/i18n/index.ts';
import { getReadableCalDate } from '@jsb188/app/utils/datetime.ts';
import { formatCurrency } from '@jsb188/app/utils/number.ts';
import type { SetFloatingMessage } from '@jsb188/react-web/modules/Layout';
import { Calendar, type CalendarSelectedObj } from '@jsb188/react-web/modules/Calendar';
import {
	SheetSaveButton,
	SheetSelectEditor,
	getValidSheetOptionColor,
	SHEET_ROW_HEIGHT,
	SHEET_ROW_NUMBER_WIDTH,
	SHEET_STICKY_SPACER_SIZE,
	type SheetColumnMetric,
	type SheetUIEditState,
	type SheetUIEditorClickSource,
	type SheetUIFieldType,
	type SheetUIOption,
} from '@jsb188/react-web/ui/SheetUI';
import type {
	DataTableCellGQL,
	DataTableDesignCellGQL,
	DataTableDesignGQL,
	DataTableDesignViewColumnGQL,
	DataTableDesignViewGQL,
	DataTableFieldTypeGQL,
	DataTableGQL,
	DataTableRowGQL,
} from '@jsb188/mday/types/dataTable.d.ts';
import {
	formatDataTableWeekDateRange,
	isDataTableDateLikeFieldType,
	isDataTableNumberLikeFieldType,
	isDataTableWeekFieldType,
	normalizeDataTableDateLikeValue,
} from '@jsb188/mday/utils/dataTable.ts';
import { DateTime } from 'luxon';
import { type ReactNode, useState } from 'react';

export const DATA_TABLE_SELECT_EDITOR_MIN_WIDTH = 140;
export const DATA_TABLE_SELECT_EDITOR_MAX_WIDTH = 400;
export const DATA_TABLE_DATE_EDITOR_WIDTH = 280;
export const DATA_TABLE_INBOUND_CONTACT_EDITOR_MIN_WIDTH = 320;
export const DATA_TABLE_LOCAL_EDITOR_LEFT_OFFSET = -2;
export const DATA_TABLE_LOCAL_EDITOR_TOP_OFFSET = -1;
export const DATA_TABLE_LOCAL_EDITOR_WIDTH_OFFSET = 3;
export const DATA_TABLE_LOCAL_EDITOR_Z_INDEX = 32;
export const DATA_TABLE_STICKY_LOCAL_EDITOR_Z_INDEX = 43;
export const DATA_TABLE_READ_ONLY_TAG_HEIGHT = 18;
export const DATA_TABLE_READ_ONLY_TAG_TOP_OFFSET = 4;
export const DATA_TABLE_READ_ONLY_TAG_Z_INDEX = 33;
export const DATA_TABLE_DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const DATA_TABLE_CELL_DISPLAY_PILL_PADDING_X = 5;
export const DATA_TABLE_CELL_DISPLAY_PILL_PADDING_Y = 2;
export const DATA_TABLE_CELL_DISPLAY_PILL_RADIUS = 4;
export const DATA_TABLE_CELL_DISPLAY_ICON_SIZE = 15.4; // This must be the exact px size of the icon when HTML renders it using font-size, use inspect element to get this value
export const DATA_TABLE_CELL_DISPLAY_ICON_GAP = 5;

export type DataTableParsedEditorValue = {
	value: string | null;
	error?: string;
};

export type DataTableRuntimeDesignCell = DataTableDesignCellGQL & {
	runtimeKey?: string;
	viewSource?: DataTableDesignViewColumnGQL['source'] | null;
};

export type DataTableCellLookup = {
	cell?: DataTableCellGQL | null;
	designCell: DataTableRuntimeDesignCell;
	row: DataTableRowGQL;
};

export type DataTableCellDisplayModelKind = 'plain' | 'selectPill' | 'link' | 'iconLink';

export type DataTableCellDisplayModel = {
	canEdit: boolean;
	canOpen: boolean;
	draftValue: string;
	iconGap: number;
	iconName?: string | null;
	iconSize: number;
	isCustomSelectValue?: boolean;
	kind: DataTableCellDisplayModelKind;
	pillBackgroundCssVar?: string | null;
	pillColorName?: string | null;
	pillPaddingX: number;
	pillPaddingY: number;
	pillRadius: number;
	signature: string;
	text: string;
};

export type DataTableLocalEditorPosition = {
	isStickyLeft: boolean;
	left: number;
	rowWidth: number;
	top: number;
	width: number;
};

type SheetEditorFieldType = DataTableFieldTypeGQL | SheetUIFieldType | 'ID_OR_TEXT';

/*
 * Return translated UI text when translations are loaded, with a stable fallback for tests.
 */
export function getDataTableTranslatedText(key: string, fallback: string) {
	return i18n.has(key) ? i18n.t(key) : fallback;
}

/*
 * Return the source master cell key that one runtime column should read and write.
 */
export function getDataTableRuntimeCellKey(designCell: DataTableRuntimeDesignCell) {
	if (designCell.viewSource?.type === 'MASTER_CELL' && designCell.viewSource.cellKey) {
		return designCell.viewSource.cellKey;
	}

	return designCell.key;
}

/*
 * Return the UI/runtime identity for one column, which can differ from the stored cell key.
 */
export function getDataTableRuntimeColumnKey(designCell: Pick<DataTableRuntimeDesignCell, 'key' | 'runtimeKey'>) {
	return designCell.runtimeKey || designCell.key;
}

/*
 * Return the human-facing header label for one dataTable design cell.
 */
export function getDataTableDesignCellHeaderLabel(designCell: DataTableDesignCellGQL) {
	return designCell.humanLabel || designCell.label || designCell.key;
}

/*
 * Return the field type that should drive human-facing edit behavior.
 */
export function getSheetEditorFieldType(designCell: Pick<DataTableDesignCellGQL, 'fieldType' | 'humanFieldType'>) {
	const fieldType = designCell.fieldType as SheetEditorFieldType;

	if (fieldType === 'ID_OR_TEXT') {
		return designCell.humanFieldType;
	}

	if (fieldType === 'ID' && designCell.humanFieldType === 'SELECT_OR_TEXT') {
		return designCell.humanFieldType;
	}

	return designCell.fieldType;
}

/*
 * Return whether one runtime cell is available for direct human edits.
 */
export function canEditDataTableRuntimeCell(params: { activeView?: DataTableDesignViewGQL | null; design: DataTableDesignGQL; designCell: DataTableDesignCellGQL; disabled?: boolean }) {
	return !params.disabled && !params.design.humansCannotEdit && !params.activeView?.humansCannotEdit && !params.designCell.humansCannotEdit;
}

/*
 * Convert a GraphQL design cell into an app-agnostic UI column.
 */
export function getDataTableSheetUIColumn(designCell: DataTableRuntimeDesignCell) {
	const columnKey = getDataTableRuntimeColumnKey(designCell);

	return {
		id: columnKey,
		key: columnKey,
		label: getDataTableDesignCellHeaderLabel(designCell),
		fieldType: getSheetEditorFieldType(designCell) as SheetUIFieldType,
		humanFieldType: designCell.humanFieldType as SheetUIFieldType,
		options: designCell.options || [],
		openLink: designCell.openLink,
		humansCannotEdit: designCell.humansCannotEdit,
	};
}

/*
 * Parse one persisted dataTable cell string into a displayable JavaScript value.
 */
export function parseDataTableRawValue(value?: unknown | null) {
	if (value === undefined || value === null || value === '') {
		return null;
	}

	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

/*
 * Convert any dataTable value into the string shown inside a grid cell.
 */
export function stringifyDataTableDisplayValue(value: unknown) {
	if (value === undefined || value === null) {
		return '';
	}

	if (typeof value === 'string') {
		return value;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	return JSON.stringify(value);
}

/*
 * Return the persisted cell value for a given field type.
 */
export function getDataTableCellSerializedValue(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null) {
	if (optimisticValue !== undefined) {
		return optimisticValue;
	}

	if (!cell) {
		return null;
	}

	if (isDataTableNumberLikeFieldType(designCell.fieldType) && typeof cell.numberValue === 'number' && Number.isFinite(cell.numberValue)) {
		return String(cell.numberValue);
	}

	if (designCell.fieldType === 'BOOLEAN' && cell.booleanValue !== undefined && cell.booleanValue !== null) {
		return String(cell.booleanValue);
	}

	if (isDataTableDateLikeFieldType(designCell.fieldType) && cell.dateValue) {
		return String(cell.dateValue).split('T')[0];
	}

	if (designCell.fieldType === 'DATETIME' && cell.datetimeValue) {
		return String(cell.datetimeValue);
	}

	return cell.value ?? cell.textValue ?? null;
}

/*
 * Return whether one cell displays a live value from another dataTable cell.
 */
export function isDataTableReferenceCell(cell: DataTableCellGQL | null | undefined) {
	return cell?.referenceStatus === 'ACTIVE' || cell?.referenceStatus === 'DELETED';
}

/*
 * Find the label for a select value from one design cell.
 */
export function getDataTableOptionLabel(designCell: DataTableDesignCellGQL, value: string) {
	return designCell.options?.find((option) => option.value === value)?.label || value;
}

/*
 * Check whether one dataTable field type should display select option styling.
 */
export function isDataTableSelectDisplayFieldType(humanFieldType: DataTableFieldTypeGQL | null | undefined) {
	return humanFieldType === 'SELECT' || humanFieldType === 'SELECT_OR_TEXT';
}

/*
 * Return the background color class for one select-style dataTable cell value.
 */
export function getDataTableSelectDisplayColorClassName(designCell: DataTableDesignCellGQL, value: string) {
	const option = designCell.options?.find((item) => item.value === value);
	return `bg_${getValidSheetOptionColor(option?.color)}_md`;
}

/*
 * Return the matched dataTable option for one select-style display value.
 */
export function getDataTableSelectDisplayOption(designCell: DataTableDesignCellGQL, value: string) {
	return designCell.options?.find((item) => item.value === value) || null;
}

/*
 * Return the stable color token used by one select-style dataTable cell value, including custom-value fallback color.
 */
export function getDataTableSelectDisplayColorName(designCell: DataTableDesignCellGQL, value: string) {
	const option = getDataTableSelectDisplayOption(designCell, value);
	return getValidSheetOptionColor(option?.color);
}

/*
 * Return the CSS variable name that backs a select-style dataTable display color.
 */
export function getDataTableSelectDisplayBackgroundCssVar(colorName: string) {
	return `--color-${colorName}-medium`;
}

/*
 * Return the hover background class for one select-style dataTable cell with a matched option color.
 */
export function getDataTableSelectCellClassName(designCell: DataTableDesignCellGQL, value: string) {
	const option = designCell.options?.find((item) => item.value === value);
	return `bg_${getValidSheetOptionColor(option?.color)}_fd_hv`;
}

/*
 * Return whether a value is a calendar date key that must not shift by timezone.
 */
export function isDataTableDateKeyValue(value: unknown): value is string {
	return typeof value === 'string' && DATA_TABLE_DATE_KEY_REGEX.test(value);
}

/*
 * Apply the dataTable display timezone to one DateTime when the timezone is valid.
 */
export function getDataTableDateTimeInDisplayZone(dateTime: DateTime, timeZone?: string | null) {
	if (!timeZone) {
		return dateTime;
	}

	const zonedDateTime = dateTime.setZone(timeZone);
	return zonedDateTime.isValid ? zonedDateTime : dateTime;
}

/*
 * Format one readable date value without applying timezone shifts to date keys.
 */
export function getReadableDataTableDateDisplayValue(value: string | number | Date, timeZone?: string | null) {
	try {
		return getReadableCalDate(value instanceof Date ? value : String(value), isDataTableDateKeyValue(value) ? null : timeZone);
	} catch {
		return null;
	}
}

/*
 * Parse one dataTable date-like display value into a Luxon DateTime.
 */
export function getDataTableDateTimeFromDisplayValue(value: unknown, timeZone?: string | null) {
	if (isDataTableDateKeyValue(value)) {
		return DateTime.fromISO(value);
	}

	if (value instanceof Date) {
		return getDataTableDateTimeInDisplayZone(DateTime.fromJSDate(value), timeZone);
	}

	if (typeof value === 'number') {
		return getDataTableDateTimeInDisplayZone(DateTime.fromMillis(value), timeZone);
	}

	if (typeof value === 'string') {
		const dateTime = DateTime.fromISO(value, timeZone ? { zone: timeZone } : undefined);
		if (dateTime.isValid) {
			return dateTime;
		}

		return getDataTableDateTimeInDisplayZone(DateTime.fromISO(value), timeZone);
	}

	return null;
}

/*
 * Format one date-like dataTable value with a Luxon format string.
 */
export function getFormattedDataTableDateDisplayValue(value: unknown, format?: string | null, timeZone?: string | null) {
	if (!format) {
		return null;
	}

	const dateTime = getDataTableDateTimeFromDisplayValue(value, timeZone);
	if (!dateTime?.isValid) {
		return null;
	}

	return dateTime.toFormat(format);
}

/*
 * Format one dataTable DATE value for display in the grid.
 */
export function getDataTableDateDisplayValue(value: unknown, format?: string | null, timeZone?: string | null) {
	if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
		return '';
	}

	const formattedValue = getFormattedDataTableDateDisplayValue(value, format, timeZone);
	if (formattedValue) {
		return formattedValue;
	}

	return getReadableDataTableDateDisplayValue(value, timeZone) || stringifyDataTableDisplayValue(value);
}

/*
 * Format one dataTable DATETIME value for display in the grid.
 */
export function getDataTableDateTimeDisplayValue(value: unknown, format?: string | null, timeZone?: string | null) {
	if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
		return '';
	}

	const formattedValue = getFormattedDataTableDateDisplayValue(value, format, timeZone);
	if (formattedValue) {
		return formattedValue;
	}

	const dateTime = getDataTableDateTimeFromDisplayValue(value, timeZone);
	if (dateTime?.isValid) {
		return dateTime.toLocaleString(DateTime.DATETIME_MED);
	}

	return stringifyDataTableDisplayValue(value);
}

/*
 * Format one dataTable week value for display in the grid.
 */
export function getDataTableWeekDisplayValue(value: unknown, fieldType: DataTableFieldTypeGQL) {
	if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
		return '';
	}

	return formatDataTableWeekDateRange(value instanceof Date ? value : String(value), fieldType) || stringifyDataTableDisplayValue(value);
}

/*
 * Convert one cell and design column into the display string shown in the grid.
 */
export function getSheetCellDisplayValue(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null, timeZone?: string | null) {
	if (cell?.referenceStatus === 'DELETED') {
		return getDataTableTranslatedText('dataTable.reference_deleted', 'Deleted reference');
	}

	const rawValue = parseDataTableRawValue(getDataTableCellSerializedValue(cell, designCell, optimisticValue));

	if (designCell.humanFieldType === 'DATE') {
		return getDataTableDateDisplayValue(rawValue, designCell.format, timeZone);
	}

	if (designCell.humanFieldType === 'DATETIME') {
		return getDataTableDateTimeDisplayValue(rawValue, designCell.format, timeZone);
	}

	if (isDataTableWeekFieldType(designCell.humanFieldType)) {
		return getDataTableWeekDisplayValue(rawValue, designCell.humanFieldType);
	}

	if (designCell.humanFieldType === 'PRICE' && typeof rawValue !== 'undefined' && rawValue !== null) {
		return formatCurrency(rawValue as string | number);
	}

	if ((designCell.humanFieldType === 'SELECT' || designCell.humanFieldType === 'SELECT_OR_TEXT') && typeof rawValue === 'string') {
		return getDataTableOptionLabel(designCell, rawValue);
	}

	if (designCell.humanFieldType === 'MULTI_SELECT') {
		const values = Array.isArray(rawValue)
			? rawValue
			: typeof rawValue === 'string'
				? rawValue
						.split(',')
						.map((value) => value.trim())
						.filter(Boolean)
				: [];

		return values.map((value) => getDataTableOptionLabel(designCell, String(value))).join(', ');
	}

	return stringifyDataTableDisplayValue(rawValue);
}

/*
 * Return the display class for one cell value shown in the grid.
 */
export function getDataTableCellDisplayClassName(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null) {
	return getDataTableCellDisplayClassNameFromModel(getDataTableCellDisplayModel({
		cell,
		designCell,
		optimisticValue,
	}));
}

/*
 * Return the container class for one cell value shown in the grid.
 */
export function getDataTableCellClassName(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null) {
	return getDataTableCellClassNameFromModel(getDataTableCellDisplayModel({
		cell,
		designCell,
		optimisticValue,
	}));
}

/*
 * Convert one cell value into an editable draft string.
 */
export function getSheetEditorDraftValue(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL, optimisticValue?: string | null) {
	const serializedValue = getDataTableCellSerializedValue(cell, designCell, optimisticValue);
	const rawValue = parseDataTableRawValue(serializedValue);
	const fieldType = getSheetEditorFieldType(designCell);

	if (fieldType === 'MULTI_SELECT' && Array.isArray(rawValue)) {
		return rawValue.map((value) => String(value)).join(', ');
	}

	if (fieldType === 'DATETIME' && typeof rawValue === 'string') {
		return rawValue.slice(0, 16);
	}

	return stringifyDataTableDisplayValue(rawValue);
}

/*
 * Return whether one dataTable text value points to an external HTTP URL.
 */
export function isDataTableExternalLinkTextValue(value: unknown): value is string {
	return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

/*
 * Return whether one field type should use document-link styling when a related record exists.
 */
export function isDataTableDocumentLinkFieldType(fieldType?: DataTableFieldTypeGQL | SheetUIFieldType | 'ID_OR_TEXT' | null) {
	return fieldType === 'ID' || fieldType === 'ID_OR_TEXT';
}

/*
 * Return whether one cell has a usable related record target.
 */
export function hasDataTableCellRelatedId(cell?: DataTableCellGQL | null) {
	return cell?.relatedId !== null && cell?.relatedId !== undefined && String(cell.relatedId).trim() !== '';
}

/*
 * Return whether a related table name points to inbound contacts.
 */
export function isDataTableInboundContactRelatedTable(relatedTable?: string | null) {
	return relatedTable === 'inbound_contact' || relatedTable === 'inbound_contacts';
}

/*
 * Return whether one dataTable cell has enough data to open from the grid.
 */
export function canOpenDataTableCellLink(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL) {
	if (!designCell.openLink) {
		return false;
	}

	return isDataTableExternalLinkTextValue(cell?.textValue) || (hasDataTableCellRelatedId(cell) && isDataTableDocumentLinkFieldType(designCell.fieldType as DataTableFieldTypeGQL | 'ID_OR_TEXT'));
}

/*
 * Return the derived open-link icon for one dataTable cell when no explicit icon is set.
 */
export function getDataTableOpenLinkIconName(cell: DataTableCellGQL | null | undefined, designCell: DataTableDesignCellGQL) {
	if (!canOpenDataTableCellLink(cell, designCell)) {
		return null;
	}

	if (isDataTableExternalLinkTextValue(cell?.textValue)) {
		return 'external-link';
	}

	if (hasDataTableCellRelatedId(cell) && isDataTableDocumentLinkFieldType(designCell.fieldType as DataTableFieldTypeGQL | 'ID_OR_TEXT')) {
		return 'notes-paper-text';
	}

	return null;
}

/*
 * Return the renderer-agnostic display model shared by DataTable DOM cells and Sheet canvas cells.
 */
export function getDataTableCellDisplayModel(params: {
	canEdit?: boolean;
	cell?: DataTableCellGQL | null;
	designCell: DataTableDesignCellGQL;
	iconName?: string | null;
	optimisticValue?: string | null;
	rowDeleted?: boolean;
	timeZone?: string | null;
}): DataTableCellDisplayModel {
	const serializedValue = getDataTableCellSerializedValue(params.cell, params.designCell, params.optimisticValue);
	const rawValue = parseDataTableRawValue(serializedValue);
	const text = getSheetCellDisplayValue(params.cell, params.designCell, params.optimisticValue, params.timeZone);
	const draftValue = getSheetEditorDraftValue(params.cell, params.designCell, params.optimisticValue);
	const canOpen = !params.rowDeleted && canOpenDataTableCellLink(params.cell, params.designCell);
	const iconName = params.iconName !== undefined
		? params.iconName
		: (params.cell && 'iconName' in params.cell ? params.cell.iconName : null) || params.designCell.iconName || getDataTableOpenLinkIconName(params.cell, params.designCell);
	const canEdit = Boolean(params.canEdit);
	const isSelectPill = isDataTableSelectDisplayFieldType(params.designCell.humanFieldType) && typeof rawValue === 'string' && Boolean(rawValue);
	const selectOption = isSelectPill ? getDataTableSelectDisplayOption(params.designCell, String(rawValue)) : null;
	const isCustomSelectValue = isSelectPill && !selectOption;
	const pillColorName = isSelectPill ? getValidSheetOptionColor(selectOption?.color) : null;
	const kind: DataTableCellDisplayModelKind = isSelectPill
		? 'selectPill'
		: iconName
			? 'iconLink'
			: canOpen
				? 'link'
				: 'plain';
	const signature = [
		serializedValue ?? '',
		text,
		draftValue,
		iconName ?? '',
		params.cell?.referenceStatus ?? '',
		canEdit ? '1' : '0',
		canOpen ? '1' : '0',
		kind,
		isCustomSelectValue ? '1' : '0',
		pillColorName ?? '',
		params.designCell.fieldType,
		params.designCell.humanFieldType,
		params.designCell.format ?? '',
		params.timeZone ?? '',
		getDataTableDesignOptionsStateKey(params.designCell),
	].join('\u0000');

	return {
		canEdit,
		canOpen,
		draftValue,
		iconGap: DATA_TABLE_CELL_DISPLAY_ICON_GAP,
		iconName,
		iconSize: DATA_TABLE_CELL_DISPLAY_ICON_SIZE,
		isCustomSelectValue,
		kind,
		pillBackgroundCssVar: pillColorName ? getDataTableSelectDisplayBackgroundCssVar(pillColorName) : null,
		pillColorName,
		pillPaddingX: DATA_TABLE_CELL_DISPLAY_PILL_PADDING_X,
		pillPaddingY: DATA_TABLE_CELL_DISPLAY_PILL_PADDING_Y,
		pillRadius: DATA_TABLE_CELL_DISPLAY_PILL_RADIUS,
		signature,
		text,
	};
}

/*
 * Convert a shared display model into the DOM classes used by DataTable cell content.
 */
export function getDataTableCellDisplayClassNameFromModel(model: DataTableCellDisplayModel) {
	if (model.kind !== 'selectPill' || !model.pillColorName) {
		return undefined;
	}

	return [
		'ellip',
		`px_${model.pillPaddingX}`,
		`py_${model.pillPaddingY}`,
		`r_${model.pillRadius}`,
		`bg_${model.pillColorName}_md`,
	].join(' ');
}

/*
 * Convert a shared display model into the DOM classes used by the DataTable cell shell.
 */
export function getDataTableCellClassNameFromModel(model: DataTableCellDisplayModel) {
	if (model.kind !== 'selectPill' || !model.pillColorName) {
		return undefined;
	}

	return `bg_${model.pillColorName}_fd_hv`;
}

/*
 * Return a compact key for design options that affect rendered cell text.
 */
export function getDataTableDesignOptionsStateKey(designCell: DataTableDesignCellGQL) {
	return (designCell.options || []).map((option) => [option.label, option.value, option.color || ''].join('\u0001')).join('\u0002');
}

/*
 * Return a stable comparison key for one rendered UI cell.
 */
export function getSheetUICellSignature(p: {
	canEdit: boolean;
	canOpen: boolean;
	designCell: DataTableDesignCellGQL;
	iconName?: string | null;
	referenceStatus?: DataTableCellGQL['referenceStatus'] | null;
	serializedValue: string | null;
	timeZone?: string | null;
}) {
	return [
		p.serializedValue ?? '',
		p.iconName ?? '',
		p.referenceStatus ?? '',
		p.canEdit ? '1' : '0',
		p.canOpen ? '1' : '0',
		p.designCell.fieldType,
		p.designCell.humanFieldType,
		p.designCell.format ?? '',
		p.timeZone ?? '',
		getDataTableDesignOptionsStateKey(p.designCell),
	].join('\u0000');
}

/*
 * Return whether one editor date value is a valid calendar date key.
 */
export function isValidDataTableDateInputValue(value: string) {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) {
		return false;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));

	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/*
 * Return whether one editor datetime value can be parsed safely.
 */
export function isValidDataTableDateTimeInputValue(value: string) {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/);
	if (!match || !isValidDataTableDateInputValue(`${match[1]}-${match[2]}-${match[3]}`)) {
		return false;
	}

	const hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = match[6] === undefined ? 0 : Number(match[6]);

	return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

/*
 * Return whether one editor value matches a saved dataTable option.
 */
export function isSheetEditorOptionValue(designCell: DataTableDesignCellGQL, value: unknown) {
	return (designCell.options || []).some((option) => String(option.value) === String(value));
}

/*
 * Parse the current editor draft into the serialized value stored by GraphQL.
 */
export function parseSheetEditorValue(designCell: DataTableDesignCellGQL, draftValue: string): DataTableParsedEditorValue {
	const fieldType = getSheetEditorFieldType(designCell);
	const value = draftValue.trim();

	if (!value) {
		return { value: null };
	}

	if (isDataTableNumberLikeFieldType(fieldType)) {
		const numberValue = Number(value);

		if (!Number.isFinite(numberValue)) {
			return {
				error: 'Invalid number',
				value: null,
			};
		}

		return { value };
	}

	if (fieldType === 'BOOLEAN') {
		if (value !== 'true' && value !== 'false') {
			return {
				error: 'Invalid boolean',
				value: null,
			};
		}

		return { value };
	}

	if (isDataTableDateLikeFieldType(fieldType)) {
		if (!isValidDataTableDateInputValue(value)) {
			return {
				error: 'Invalid date',
				value: null,
			};
		}

		return { value: normalizeDataTableDateLikeValue(value, fieldType) };
	}

	if (fieldType === 'DATETIME') {
		if (!isValidDataTableDateTimeInputValue(value)) {
			return {
				error: 'Invalid datetime',
				value: null,
			};
		}

		return { value };
	}

	if (fieldType === 'SELECT' && designCell.options?.length && !isSheetEditorOptionValue(designCell, value)) {
		return {
			error: 'Invalid option',
			value: null,
		};
	}

	if (fieldType === 'MULTI_SELECT') {
		let values: string[];

		if (value.startsWith('[')) {
			try {
				const parsedValue = JSON.parse(value);

				if (!Array.isArray(parsedValue)) {
					return {
						error: 'Invalid list',
						value: null,
					};
				}

				values = parsedValue.map((item) => String(item));
			} catch {
				return {
					error: 'Invalid list',
					value: null,
				};
			}
		} else {
			values = value
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean);
		}

		if (designCell.options?.length) {
			const invalidValues = values.filter((item) => !isSheetEditorOptionValue(designCell, item));
			if (invalidValues.length) {
				return {
					error: 'Invalid option',
					value: null,
				};
			}
		}

		return { value: JSON.stringify(values) };
	}

	if (fieldType === 'JSON') {
		try {
			JSON.parse(value);
			return { value };
		} catch {
			return {
				error: 'Invalid JSON',
				value: null,
			};
		}
	}

	return { value: draftValue };
}

/*
 * Return whether one field type uses the dataTable-owned select-style editor.
 */
export function isSheetSelectEditorFieldType(fieldType?: DataTableFieldTypeGQL | SheetUIFieldType | null) {
	return fieldType === 'SELECT' || fieldType === 'SELECT_OR_TEXT' || fieldType === 'MULTI_SELECT' || fieldType === 'BOOLEAN';
}

/*
 * Return whether one field type uses the dataTable-owned date or date-time editor.
 */
export function isDataTableDateEditorFieldType(fieldType?: DataTableFieldTypeGQL | SheetUIFieldType | null) {
	return fieldType === 'DATE' || fieldType === 'WEEK_OF_MON' || fieldType === 'WEEK_OF_SUN' || fieldType === 'DATETIME';
}

/*
 * Return whether one field type uses any dataTable-owned absolute editor.
 */
export function isDataTableLocalEditorFieldType(fieldType?: DataTableFieldTypeGQL | SheetUIFieldType | null) {
	return isSheetSelectEditorFieldType(fieldType) || isDataTableDateEditorFieldType(fieldType);
}

/*
 * Return default boolean options when the dataTable design does not provide them.
 */
export function getDataTableBooleanFallbackOptions(): SheetUIOption[] {
	return [
		{
			color: null,
			label: getDataTableTranslatedText('form.yes', 'Yes'),
			value: 'true',
		},
		{
			color: null,
			label: getDataTableTranslatedText('form.no', 'No'),
			value: 'false',
		},
	];
}

/*
 * Return the option list shown by the dataTable-owned select-style editor.
 */
export function getSheetSelectEditorOptions(designCell: DataTableDesignCellGQL) {
	if (getSheetEditorFieldType(designCell) === 'BOOLEAN' && !designCell.options?.length) {
		return getDataTableBooleanFallbackOptions();
	}

	return designCell.options || [];
}

/*
 * Format one calendar selection as the serialized dataTable date value.
 */
export function getDataTableCalendarDateValue(value: CalendarSelectedObj) {
	const year = String(value.year).padStart(4, '0');
	const month = String(value.month).padStart(2, '0');
	const day = String(value.day).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/*
 * Return the date portion from a date or date-time editor draft.
 */
export function getDataTableDateEditorDateValue(draftValue: string) {
	const dateValue = draftValue.trim().split('T')[0] || '';

	return isValidDataTableDateInputValue(dateValue) ? dateValue : '';
}

/*
 * Return the time portion from a date-time editor draft.
 */
export function getDataTableDateTimeEditorTimeValue(draftValue: string) {
	const match = draftValue.trim().match(/T(\d{2}:\d{2})/);

	return match?.[1] || '00:00';
}

/*
 * Return a valid serialized date-time draft from date and time editor parts.
 */
export function getDataTableDateTimeEditorDraftValue(dateValue: string, timeValue: string) {
	const normalizedDate = isValidDataTableDateInputValue(dateValue) ? dateValue : '';
	const normalizedTime = /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : '00:00';

	return normalizedDate ? `${normalizedDate}T${normalizedTime}` : '';
}

/*
 * Return the visual row height for a dataTable row or viewport filler tail.
 */
export function getDataTableVisualRowHeight(rowIndex: number, visualRowCount: number, viewportHeight: number, stickyHeaderHeight: number, hasPlaceholderTail: boolean) {
	if (!hasPlaceholderTail || rowIndex !== visualRowCount - 1) {
		return SHEET_ROW_HEIGHT;
	}

	const usedHeight = (visualRowCount - 1) * SHEET_ROW_HEIGHT;
	const remainingHeight = viewportHeight - stickyHeaderHeight - usedHeight;

	return Math.min(SHEET_ROW_HEIGHT, Math.max(0, remainingHeight));
}

/*
 * Calculate the stable dataTable-canvas position for a dataTable-local editor.
 */
export function getDataTableLocalEditorPosition(params: {
	columnMetric?: SheetColumnMetric;
	hasPlaceholderTail: boolean;
	rowIndex: number;
	rowWidth: number;
	stickyColumnCount: number;
	stickyHeaderHeight: number;
	viewportHeight: number;
	visualRowCount: number;
	width?: number;
}): DataTableLocalEditorPosition | null {
	if (!params.columnMetric || params.rowIndex < 0) {
		return null;
	}

	const isStickyLeft = params.columnMetric.columnIndex < params.stickyColumnCount;
	const rowHeight = getDataTableVisualRowHeight(params.rowIndex, params.visualRowCount, params.viewportHeight, params.stickyHeaderHeight, params.hasPlaceholderTail);
	const left = SHEET_ROW_NUMBER_WIDTH + params.columnMetric.left + (isStickyLeft ? 0 : SHEET_STICKY_SPACER_SIZE) + DATA_TABLE_LOCAL_EDITOR_LEFT_OFFSET;
	const width = params.width ?? Math.min(Math.max(DATA_TABLE_SELECT_EDITOR_MAX_WIDTH, params.columnMetric.width), Math.max(DATA_TABLE_SELECT_EDITOR_MIN_WIDTH, params.columnMetric.width));

	return {
		isStickyLeft,
		left,
		rowWidth: params.rowWidth,
		top: params.stickyHeaderHeight + params.rowIndex * SHEET_ROW_HEIGHT + rowHeight + DATA_TABLE_LOCAL_EDITOR_TOP_OFFSET,
		width: width + DATA_TABLE_LOCAL_EDITOR_WIDTH_OFFSET,
	};
}

/*
 * Return the canvas position for a compact tag anchored above a selected dataTable cell.
 */
export function getDataTableSelectedCellTagPosition(params: {
	columnMetric?: SheetColumnMetric;
	rowIndex: number;
	rowWidth: number;
	stickyColumnCount: number;
	stickyHeaderHeight: number;
}): DataTableLocalEditorPosition | null {
	if (!params.columnMetric || params.rowIndex < 0) {
		return null;
	}

	const isStickyLeft = params.columnMetric.columnIndex < params.stickyColumnCount;
	const cellTop = params.stickyHeaderHeight + params.rowIndex * SHEET_ROW_HEIGHT;
	const left = SHEET_ROW_NUMBER_WIDTH + params.columnMetric.left + (isStickyLeft ? 0 : SHEET_STICKY_SPACER_SIZE);

	return {
		isStickyLeft,
		left,
		rowWidth: params.rowWidth,
		top: cellTop - DATA_TABLE_READ_ONLY_TAG_HEIGHT - DATA_TABLE_READ_ONLY_TAG_TOP_OFFSET,
		width: params.columnMetric.width,
	};
}

/*
 * Read the current value from an active dataTable editor element.
 */
export function getSheetEditorElementValue(element: HTMLElement) {
	if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
		return element.value;
	}

	return '';
}

/*
 * Return whether one lookup targets a related-document cell whose editing is blocked.
 */
export function isDataTableRelatedDocumentEditBlocked(lookup: DataTableCellLookup) {
	const fieldType = lookup.designCell.humanFieldType || lookup.designCell.fieldType;

	return fieldType === 'ID' && !!lookup.cell?.relatedTable && hasDataTableCellRelatedId(lookup.cell);
}

/*
 * Build the active cell edit state for one resolved dataTable cell lookup.
 */
export function getDataTableCellEditState(params: {
	clickSource?: SheetUIEditorClickSource;
	lookup: DataTableCellLookup;
	optimisticValues?: Record<string, string | null>;
}) {
	const runtimeKey = getDataTableRuntimeColumnKey(params.lookup.designCell);
	const optimisticValue = params.optimisticValues?.[`${params.lookup.row.id}:${runtimeKey}`];

	return {
		cellKey: runtimeKey,
		clickSource: params.clickSource,
		draftValue: getSheetEditorDraftValue(params.lookup.cell, params.lookup.designCell, optimisticValue),
		rowId: params.lookup.row.id,
	};
}

/*
 * Build the active cell edit state for a custom dataTable-local overlay editor.
 */
export function getDataTableCellOverlayEditState(params: {
	clickSource?: SheetUIEditorClickSource;
	lookup: DataTableCellLookup;
	optimisticValues?: Record<string, string | null>;
}) {
	return {
		...getDataTableCellEditState(params),
		disableInlineEditor: true,
	};
}

/*
 * Check whether a lookup is already represented by the active dataTable edit state.
 */
export function isDataTableEditStateLookup(editState: SheetUIEditState | null | undefined, lookup: DataTableCellLookup) {
	return editState?.rowId === lookup.row.id && editState.cellKey === getDataTableRuntimeColumnKey(lookup.designCell);
}

/*
 * Check whether a lookup owns the currently open dataTable-local editor.
 */
export function isDataTableLocalEditorEditStateLookup(editState: SheetUIEditState | null | undefined, lookup: DataTableCellLookup) {
	return isDataTableEditStateLookup(editState, lookup) && (!!editState?.disableInlineEditor || isDataTableLocalEditorFieldType(getSheetEditorFieldType(lookup.designCell)));
}

/*
 * Handle edit attempts for related-document ID cells before entering inline edit mode.
 */
export function handleDataTableRelatedDocumentCellEdit(lookup: DataTableCellLookup, setFloatingMessage?: SetFloatingMessage) {
	const fieldType = lookup.designCell.humanFieldType || lookup.designCell.fieldType;
	if (fieldType !== 'ID' || !lookup.cell?.relatedTable || !hasDataTableCellRelatedId(lookup.cell)) {
		return false;
	}

	switch (lookup.cell.relatedTable) {
		case 'logs':
			setFloatingMessage?.({
				text: getDataTableTranslatedText('dataTable.editing_temporarily_disabled_msg', 'Editing this cell is temporarily disabled.'),
				type: 'NOTICE',
			});
			return true;
		case 'inbound_contact':
		case 'inbound_contacts':
		default:
			setFloatingMessage?.({
				text: getDataTableTranslatedText('dataTable.editing_temporarily_disabled_msg', 'Editing this cell is temporarily disabled.'),
				type: 'NOTICE',
			});
			return true;
	}
}

/*
 * Return whether one resolved dataTable lookup points at an inbound contact ID cell.
 */
export function isDataTableInboundContactIdLookup(lookup: DataTableCellLookup) {
	return lookup.designCell.fieldType === 'ID' && isDataTableInboundContactRelatedTable(lookup.cell?.relatedTable) && hasDataTableCellRelatedId(lookup.cell);
}

/*
 * Return the external URL stored in one open-link dataTable cell.
 */
export function getDataTableOpenCellExternalUrl(cell: DataTableCellGQL | null | undefined) {
	const textValue = cell?.textValue;

	if (isDataTableExternalLinkTextValue(textValue)) {
		return textValue;
	}

	const value = cell?.value as unknown;

	if (isDataTableExternalLinkTextValue(value)) {
		return value;
	}

	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const nestedValue = (value as { value?: unknown }).value;
		return isDataTableExternalLinkTextValue(nestedValue) ? nestedValue : null;
	}

	return null;
}

/*
 * Anchor a dataTable-local editor to stable dataTable-canvas coordinates.
 */
export function DataTableLocalEditorContainer(p: { children: ReactNode; position: DataTableLocalEditorPosition }) {
	const editorTop = p.position.top;

	if (p.position.isStickyLeft) {
		return (
			<div
				className="abs"
				data-sheet-local-editor-anchor="true"
				style={{
					left: 0,
					top: editorTop,
					width: p.position.rowWidth,
					zIndex: DATA_TABLE_STICKY_LOCAL_EDITOR_Z_INDEX,
				}}
			>
				<div
					className="sticky"
					style={{
						left: p.position.left,
						position: 'sticky',
						width: p.position.width,
						zIndex: DATA_TABLE_STICKY_LOCAL_EDITOR_Z_INDEX,
					}}
				>
					{p.children}
				</div>
			</div>
		);
	}

	return (
		<div
			className="abs"
			data-sheet-local-editor-anchor="true"
			style={{
				left: p.position.left,
				top: editorTop,
				width: p.position.width,
				zIndex: DATA_TABLE_LOCAL_EDITOR_Z_INDEX,
			}}
		>
			{p.children}
		</div>
	);
}

/*
 * Render the read-only tag above a selected cell while preserving sticky-column positioning.
 */
export function DataTableReadOnlyTag(p: { position: DataTableLocalEditorPosition }) {
	const tag = (
		<div
			className="abs noclick nowrap px_5 py_4 ft_tn ft_medium lh_1 bg_contrast"
			data-sheet-read-only-cell-tag="true"
			style={{
				left: -1,
				top: -1,
				width: 'max-content',
				zIndex: DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
			}}
		>
			{i18n.t('form.not_editable')}
		</div>
	);

	if (p.position.isStickyLeft) {
		return (
			<div
				className="abs"
				data-sheet-read-only-cell-tag-anchor="true"
				style={{
					left: 0,
					top: p.position.top,
					width: p.position.rowWidth,
					zIndex: DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
				}}
			>
				<div
					className="sticky"
					style={{
						left: p.position.left,
						position: 'sticky',
						width: p.position.width,
						zIndex: DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
					}}
				>
					{tag}
				</div>
			</div>
		);
	}

	return (
		<div
			className="abs"
			data-sheet-read-only-cell-tag-anchor="true"
			style={{
				left: p.position.left,
				top: p.position.top,
				width: p.position.width,
				zIndex: DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
			}}
		>
			{tag}
		</div>
	);
}

/*
 * Render the dataTable-owned calendar editor for DATE and DATETIME cells.
 */
export function DataTableDateEditor(p: {
	clickSource?: SheetUIEditorClickSource;
	editState: SheetUIEditState;
	lookup: DataTableCellLookup;
	onDateValue: (lookup: DataTableCellLookup, draftValue: string) => void;
	onDateTimeSave: (lookup: DataTableCellLookup, draftValue: string) => void;
}) {
	const initialDateValue = getDataTableDateEditorDateValue(p.editState.draftValue);
	const initialTimeValue = getDataTableDateTimeEditorTimeValue(p.editState.draftValue);
	const [dateValue, setDateValue] = useState(initialDateValue);
	const [timeValue, setTimeValue] = useState(initialTimeValue);
	const isDateTime = getSheetEditorFieldType(p.lookup.designCell) === 'DATETIME';
	const calendarValue = dateValue || null;

	return (
		<div
			className="bg shadow_light r_4 ft_xs"
			data-sheet-click-source={p.clickSource}
			data-sheet-date-editor="true"
			style={{
				width: '100%',
			}}
		>
			<Calendar
				className="p_8"
				hideNextMonthDays
				initialCalendarViewDate={calendarValue || new Date()}
				name={`sheet_date_editor_${p.lookup.row.id}_${p.lookup.designCell.key}`}
				rowPaddingClassName="py_1"
				value={calendarValue}
				weekdayRowPaddingClassName="py_4"
				onChange={(nextValue) => {
					if (!nextValue) {
						return;
					}

					const nextDateValue = getDataTableCalendarDateValue(nextValue);
					if (isDateTime) {
						setDateValue(nextDateValue);
						return;
					}

					p.onDateValue(p.lookup, nextDateValue);
				}}
			/>

			{isDateTime ? (
				<form
					className="h_item gap_6 px_8 py_8 bd_t_1 bd_lt"
					data-sheet-date-time-editor-form="true"
					onSubmit={(event) => {
						event.preventDefault();
						p.onDateTimeSave(p.lookup, getDataTableDateTimeEditorDraftValue(dateValue, timeValue));
					}}
				>
					<input
						className="f h_28 bg_alt stock px_6 ft_xs"
						data-sheet-date-time-editor-time="true"
						onChange={(event) => {
							setTimeValue(event.currentTarget.value);
						}}
						type="time"
						value={timeValue}
					/>
					<button className="h_28 px_8 bg_primary cl_white ft_xs" type="submit">
						{getDataTableTranslatedText('form.save', 'Save')}
					</button>
				</form>
			) : null}
		</div>
	);
}

/*
 * Render the shared select editor with the standard dataTable option click wiring.
 */
export function DataTableSelectEditor(p: {
	clickSource?: SheetUIEditorClickSource;
	editState: SheetUIEditState;
	fieldType: SheetUIFieldType;
	lookup: DataTableCellLookup;
	onCustomTextSave: (lookup: DataTableCellLookup, draftValue: string) => void;
	onOptionValue: (lookup: DataTableCellLookup, value: string) => void;
}) {
	return (
		<div
			onClick={(event) => {
				const optionElement = event.target instanceof Element
					? event.target.closest('[data-sheet-select-editor-option]')
					: null;
				const value = optionElement?.getAttribute('data-sheet-select-editor-option');

				if (value === undefined || value === null) {
					return;
				}

				p.onOptionValue(p.lookup, value);
			}}
			onSubmit={(event) => {
				event.preventDefault();

				if (!(event.target instanceof HTMLFormElement) || !event.target.matches('[data-sheet-select-editor-custom]')) {
					return;
				}

				const formData = new FormData(event.target);
				p.onCustomTextSave(p.lookup, String(formData.get('customValue') || ''));
			}}
		>
			<SheetSelectEditor
				clickSource={p.clickSource}
				editState={p.editState}
				fieldType={p.fieldType}
				options={getSheetSelectEditorOptions(p.lookup.designCell)}
			/>
		</div>
	);
}
