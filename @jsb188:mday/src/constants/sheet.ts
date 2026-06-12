export const SHEET_CELL_SOURCE_TYPE_ENUMS = [
	'USER',
	'REGION_GENERATED',
	'REGION_OVERRIDE',
] as const;

export const SHEET_REGION_TYPE_ENUMS = [
	'DATA_TABLE',
] as const;

export const SHEET_REGION_SOURCE_TYPE_ENUMS = [
	'DATA_TABLE',
	'CHILD_ORGANIZATIONS',
] as const;

export const SHEET_REGION_CONFLICT_POLICY_ENUMS = [
	'TRUNCATE_AT_FIRST_BLOCKER',
	'OVERWRITE',
] as const;

export const SHEET_REGION_SOURCE_FILTER_COMBINATOR_ENUMS = [
	'AND',
	'OR',
] as const;

export const SHEET_REGION_SOURCE_FILTER_OPERATOR_ENUMS = [
	'CONTAINS',
	'EQUALS',
	'IN',
	'IS_EMPTY',
	'GT',
	'GTE',
	'LT',
	'LTE',
	'BEFORE',
	'AFTER',
	'ON_OR_BEFORE',
	'ON_OR_AFTER',
	'CONTAINS_ANY',
] as const;

export const SHEET_REGION_SOURCE_SORT_DIRECTION_ENUMS = [
	'ASC',
	'DESC',
] as const;

export const SHEET_STRUCTURE_OPERATION_ENUMS = [
	'INSERT_ROW_ABOVE',
	'INSERT_COLUMN_LEFT',
	'DELETE_ROW',
	'DELETE_COLUMN',
] as const;

export const SHEET_CELL_VALUE_TYPE_ENUMS = [
	'CELL_INT',
	'CELL_FLOAT',
	'CELL_DATE',
	'CELL_BOOLEAN',
	'CELL_TEXT',
] as const;

export const SHEET_DISPLAY_RULE_OPERATOR_ENUMS = [
	'eq',
	'neq',
	'gt',
	'gte',
	'lt',
	'lte',
] as const;

export const SHEET_DISPLAY_RULE_COMPARISON_OPERATORS = [
	'gt',
	'gte',
	'lt',
	'lte',
] as const;

export const SHEET_DISPLAY_RULE_MAX_BRANCHES = 10;
export const SHEET_DISPLAY_RULE_MAX_TEXT_LENGTH = 500;

export const GRID_ITEM_SORT_ENUMS = [
	'UPDATED_AT_DESC',
	'TITLE_ASC',
] as const;

export const GRID_ITEM_LIST_LIMIT = 1000;
export const SHEET_DATA_TABLE_REGION_MAX_ROWS = 1000;
export const SHEET_DEFAULT_ROW_COUNT = 1000;
export const SHEET_DEFAULT_COLUMN_COUNT = 26;
export const SHEET_VIEWPORT_MAX_ROWS = 400;
export const SHEET_VIEWPORT_MAX_COLUMNS = 100;
export const SHEET_DEFAULT_COLUMN_WIDTH = 160;
export const SHEET_DEFAULT_ROW_HEIGHT = 28;

export const BUILT_IN_DATA_TABLE_NAMES = [
  'organizations',
  'orgs',
];

export const SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATIONS = 'CHILD_ORGANIZATIONS';

export const SHEET_CUSTOM_REGION_SOURCE_COLUMN_FORMULA_VALUE_SOURCE_ENUMS = [
	'CHILD_ORGANIZATION_ID',
] as const;

export const SHEET_CUSTOM_REGION_SOURCE_CHILD_ORGANIZATION_COLUMNS = [
	{
		key: 'organizationId',
		labelKey: 'form.organization_id',
		width: 160,
	},
	{
		key: 'name',
		labelKey: 'form.name',
		formulaValueSource: 'CHILD_ORGANIZATION_ID',
		width: 300,
	},
	{
		key: 'phone',
		labelKey: 'form.phone',
		width: 160,
	},
	{
		key: 'email',
		labelKey: 'form.email',
		width: 275,
	},
	{
		key: 'type',
		labelKey: 'form.type',
		width: 108,
	},
] as const;
