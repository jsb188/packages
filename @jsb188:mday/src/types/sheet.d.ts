import type { SHEET_FIELD_TYPE_ENUMS } from '../constants/sheet.ts';

export type SheetFieldTypeEnum = typeof SHEET_FIELD_TYPE_ENUMS[number];

export type SheetFieldTypeGQL = SheetFieldTypeEnum;

export type SheetCellReferenceStatus = 'NONE' | 'ACTIVE' | 'DELETED';

export type SheetRecordValue =
	| string
	| number
	| boolean
	| null
	| Record<string, any>
	| any[];

export interface SheetDesignCellOptionObj {
	label: string;
	value: string;
	color?: string | null;
}

export interface SheetDesignCellObj {
	key: string;
	label: string;
	humanLabel?: string | null;
	iconName?: string | null;
	fieldType: SheetFieldTypeEnum;
	humanFieldType: SheetFieldTypeEnum;
	format?: string | null;
	instructions?: string | null;
	source?: {
		path: string;
		table: string;
	} | null;
	options?: SheetDesignCellOptionObj[];
	openLink?: boolean;
	humansOnly?: boolean;
	humansCannotEdit?: boolean; // If true, humans cannot edit this cell
	hidden?: boolean; // If true, this cell is hidden from the default sheet grid
	indexed?: boolean;
	width?: number | null;
}

export interface SheetDesignViewColumnSourceObj {
	type: 'MASTER_CELL' | 'FORMULA' | 'STATIC' | 'DIMENSION' | 'CUSTOM' | 'RELATED_RECORD' | 'COMPUTED';
	cellKey?: string | null;
	formulaKey?: string | null;
	dimensionKey?: string | null;
	table?: string | null;
	path?: string | null;
	sourceCellKey?: string | null;
	sourceCellKeys?: string[];
	operation?: 'SUM' | null;
}

export interface SheetDesignViewDimensionObj {
	key: string;
	label?: string | null;
	source?: SheetDesignViewColumnSourceObj | null;
}

export interface SheetDesignViewGeneratorDateSeriesObj {
	key: string;
	label?: string | null;
	sourceCellKey?: string | null;
	grain: 'DAY' | 'WEEK';
	weekStart?: 'MONDAY';
	range: {
		type: 'CURRENT_MONTH' | 'FIXED';
		start?: string;
		end?: string;
	};
}

export interface SheetDesignViewGeneratorDimensionObj {
	key: string;
	label?: string | null;
	source:
		| {
			type: 'MASTER_CELL_OPTIONS';
			cellKey: string;
		}
		| {
			type: 'STATIC_VALUES';
			values: Array<{
				value: string;
				label?: string | null;
			}>;
		};
}

export interface SheetDesignViewGeneratorMeasureObj {
	key: string;
	label?: string | null;
	operation: 'COUNT' | 'SUM';
	sourceCellKey?: string | null;
}

export interface SheetDesignViewGeneratorObj {
	keyPrefix: string;
	dateSeries?: SheetDesignViewGeneratorDateSeriesObj;
	dimensions?: SheetDesignViewGeneratorDimensionObj[];
	measures?: SheetDesignViewGeneratorMeasureObj[];
}

export interface SheetDesignViewRowModelObj {
	type: 'MASTER_ROWS' | 'GROUPED_ROWS';
	dimensions?: SheetDesignViewDimensionObj[];
	generator?: SheetDesignViewGeneratorObj | null;
}

export interface SheetDesignViewColumnObj {
	key: string;
	label: string;
	humanLabel?: string | null;
	iconName?: string | null;
	fieldType?: SheetFieldTypeEnum | null;
	humanFieldType: SheetFieldTypeEnum;
	source?: SheetDesignViewColumnSourceObj | null;
	options?: SheetDesignCellOptionObj[];
	openLink?: boolean;
	humansCannotEdit?: boolean;
	width?: number | null;
}

export interface SheetDesignViewFilterObj {
	id: string;
	columnKey: string;
	operator: string;
	value?: any;
	enabled?: boolean;
}

export interface SheetDesignViewSortObj {
	columnKey: string;
	direction: 'ASC' | 'DESC';
}

export interface SheetDesignViewGroupObj {
	columnKey: string;
	direction?: 'ASC' | 'DESC';
}

export interface SheetDesignViewObj {
	id: string;
	name: string;
	layout: 'GRID';
	iconName?: string | null;
	color?: string | null;
	description?: string | null;
	rowModel?: SheetDesignViewRowModelObj | null;
	columns: SheetDesignViewColumnObj[];
	columnsOrder?: string[];
	filters?: SheetDesignViewFilterObj[];
	sorts?: SheetDesignViewSortObj[];
	groups?: SheetDesignViewGroupObj[];
	stickyTop?: number | null;
	stickyLeft?: number | null;
	humansCannotEdit?: boolean | null;
}

export interface SheetDesignObj {
	cells: SheetDesignCellObj[];
	cellsOrder?: string[];
	views?: SheetDesignViewObj[];
	viewsOrder?: string[];
	defaultViewId?: string | null;
	instructions?: string;
	humansCannotEdit?: boolean; // If true, humans cannot edit any cells in this sheet
	stickyTop?: number;
	stickyLeft?: number;
}

export interface SheetData {
	__table: 'sheets';

	id: number | bigint;
	organizationId: number | bigint;
	name: string;
	title: string;
	description?: string | null;
	design: SheetDesignObj;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface SheetRowData {
	__table: 'sheet_rows';

	id: number | bigint;
	organizationId: number | bigint;
	sheetId: number | bigint;
	identifier?: string | null;
	viewId?: string | null;
	viewRowKey?: string | null;
	position: number;
	metadata: Record<string, any>;
}

export interface SheetRecordData {
	__table: 'sheet_records';

	id: number | bigint;
	sheetId: number | bigint;
	sheetRowId: number | bigint;
	cellKey: string;
	iconName?: string | null;
	value?: SheetRecordValue;
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: Date | string | null;
	datetimeValue?: Date | string | null;
	relatedTable?: string | null;
	relatedId?: number | bigint | null;
	referenceSheetId?: number | bigint | null;
	referenceSheetRowId?: number | bigint | null;
	referenceCellKey?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface SheetCellReferenceGQL {
	sheetId?: string | null;
	sheetRowId?: string | null;
	cellKey?: string | null;
}

export interface SheetDesignCellOptionGQL {
	label: string;
	value: string;
	color?: string | null;
}

export interface SheetDesignCellSourceGQL {
	path: string;
	table: string;
}

export interface SheetDesignCellGQL {
	key: string;
	label: string;
	humanLabel?: string | null;
	iconName?: string | null;
	fieldType: SheetFieldTypeGQL;
	humanFieldType: SheetFieldTypeGQL;
	format?: string | null;
	instructions?: string | null;
	source?: SheetDesignCellSourceGQL | null;
	options?: SheetDesignCellOptionGQL[];
	openLink?: boolean | null;
	humansOnly?: boolean | null;
	humansCannotEdit?: boolean | null;
	hidden?: boolean | null;
	indexed?: boolean | null;
	width?: number | null;
}

export interface SheetDesignViewColumnSourceGQL {
	type: 'MASTER_CELL' | 'FORMULA' | 'STATIC' | 'DIMENSION' | 'CUSTOM' | 'RELATED_RECORD' | 'COMPUTED';
	cellKey?: string | null;
	formulaKey?: string | null;
	dimensionKey?: string | null;
	table?: string | null;
	path?: string | null;
	sourceCellKey?: string | null;
	sourceCellKeys?: string[];
	operation?: 'SUM' | null;
}

export interface SheetDesignViewDimensionGQL {
	key: string;
	label?: string | null;
	source?: SheetDesignViewColumnSourceGQL | null;
}

export interface SheetDesignViewGeneratorDateSeriesGQL {
	key: string;
	label?: string | null;
	sourceCellKey?: string | null;
	grain: 'DAY' | 'WEEK';
	weekStart?: 'MONDAY' | null;
	range: {
		type: 'CURRENT_MONTH' | 'FIXED';
		start?: string | null;
		end?: string | null;
	};
}

export interface SheetDesignViewGeneratorDimensionGQL {
	key: string;
	label?: string | null;
	source:
		| {
			type: 'MASTER_CELL_OPTIONS';
			cellKey: string;
		}
		| {
			type: 'STATIC_VALUES';
			values: Array<{
				value: string;
				label?: string | null;
			}>;
		};
}

export interface SheetDesignViewGeneratorMeasureGQL {
	key: string;
	label?: string | null;
	operation: 'COUNT' | 'SUM';
	sourceCellKey?: string | null;
}

export interface SheetDesignViewGeneratorGQL {
	keyPrefix: string;
	dateSeries?: SheetDesignViewGeneratorDateSeriesGQL | null;
	dimensions?: SheetDesignViewGeneratorDimensionGQL[];
	measures?: SheetDesignViewGeneratorMeasureGQL[];
}

export interface SheetDesignViewRowModelGQL {
	type: 'MASTER_ROWS' | 'GROUPED_ROWS';
	dimensions?: SheetDesignViewDimensionGQL[];
	generator?: SheetDesignViewGeneratorGQL | null;
}

export interface SheetDesignViewColumnGQL {
	key: string;
	label: string;
	humanLabel?: string | null;
	iconName?: string | null;
	fieldType?: SheetFieldTypeGQL | null;
	humanFieldType: SheetFieldTypeGQL;
	source?: SheetDesignViewColumnSourceGQL | null;
	options?: SheetDesignCellOptionGQL[];
	openLink?: boolean | null;
	humansCannotEdit?: boolean | null;
	width?: number | null;
}

export interface SheetDesignViewFilterGQL {
	id: string;
	columnKey: string;
	operator: string;
	value?: string | null;
	enabled?: boolean | null;
}

export interface SheetDesignViewSortGQL {
	columnKey: string;
	direction: 'ASC' | 'DESC';
}

export interface SheetDesignViewGroupGQL {
	columnKey: string;
	direction?: 'ASC' | 'DESC' | null;
}

export interface SheetDesignViewGQL {
	id: string;
	name: string;
	layout: 'GRID';
	iconName?: string | null;
	color?: string | null;
	description?: string | null;
	rowModel?: SheetDesignViewRowModelGQL | null;
	columns: SheetDesignViewColumnGQL[];
	columnsOrder: string[];
	filters: SheetDesignViewFilterGQL[];
	sorts: SheetDesignViewSortGQL[];
	groups: SheetDesignViewGroupGQL[];
	stickyTop?: number | null;
	stickyLeft?: number | null;
	humansCannotEdit?: boolean | null;
}

export interface SheetDesignGQL {
	id: string;
	cells: SheetDesignCellGQL[];
	cellsOrder: string[];
	views?: SheetDesignViewGQL[];
	viewsOrder?: string[];
	defaultViewId?: string | null;
	instructions?: string | null;
	humansCannotEdit?: boolean | null;
	stickyTop?: number | null;
	stickyLeft?: number | null;
}

export interface SheetGQL {
	__deleted?: boolean;

	id: string;
	organizationId: string;

	name: string;
	title: string;
	description?: string | null;
	design: SheetDesignGQL;
	active: boolean;

	createdAt: string;
	updatedAt: string;
}

export interface SheetRowGQL {
	__deleted?: boolean;

	id: string;
	cursor: string;
	organizationId: string;
	sheetId: string;

	identifier?: string | null;
	viewId?: string | null;
	viewRowKey?: string | null;
	position: number;
	metadata: string;
	cells?: SheetCellGQL[];
	updatedAt?: string | null;
}

export interface SheetCellGQL {
	__deleted?: boolean;

	id: string;
	sheetId: string;
	sheetRowId: string;

	cellKey: string;
	iconName?: string | null;
	value?: string | null;
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: string | null;
	datetimeValue?: string | null;
	relatedTable?: string | null;
	relatedId?: string | null;
	reference?: SheetCellReferenceGQL | null;
	referenceStatus?: SheetCellReferenceStatus | null;

	createdAt: string;
	updatedAt: string;
}
