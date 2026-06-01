import type { DATA_TABLE_FIELD_TYPE_ENUMS } from '../constants/dataTable.ts';

export type DataTableFieldTypeEnum = typeof DATA_TABLE_FIELD_TYPE_ENUMS[number];

export type DataTableFieldTypeGQL = DataTableFieldTypeEnum;

export type DataTableCellReferenceStatus = 'NONE' | 'ACTIVE' | 'DELETED';

export type DataTableRecordValue =
	| string
	| number
	| boolean
	| null
	| Record<string, any>
	| any[];

export interface DataTableDesignCellOptionObj {
	label: string;
	value: string;
	color?: string | null;
}

export interface DataTableDesignCellObj {
	key: string;
	label: string;
	humanLabel?: string | null;
	iconName?: string | null;
	fieldType: DataTableFieldTypeEnum;
	humanFieldType: DataTableFieldTypeEnum;
	format?: string | null;
	instructions?: string | null;
	source?: {
		path: string;
		table: string;
	} | null;
	options?: DataTableDesignCellOptionObj[];
	openLink?: boolean;
	humansOnly?: boolean;
	humansCannotEdit?: boolean; // If true, humans cannot edit this cell
	hidden?: boolean; // If true, this cell is hidden from the default dataTable grid
	indexed?: boolean;
	width?: number | null;
}

export interface DataTableDesignViewColumnSourceObj {
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

export interface DataTableDesignViewDimensionObj {
	key: string;
	label?: string | null;
	source?: DataTableDesignViewColumnSourceObj | null;
}

export interface DataTableDesignViewGeneratorDateSeriesObj {
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

export interface DataTableDesignViewGeneratorDimensionObj {
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

export interface DataTableDesignViewGeneratorMeasureObj {
	key: string;
	label?: string | null;
	operation: 'COUNT' | 'SUM';
	sourceCellKey?: string | null;
}

export interface DataTableDesignViewGeneratorObj {
	keyPrefix: string;
	dateSeries?: DataTableDesignViewGeneratorDateSeriesObj;
	dimensions?: DataTableDesignViewGeneratorDimensionObj[];
	measures?: DataTableDesignViewGeneratorMeasureObj[];
}

export interface DataTableDesignViewRowModelObj {
	type: 'MASTER_ROWS' | 'GROUPED_ROWS';
	dimensions?: DataTableDesignViewDimensionObj[];
	generator?: DataTableDesignViewGeneratorObj | null;
}

export interface DataTableDesignViewColumnObj {
	key: string;
	label: string;
	humanLabel?: string | null;
	iconName?: string | null;
	fieldType?: DataTableFieldTypeEnum | null;
	humanFieldType: DataTableFieldTypeEnum;
	source?: DataTableDesignViewColumnSourceObj | null;
	options?: DataTableDesignCellOptionObj[];
	openLink?: boolean;
	humansCannotEdit?: boolean;
	width?: number | null;
}

export interface DataTableDesignViewFilterObj {
	id: string;
	columnKey: string;
	operator: string;
	value?: any;
	enabled?: boolean;
}

export interface DataTableDesignViewSortObj {
	columnKey: string;
	direction: 'ASC' | 'DESC';
}

export interface DataTableDesignViewGroupObj {
	columnKey: string;
	direction?: 'ASC' | 'DESC';
}

export interface DataTableDesignViewObj {
	id: string;
	name: string;
	layout: 'GRID';
	iconName?: string | null;
	color?: string | null;
	description?: string | null;
	rowModel?: DataTableDesignViewRowModelObj | null;
	columns: DataTableDesignViewColumnObj[];
	columnsOrder?: string[];
	filters?: DataTableDesignViewFilterObj[];
	sorts?: DataTableDesignViewSortObj[];
	groups?: DataTableDesignViewGroupObj[];
	stickyTop?: number | null;
	stickyLeft?: number | null;
	humansCannotEdit?: boolean | null;
}

export interface DataTableDesignObj {
	cells: DataTableDesignCellObj[];
	cellsOrder?: string[];
	views?: DataTableDesignViewObj[];
	viewsOrder?: string[];
	defaultViewId?: string | null;
	instructions?: string;
	humansCannotEdit?: boolean; // If true, humans cannot edit any cells in this dataTable
	stickyTop?: number;
	stickyLeft?: number;
}

export interface DataTableData {
	__table: 'data_tables';

	id: number | bigint;
	organizationId: number | bigint;
	name: string;
	title: string;
	description?: string | null;
	design: DataTableDesignObj;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface DataTableRowData {
	__table: 'data_table_rows';

	id: number | bigint;
	organizationId: number | bigint;
	dataTableId: number | bigint;
	identifier?: string | null;
	viewId?: string | null;
	viewRowKey?: string | null;
	position: number;
	metadata: Record<string, any>;
}

export interface DataTableRecordData {
	__table: 'data_table_records';

	id: number | bigint;
	dataTableId: number | bigint;
	dataTableRowId: number | bigint;
	cellKey: string;
	iconName?: string | null;
	value?: DataTableRecordValue;
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: Date | string | null;
	datetimeValue?: Date | string | null;
	relatedTable?: string | null;
	relatedId?: number | bigint | null;
	referenceDataTableId?: number | bigint | null;
	referenceDataTableRowId?: number | bigint | null;
	referenceCellKey?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface DataTableCellReferenceGQL {
	dataTableId?: string | null;
	dataTableRowId?: string | null;
	cellKey?: string | null;
}

export interface DataTableDesignCellOptionGQL {
	label: string;
	value: string;
	color?: string | null;
}

export interface DataTableDesignCellSourceGQL {
	path: string;
	table: string;
}

export interface DataTableDesignCellGQL {
	key: string;
	label: string;
	humanLabel?: string | null;
	iconName?: string | null;
	fieldType: DataTableFieldTypeGQL;
	humanFieldType: DataTableFieldTypeGQL;
	format?: string | null;
	instructions?: string | null;
	source?: DataTableDesignCellSourceGQL | null;
	options?: DataTableDesignCellOptionGQL[];
	openLink?: boolean | null;
	humansOnly?: boolean | null;
	humansCannotEdit?: boolean | null;
	hidden?: boolean | null;
	indexed?: boolean | null;
	width?: number | null;
}

export interface DataTableDesignViewColumnSourceGQL {
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

export interface DataTableDesignViewDimensionGQL {
	key: string;
	label?: string | null;
	source?: DataTableDesignViewColumnSourceGQL | null;
}

export interface DataTableDesignViewGeneratorDateSeriesGQL {
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

export interface DataTableDesignViewGeneratorDimensionGQL {
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

export interface DataTableDesignViewGeneratorMeasureGQL {
	key: string;
	label?: string | null;
	operation: 'COUNT' | 'SUM';
	sourceCellKey?: string | null;
}

export interface DataTableDesignViewGeneratorGQL {
	keyPrefix: string;
	dateSeries?: DataTableDesignViewGeneratorDateSeriesGQL | null;
	dimensions?: DataTableDesignViewGeneratorDimensionGQL[];
	measures?: DataTableDesignViewGeneratorMeasureGQL[];
}

export interface DataTableDesignViewRowModelGQL {
	type: 'MASTER_ROWS' | 'GROUPED_ROWS';
	dimensions?: DataTableDesignViewDimensionGQL[];
	generator?: DataTableDesignViewGeneratorGQL | null;
}

export interface DataTableDesignViewColumnGQL {
	key: string;
	label: string;
	humanLabel?: string | null;
	iconName?: string | null;
	fieldType?: DataTableFieldTypeGQL | null;
	humanFieldType: DataTableFieldTypeGQL;
	source?: DataTableDesignViewColumnSourceGQL | null;
	options?: DataTableDesignCellOptionGQL[];
	openLink?: boolean | null;
	humansCannotEdit?: boolean | null;
	width?: number | null;
}

export interface DataTableDesignViewFilterGQL {
	id: string;
	columnKey: string;
	operator: string;
	value?: string | null;
	enabled?: boolean | null;
}

export interface DataTableDesignViewSortGQL {
	columnKey: string;
	direction: 'ASC' | 'DESC';
}

export interface DataTableDesignViewGroupGQL {
	columnKey: string;
	direction?: 'ASC' | 'DESC' | null;
}

export interface DataTableDesignViewGQL {
	id: string;
	name: string;
	layout: 'GRID';
	iconName?: string | null;
	color?: string | null;
	description?: string | null;
	rowModel?: DataTableDesignViewRowModelGQL | null;
	columns: DataTableDesignViewColumnGQL[];
	columnsOrder: string[];
	filters: DataTableDesignViewFilterGQL[];
	sorts: DataTableDesignViewSortGQL[];
	groups: DataTableDesignViewGroupGQL[];
	stickyTop?: number | null;
	stickyLeft?: number | null;
	humansCannotEdit?: boolean | null;
}

export interface DataTableDesignGQL {
	id: string;
	cells: DataTableDesignCellGQL[];
	cellsOrder: string[];
	views?: DataTableDesignViewGQL[];
	viewsOrder?: string[];
	defaultViewId?: string | null;
	instructions?: string | null;
	humansCannotEdit?: boolean | null;
	stickyTop?: number | null;
	stickyLeft?: number | null;
}

export interface DataTableGQL {
	__deleted?: boolean;

	id: string;
	organizationId: string;

	name: string;
	title: string;
	description?: string | null;
	design: DataTableDesignGQL;
	active: boolean;

	createdAt: string;
	updatedAt: string;
}

export interface DataTableRowGQL {
	__deleted?: boolean;

	id: string;
	cursor: string;
	organizationId: string;
	dataTableId: string;

	identifier?: string | null;
	viewId?: string | null;
	viewRowKey?: string | null;
	position: number;
	metadata: string;
	cells?: DataTableCellGQL[];
	updatedAt?: string | null;
}

export interface DataTableCellGQL {
	__deleted?: boolean;

	id: string;
	dataTableId: string;
	dataTableRowId: string;

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
	reference?: DataTableCellReferenceGQL | null;
	referenceStatus?: DataTableCellReferenceStatus | null;

	createdAt: string;
	updatedAt: string;
}
