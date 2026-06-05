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

export interface DataTableDesignObj {
	cells: DataTableDesignCellObj[];
	cellsOrder?: string[];
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

export interface DataTableDesignGQL {
	id: string;
	cells: DataTableDesignCellGQL[];
	cellsOrder: string[];
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
