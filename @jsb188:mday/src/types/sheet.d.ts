export type SheetFieldTypeEnum =
	| 'TEXT'
	| 'NUMBER'
	| 'BOOLEAN'
	| 'DATE'
	| 'DATETIME'
	| 'SELECT'
	| 'MULTI_SELECT'
	| 'JSON';

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
	indexed?: boolean;
}

export interface SheetDesignObj {
	cells: SheetDesignCellObj[];
	cellsOrder?: string[];
	instructions?: string;
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
