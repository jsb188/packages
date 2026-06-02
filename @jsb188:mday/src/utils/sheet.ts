import {
	SHEET_CELL_SOURCE_TYPE_ENUMS,
	SHEET_DEFAULT_COLUMN_COUNT,
	SHEET_DEFAULT_ROW_COUNT,
	SHEET_REGION_CONFLICT_POLICY_ENUMS,
	SHEET_REGION_TYPE_ENUMS,
	SHEET_VIEWPORT_MAX_COLUMNS,
	SHEET_VIEWPORT_MAX_ROWS,
} from '../constants/sheet.ts';
import type {
	SheetAxisDesignObj,
	SheetCellSourceTypeEnum,
	SheetDesignObj,
	SheetGridViewportObj,
	SheetRangeData,
	SheetRegionConflictPolicyEnum,
	SheetRegionTypeEnum,
} from '../types/sheet.d.ts';

/*
 * Return a fresh default sheet design object.
 */

export function getDefaultSheetDesign(): SheetDesignObj {
	return {
		version: 1,
		grid: {
			rowCount: SHEET_DEFAULT_ROW_COUNT,
			columnCount: SHEET_DEFAULT_COLUMN_COUNT,
			frozenRows: 0,
			frozenColumns: 0,
		},
		columns: {},
		rows: {},
		defaultCellStyle: {},
		defaultCellFormat: {},
		namedRanges: [],
		metadata: {},
	};
}

/*
 * Return a sheet design object with all top-level defaults filled in.
 */

export function normalizeSheetDesign(design?: Partial<SheetDesignObj> | null): SheetDesignObj {
	const baseDesign = getDefaultSheetDesign();
	const grid: Partial<SheetDesignObj['grid']> = design?.grid || {};

	return {
		...baseDesign,
		...(design || {}),
		version: Number(design?.version || baseDesign.version),
		grid: {
			rowCount: Math.max(1, Math.floor(Number(grid.rowCount || baseDesign.grid.rowCount))),
			columnCount: Math.max(1, Math.floor(Number(grid.columnCount || baseDesign.grid.columnCount))),
			frozenRows: Math.max(0, Math.floor(Number(grid.frozenRows || 0))),
			frozenColumns: Math.max(0, Math.floor(Number(grid.frozenColumns || 0))),
		},
		columns: design?.columns || {},
		rows: design?.rows || {},
		defaultCellStyle: design?.defaultCellStyle || {},
		defaultCellFormat: design?.defaultCellFormat || {},
		namedRanges: Array.isArray(design?.namedRanges) ? design.namedRanges : [],
		metadata: design?.metadata || {},
	};
}

/*
 * Return a viewport bounded to positive indexes and backend query limits.
 */

export function normalizeSheetViewport(viewport: Partial<SheetGridViewportObj>): SheetGridViewportObj {
	return {
		startRowIndex: Math.max(1, Math.floor(Number(viewport.startRowIndex || 1))),
		startColumnIndex: Math.max(1, Math.floor(Number(viewport.startColumnIndex || 1))),
		rowCount: Math.min(SHEET_VIEWPORT_MAX_ROWS, Math.max(1, Math.floor(Number(viewport.rowCount || 1)))),
		columnCount: Math.min(SHEET_VIEWPORT_MAX_COLUMNS, Math.max(1, Math.floor(Number(viewport.columnCount || 1)))),
	};
}

/*
 * Return whether one value is a known stored sheet cell source type.
 */

export function isSheetCellSourceType(value: unknown): value is SheetCellSourceTypeEnum {
	return SHEET_CELL_SOURCE_TYPE_ENUMS.includes(value as SheetCellSourceTypeEnum);
}

/*
 * Return whether one value is a known sheet region type.
 */

export function isSheetRegionType(value: unknown): value is SheetRegionTypeEnum {
	return SHEET_REGION_TYPE_ENUMS.includes(value as SheetRegionTypeEnum);
}

/*
 * Return whether one value is a known sheet region conflict policy.
 */

export function isSheetRegionConflictPolicy(value: unknown): value is SheetRegionConflictPolicyEnum {
	return SHEET_REGION_CONFLICT_POLICY_ENUMS.includes(value as SheetRegionConflictPolicyEnum);
}

/*
 * Return a shallow merged JSON object, ignoring non-object values.
 */

export function mergeSheetJSONObjects(...values: Array<Record<string, any> | null | undefined>) {
	return values.reduce<Record<string, any>>((merged, value) => {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return merged;
		}

		return {
			...merged,
			...value,
		};
	}, {});
}

/*
 * Return the string key used by sheet design JSON for one column index.
 */

export function getSheetColumnDesignKey(columnIndex: number) {
	return String(Math.max(1, Math.floor(Number(columnIndex) || 1)));
}

/*
 * Return the string key used by sheet design JSON for one row index.
 */

export function getSheetRowDesignKey(rowIndex: number) {
	return String(Math.max(1, Math.floor(Number(rowIndex) || 1)));
}

/*
 * Return whether one row design object represents meaningful row-level content.
 */

export function sheetAxisDesignHasContent(design?: SheetAxisDesignObj | null) {
	if (!design) {
		return false;
	}

	return Object.values(design).some((value) => {
		if (value === null || value === undefined || value === false) {
			return false;
		}

		if (typeof value === 'object') {
			return Object.keys(value).length > 0;
		}

		return true;
	});
}

/*
 * Return whether one grid coordinate is inside a saved sheet range.
 */

export function isSheetCellInRange(rowIndex: number, columnIndex: number, range: Pick<SheetRangeData, 'startRowIndex' | 'startColumnIndex' | 'endRowIndex' | 'endColumnIndex'>) {
	return rowIndex >= range.startRowIndex &&
		rowIndex <= range.endRowIndex &&
		columnIndex >= range.startColumnIndex &&
		columnIndex <= range.endColumnIndex;
}
