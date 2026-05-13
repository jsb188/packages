export const SHEET_FIELD_TYPE_ENUMS = [
	'TEXT',
	'NUMBER',
	'BOOLEAN',
	'DATE',
	'DATETIME',
	'SELECT',
	'MULTI_SELECT',
	'RELATION',
	'JSON',
] as const;

export type SheetFieldTypeEnum = typeof SHEET_FIELD_TYPE_ENUMS[number];
