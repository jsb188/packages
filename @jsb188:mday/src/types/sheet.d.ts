import type { SHEET_FIELD_TYPE_ENUMS } from '../constants/sheet.ts';

export type SheetFieldTypeEnum = typeof SHEET_FIELD_TYPE_ENUMS[number];

export type SheetFieldTypeGQL = SheetFieldTypeEnum;

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
	fieldType: SheetFieldTypeEnum;
	instructions?: string | null;
	source?: {
		path: string;
		table: string;
	} | null;
	options?: SheetDesignCellOptionObj[];
	openLink?: boolean;
	humansOnly?: boolean;
	humansCannotEdit?: boolean; // If true, humans cannot edit this cell
	indexed?: boolean;
	width?: number | null;
}

export interface SheetDesignObj {
	cells: SheetDesignCellObj[];
	cellsOrder?: string[];
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
	position: number;
	metadata: Record<string, any>;
}

export interface SheetRecordData {
	__table: 'sheet_records';

	id: number | bigint;
	sheetId: number | bigint;
	sheetRowId: number | bigint;
	cellKey: string;
	value?: SheetRecordValue;
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: Date | string | null;
	datetimeValue?: Date | null;
	relatedTable?: string | null;
	relatedId?: number | bigint | null;
	createdAt: Date;
	updatedAt: Date;
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
	fieldType: SheetFieldTypeGQL;
	instructions?: string | null;
	source?: SheetDesignCellSourceGQL | null;
	options?: SheetDesignCellOptionGQL[];
	openLink?: boolean | null;
	humansOnly?: boolean | null;
	humansCannotEdit?: boolean | null;
	indexed?: boolean | null;
	width?: number | null;
}

export interface SheetDesignGQL {
	id: string;
	cells: SheetDesignCellGQL[];
	cellsOrder: string[];
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
	value?: string | null;
	textValue?: string | null;
	numberValue?: number | null;
	booleanValue?: boolean | null;
	dateValue?: string | null;
	datetimeValue?: string | null;
	relatedTable?: string | null;
	relatedId?: string | null;

	createdAt: string;
	updatedAt: string;
}
