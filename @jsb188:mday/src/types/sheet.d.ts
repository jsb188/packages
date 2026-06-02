import type {
	SHEET_CELL_SOURCE_TYPE_ENUMS,
	SHEET_REGION_CONFLICT_POLICY_ENUMS,
	SHEET_REGION_TYPE_ENUMS,
} from '../constants/sheet.ts';

export type SheetCellSourceTypeEnum = typeof SHEET_CELL_SOURCE_TYPE_ENUMS[number];
export type SheetRegionTypeEnum = typeof SHEET_REGION_TYPE_ENUMS[number];
export type SheetRegionConflictPolicyEnum = typeof SHEET_REGION_CONFLICT_POLICY_ENUMS[number];

export type SheetCellValue =
	| string
	| number
	| boolean
	| null
	| Record<string, any>
	| any[];

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
	style?: Record<string, any> | null;
	format?: Record<string, any> | null;
	metadata?: Record<string, any> | null;
}

export interface SheetNamedRangeObj {
	name: string;
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
	defaultCellStyle?: Record<string, any>;
	defaultCellFormat?: Record<string, any>;
	namedRanges?: SheetNamedRangeObj[];
	metadata?: Record<string, any>;
}

export interface SheetFormulaObj {
	version: number;
	kind: string;
	text: string;
	dataTableName?: string | null;
	rowIdentifier?: string | null;
	cellKey?: string | null;
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
	active: boolean;
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
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: Date | string | null;
	datetimeValue?: Date | string | null;
	formula?: SheetFormulaObj | null;
	style?: Record<string, any> | null;
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
	style?: Record<string, any> | null;
	format?: Record<string, any> | null;
	metadata?: Record<string, any> | null;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface SheetRegionSourceObj {
	type: 'DATA_TABLE';
	dataTableId: number | bigint | string;
	viewId?: string | null;
}

export interface SheetRegionColumnObj {
	sourceCellKey: string;
	label?: string | null;
	width?: number | null;
}

export interface SheetRegionOptionsObj {
	conflictPolicy?: SheetRegionConflictPolicyEnum | null;
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
	sheet: SheetData;
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
	defaultCellStyle?: string | null;
	defaultCellFormat?: string | null;
	namedRanges?: SheetNamedRangeObj[];
	metadata?: string | null;
}

export interface SheetGQL {
	id?: string | null;
	organizationId?: string | null;
	name?: string | null;
	title?: string | null;
	description?: string | null;
	position?: number | null;
	design?: SheetDesignGQL | null;
	active?: boolean | null;
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
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: string | null;
	datetimeValue?: string | null;
	formula?: SheetFormulaObj | null;
	style?: string | null;
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
	style?: string | null;
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
	sheet?: SheetGQL | null;
	viewport?: SheetGridViewportObj | null;
	rows?: SheetGridRowGQL[];
	cells?: SheetCellGQL[];
	ranges?: SheetRangeGQL[];
	regions?: SheetRegionGQL[];
	pageInfo?: SheetGridPageInfoGQL | null;
}
