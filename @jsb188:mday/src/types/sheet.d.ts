import type {
	SHEET_CELL_SOURCE_TYPE_ENUMS,
	SHEET_REGION_CONFLICT_POLICY_ENUMS,
	SHEET_REGION_SOURCE_TYPE_ENUMS,
	SHEET_REGION_SOURCE_FILTER_COMBINATOR_ENUMS,
	SHEET_REGION_SOURCE_FILTER_OPERATOR_ENUMS,
	SHEET_REGION_SOURCE_SORT_DIRECTION_ENUMS,
	SHEET_REGION_TYPE_ENUMS,
	SHEET_STRUCTURE_OPERATION_ENUMS,
	SHEET_CUSTOM_REGION_SOURCE_COLUMN_FORMULA_VALUE_SOURCE_ENUMS,
	GRID_ITEM_SORT_ENUMS,
} from '../constants/sheet.ts';

export type SheetCellSourceTypeEnum = typeof SHEET_CELL_SOURCE_TYPE_ENUMS[number];
export type SheetRegionTypeEnum = typeof SHEET_REGION_TYPE_ENUMS[number];
export type SheetRegionSourceTypeEnum = typeof SHEET_REGION_SOURCE_TYPE_ENUMS[number];
export type SheetRegionConflictPolicyEnum = typeof SHEET_REGION_CONFLICT_POLICY_ENUMS[number];
export type SheetRegionSourceFilterCombinatorEnum = typeof SHEET_REGION_SOURCE_FILTER_COMBINATOR_ENUMS[number];
export type SheetRegionSourceFilterOperatorEnum = typeof SHEET_REGION_SOURCE_FILTER_OPERATOR_ENUMS[number];
export type SheetRegionSourceSortDirectionEnum = typeof SHEET_REGION_SOURCE_SORT_DIRECTION_ENUMS[number];
export type SheetStructureOperationEnum = typeof SHEET_STRUCTURE_OPERATION_ENUMS[number];
export type GridItemSortEnum = typeof GRID_ITEM_SORT_ENUMS[number];
export type SheetFormulaReferenceKind = 'SHEET_CELL' | 'SHEET_RANGE' | 'DATA_TABLE_CELL' | 'DATA_TABLE_QUERY_CELL';
export type SheetFormulaReferenceStatusEnum = 'READY' | 'LOADING' | 'ERROR' | 'NOT_FOUND';
export type SheetRegionColumnKind = 'DATA_TABLE_CELL' | 'FORMULA';
export type SheetCustomRegionSourceColumnFormulaValueSourceEnum = typeof SHEET_CUSTOM_REGION_SOURCE_COLUMN_FORMULA_VALUE_SOURCE_ENUMS[number];

export interface SheetCustomRegionSourceColumnObj {
	key: string;
	labelKey: string;
	formulaValueSource?: SheetCustomRegionSourceColumnFormulaValueSourceEnum | null;
	width: number;
}

export interface SheetsFilterArgs {
	active?: boolean | null;
}

export type SheetCellValue =
	| string
	| number
	| boolean
	| null
	| Record<string, any>
	| any[];

export type SheetCellBorderStyleValue = 'solid' | 'dashed' | 'dotted' | 'double';

export interface SheetCellStyleObj {
	fontSize?: number | null;
	textColor?: string | null;
	fillColor?: string | null;
	disableMarkdown?: boolean | null;
	bold?: boolean | null;
	italic?: boolean | null;
	underline?: boolean | null;
	strikethrough?: boolean | null;
	borderTopWidth?: number | null;
	borderTopColor?: string | null;
	borderTopStyle?: SheetCellBorderStyleValue | null;
	borderRightWidth?: number | null;
	borderRightColor?: string | null;
	borderRightStyle?: SheetCellBorderStyleValue | null;
	borderBottomWidth?: number | null;
	borderBottomColor?: string | null;
	borderBottomStyle?: SheetCellBorderStyleValue | null;
	borderLeftWidth?: number | null;
	borderLeftColor?: string | null;
	borderLeftStyle?: SheetCellBorderStyleValue | null;
}

export interface SheetGridDesignObj {
	rowCount: number;
	columnCount: number;
	frozenRows?: number | null;
	frozenColumns?: number | null;
}

export interface SheetAxisDesignObj {
	width?: number | null;
	height?: number | null;
	hidden?: boolean | null;
	style?: SheetCellStyleObj | null;
	format?: Record<string, any> | null;
	metadata?: Record<string, any> | null;
}

export interface SheetNamedRangeObj {
	name?: string | null;
	startRowIndex: number;
	startColumnIndex: number;
	endRowIndex: number;
	endColumnIndex: number;
}

export interface SheetDesignObj {
	version: number;
	grid: SheetGridDesignObj;
	columns?: Record<string, SheetAxisDesignObj>;
	rows?: Record<string, SheetAxisDesignObj>;
	defaultCellStyle?: SheetCellStyleObj;
	defaultCellFormat?: Record<string, any>;
	namedRanges?: SheetNamedRangeObj[];
	metadata?: Record<string, any>;
}

export type SheetEditorObj = Partial<{
	textColors: string[];
	fillColors: string[];
}>;

export interface SheetFormulaReferenceObj {
	id?: string | null;
	kind: SheetFormulaReferenceKind;
	text: string;
	status?: SheetFormulaReferenceStatusEnum | null;
	rowIndex?: number | null;
	columnIndex?: number | null;
	columnLabel?: string | null;
	startRowIndex?: number | null;
	startColumnIndex?: number | null;
	endRowIndex?: number | null;
	endColumnIndex?: number | null;
	dataTableName?: string | null;
	rowIdentifier?: string | null;
	cellKey?: string | null;
	value?: SheetCellValue;
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: Date | string | null;
	datetimeValue?: Date | string | null;
	error?: SheetFormulaErrorObj | null;
	cells?: SheetCellData[] | SheetCellGQL[] | null;
}

export interface SheetFormulaErrorObj {
	code: string;
	message: string;
}

export interface SheetFormulaObj {
	version: number;
	engine: string;
	text: string;
	references?: SheetFormulaReferenceObj[];
	error?: SheetFormulaErrorObj | null;
}

export interface SheetData {
	__table: 'sheets';

	id: number | bigint;
	organizationId: number | bigint;
	name: string;
	title: string;
	description?: string | null;
	position: number;
	design: SheetDesignObj;
	editor?: SheetEditorObj | null;
	active: boolean;
	deletedAt?: Date | string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface SheetCellData {
	__table: 'sheet_cells';

	id: number | bigint | string;
	organizationId: number | bigint;
	sheetId: number | bigint;
	rowIndex: number;
	columnIndex: number;
	rawInput?: string | null;
	value?: SheetCellValue;
	formulaValue?: SheetCellValue;
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: Date | string | null;
	datetimeValue?: Date | string | null;
	formula?: SheetFormulaObj | null;
	style?: SheetCellStyleObj | null;
	format?: Record<string, any> | null;
	note?: string | null;
	sourceType: SheetCellSourceTypeEnum;
	regionId?: number | bigint | null;
	region?: SheetCellRegionSourceObj | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface SheetRangeData {
	__table: 'sheet_ranges';

	id: number | bigint;
	organizationId: number | bigint;
	sheetId: number | bigint;
	startRowIndex: number;
	startColumnIndex: number;
	endRowIndex: number;
	endColumnIndex: number;
	position: number;
	style?: SheetCellStyleObj | null;
	format?: Record<string, any> | null;
	metadata?: Record<string, any> | null;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface SheetRegionSourceObj {
	type: SheetRegionSourceTypeEnum;
	dataTableId?: number | bigint | string | null;
	filter?: SheetRegionSourceFilterGroupObj | null;
	sort?: SheetRegionSourceSortObj[] | null;
}

export interface SheetRegionSourceFilterGroupObj {
	combinator: SheetRegionSourceFilterCombinatorEnum;
	conditions?: SheetRegionSourceFilterConditionObj[] | null;
	groups?: SheetRegionSourceFilterGroupObj[] | null;
}

export interface SheetRegionSourceFilterConditionObj {
	cellKey: string;
	operator: SheetRegionSourceFilterOperatorEnum;
	textValue?: string | null;
	textValues?: string[] | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: string | null;
	datetimeValue?: string | Date | null;
}

export interface SheetRegionSourceSortObj {
	cellKey: string;
	direction: SheetRegionSourceSortDirectionEnum;
}

export interface SheetRegionColumnObj {
	kind?: SheetRegionColumnKind | null;
	sourceCellKey?: string | null;
	formulaText?: string | null;
}

export interface SheetRegionOptionsObj {
	conflictPolicy?: SheetRegionConflictPolicyEnum | null;
	endRowIndex?: number | null;
	includeHeaderRow?: boolean | null;
}

export interface SheetRegionData {
	__table: 'sheet_regions';

	id: number | bigint;
	organizationId: number | bigint;
	sheetId: number | bigint;
	type: SheetRegionTypeEnum;
	startRowIndex: number;
	startColumnIndex: number;
	sourceDataTableId?: number | bigint | null;
	sourceViewId?: string | null;
	source: SheetRegionSourceObj;
	columns: SheetRegionColumnObj[];
	options: SheetRegionOptionsObj;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface SheetGridViewportObj {
	startRowIndex: number;
	startColumnIndex: number;
	rowCount: number;
	columnCount: number;
}

export interface SheetCellRegionSourceObj {
	regionId?: number | bigint | string | null;
	sourceRowId?: number | bigint | string | null;
	sourceCellKey?: string | null;
}

export interface SheetGridRowObj {
	rowIndex: number;
}

export interface SheetGridPageInfoObj {
	hasMoreRows: boolean;
	lastContentRowIndex?: number | null;
}

export interface SheetGridObj {
	id: number | bigint;
	viewport: SheetGridViewportObj;
	rows: SheetGridRowObj[];
	cells: SheetCellData[];
	ranges: SheetRangeData[];
	regions: SheetRegionData[];
	pageInfo: SheetGridPageInfoObj;
}

export interface SheetGridDesignGQL {
	rowCount?: number | null;
	columnCount?: number | null;
	frozenRows?: number | null;
	frozenColumns?: number | null;
}

export interface SheetDesignGQL {
	id?: string | null;
	version?: number | null;
	grid?: SheetGridDesignGQL | null;
	columns?: string | null;
	rows?: string | null;
	defaultCellStyle?: SheetCellStyleObj | null;
	defaultCellFormat?: string | null;
	namedRanges?: SheetNamedRangeObj[];
	metadata?: string | null;
}

export type SheetEditorGQL = Partial<{
	textColors: string[];
	fillColors: string[];
}>;

export interface SheetGQL {
	__deleted?: boolean;

	id?: string | null;
	cursor?: string | null;
	organizationId?: string | null;
	name?: string | null;
	title?: string | null;
	description?: string | null;
	position?: number | null;
	design?: SheetDesignGQL | null;
	editor?: SheetEditorGQL | null;
	active?: boolean | null;
	deletedAt?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

export interface SheetCellGQL {
	id?: string | null;
	organizationId?: string | null;
	sheetId?: string | null;
	rowIndex?: number | null;
	columnIndex?: number | null;
	rawInput?: string | null;
	value?: string | null;
	formulaValue?: SheetCellValue;
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: string | null;
	datetimeValue?: string | null;
	formula?: SheetFormulaObj | null;
	style?: SheetCellStyleObj | null;
	format?: string | null;
	note?: string | null;
	sourceType?: SheetCellSourceTypeEnum | null;
	regionId?: string | null;
	region?: SheetCellRegionSourceObj | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

export interface SheetGridRowGQL {
	rowIndex: number;
}

export interface SheetGridPageInfoGQL {
	hasMoreRows?: boolean | null;
	lastContentRowIndex?: number | null;
}

export interface SheetRangeGQL {
	id?: string | null;
	organizationId?: string | null;
	sheetId?: string | null;
	startRowIndex?: number | null;
	startColumnIndex?: number | null;
	endRowIndex?: number | null;
	endColumnIndex?: number | null;
	position?: number | null;
	style?: SheetCellStyleObj | null;
	format?: string | null;
	metadata?: string | null;
	active?: boolean | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

export interface SheetRegionGQL {
	id?: string | null;
	organizationId?: string | null;
	sheetId?: string | null;
	type?: SheetRegionTypeEnum | null;
	startRowIndex?: number | null;
	startColumnIndex?: number | null;
	source?: SheetRegionSourceObj | null;
	columns?: SheetRegionColumnObj[];
	options?: SheetRegionOptionsObj | null;
	active?: boolean | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

export interface SheetGridGQL {
	id?: string | null;
	viewport?: SheetGridViewportObj | null;
	rows?: SheetGridRowGQL[];
	cells?: SheetCellGQL[];
	ranges?: SheetRangeGQL[];
	regions?: SheetRegionGQL[];
	pageInfo?: SheetGridPageInfoGQL | null;
}
