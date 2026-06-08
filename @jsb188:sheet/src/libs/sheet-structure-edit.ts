import { SHEET_DATA_TABLE_REGION_MAX_ROWS } from '@jsb188/mday/constants/sheet.ts';
import type {
	SheetDesignObj,
	SheetRangeData,
	SheetRangeGQL,
	SheetRegionColumnObj,
	SheetRegionOptionsObj,
	SheetStructureOperationEnum,
} from '@jsb188/mday/types/sheet.d.ts';
import {
	normalizeSheetDesign,
	shiftSheetAxisDesignForStructureEdit,
	type SheetProtectedAxisSpan,
} from '@jsb188/mday/utils/sheet.ts';

export type SheetStructureBounds = {
	endColumnIndex: number;
	endRowIndex: number;
	startColumnIndex: number;
	startRowIndex: number;
};

export type SheetStructureRegionFootprint = {
	columns?: SheetRegionColumnObj[] | null;
	options?: SheetRegionOptionsObj | null;
	source?: {
		dataTableId?: number | bigint | string | null;
		type?: string | null;
	} | null;
	sourceDataTableId?: number | bigint | string | null;
	startColumnIndex?: number | null;
	startRowIndex?: number | null;
	type?: string | null;
};

export type SheetStructureCellCoord = {
	columnIndex: number;
	rowIndex: number;
};

export type SheetStructureCellLike = {
	columnIndex?: number | null;
	rowIndex?: number | null;
};

export type SheetStructureRangeLike = Pick<SheetRangeData | SheetRangeGQL, 'endColumnIndex' | 'endRowIndex' | 'startColumnIndex' | 'startRowIndex'>;

export type SheetStructureBoundsPredicate = {
	args: Array<number | bigint>;
	text: string;
};

/*
 * Return a normalized positive one-based sheet index.
 */
function normalizeSheetStructureIndex(value: number | null | undefined) {
	const index = Math.floor(Number(value || 0));

	return Number.isFinite(index) && index > 0 ? index : null;
}

/*
 * Return a stable coordinate key for one one-based sheet cell.
 */
export function getSheetStructureCoordKey(rowIndex: number, columnIndex: number) {
	return `${rowIndex}:${columnIndex}`;
}

/*
 * Return the configured finite end row for one region, when it has one.
 */
export function getSheetStructureRegionConfiguredEndRowIndex(region: Pick<SheetStructureRegionFootprint, 'options'>) {
	const endRowIndex = Math.floor(Number(region.options?.endRowIndex || 0));

	return Number.isFinite(endRowIndex) && endRowIndex >= 1 ? endRowIndex : null;
}

/*
 * Return the first row that should contain data table source rows for one region.
 */
export function getSheetStructureRegionDataStartRowIndex(region: Pick<SheetStructureRegionFootprint, 'options' | 'startRowIndex'>) {
	const startRowIndex = normalizeSheetStructureIndex(region.startRowIndex) || 1;

	return startRowIndex + (region.options?.includeHeaderRow ? 1 : 0);
}

/*
 * Return the last row index one data table region may generate under the hard row cap.
 */
export function getSheetStructureDataTableRegionMaxEndRowIndex(region: Pick<SheetStructureRegionFootprint, 'options' | 'startRowIndex'>) {
	return getSheetStructureRegionDataStartRowIndex(region) + SHEET_DATA_TABLE_REGION_MAX_ROWS - 1;
}

/*
 * Return the rectangular generated output footprint for one data table region.
 */
export function getSheetStructureRegionContentBounds(
	region: SheetStructureRegionFootprint,
	sourceRowCount: number,
): SheetStructureBounds | null {
	const startRowIndex = normalizeSheetStructureIndex(region.startRowIndex);
	const startColumnIndex = normalizeSheetStructureIndex(region.startColumnIndex);
	const columnCount = Array.isArray(region.columns) ? region.columns.length : 0;

	if (!startRowIndex || !startColumnIndex || !columnCount) {
		return null;
	}

	const normalizedRegion = {
		...region,
		startRowIndex,
		startColumnIndex,
	};
	const configuredEndRowIndex = getSheetStructureRegionConfiguredEndRowIndex(normalizedRegion);
	const allowedEndRowIndex = Math.min(
		configuredEndRowIndex || getSheetStructureDataTableRegionMaxEndRowIndex(normalizedRegion),
		getSheetStructureDataTableRegionMaxEndRowIndex(normalizedRegion),
	);
	const headerLastRowIndex = normalizedRegion.options?.includeHeaderRow ? startRowIndex : 0;
	const dataStartRowIndex = getSheetStructureRegionDataStartRowIndex(normalizedRegion);
	const sourceRowsToRender = Math.min(
		Math.max(0, Math.floor(Number(sourceRowCount) || 0)),
		SHEET_DATA_TABLE_REGION_MAX_ROWS,
	);
	const sourceLastRowIndex = sourceRowsToRender ? dataStartRowIndex + sourceRowsToRender - 1 : 0;
	const endRowIndex = Math.min(
		allowedEndRowIndex,
		Math.max(headerLastRowIndex, sourceLastRowIndex),
	);

	if (endRowIndex < startRowIndex) {
		return null;
	}

	return {
		endColumnIndex: startColumnIndex + columnCount - 1,
		endRowIndex,
		startColumnIndex,
		startRowIndex,
	};
}

/*
 * Return the configured footprint reserved by one data table-backed region.
 */
export function getSheetStructureRegionConfiguredBounds(region: SheetStructureRegionFootprint) {
	return getSheetStructureRegionContentBounds(region, SHEET_DATA_TABLE_REGION_MAX_ROWS);
}

/*
 * Return whether one region should be protected during row or column structure edits.
 */
export function isSheetStructureProtectedRegion(region: SheetStructureRegionFootprint) {
	return region.type === 'DATA_TABLE' && Boolean(region.sourceDataTableId || region.source?.dataTableId);
}

/*
 * Return the active region footprints that should be protected during a structure edit.
 */
export function getSheetStructureProtectedBounds(regions?: SheetStructureRegionFootprint[] | null) {
	return (regions || [])
		.filter(isSheetStructureProtectedRegion)
		.map((region) => getSheetStructureRegionConfiguredBounds(region))
		.filter((bounds): bounds is SheetStructureBounds => Boolean(bounds));
}

/*
 * Return axis spans from protected region bounds for row or column design shifting.
 */
export function getSheetStructureProtectedAxisSpans(bounds: SheetStructureBounds[], axis: 'ROW' | 'COLUMN'): SheetProtectedAxisSpan[] {
	return bounds.map((item) => axis === 'ROW'
		? {
			endIndex: item.endRowIndex,
			startIndex: item.startRowIndex,
		}
		: {
			endIndex: item.endColumnIndex,
			startIndex: item.startColumnIndex,
		});
}

/*
 * Return whether one Sheet coordinate falls inside a rectangular protected footprint.
 */
export function sheetStructureBoundsContainCell(bounds: SheetStructureBounds, rowIndex: number, columnIndex: number) {
	return rowIndex >= bounds.startRowIndex &&
		rowIndex <= bounds.endRowIndex &&
		columnIndex >= bounds.startColumnIndex &&
		columnIndex <= bounds.endColumnIndex;
}

/*
 * Return whether one cell coordinate is outside every protected footprint.
 */
export function isSheetStructureCellOutsideProtectedBounds(bounds: SheetStructureBounds[], rowIndex: number, columnIndex: number) {
	return !bounds.some((bound) => sheetStructureBoundsContainCell(bound, rowIndex, columnIndex));
}

/*
 * Return whether one rectangular range overlaps a protected footprint.
 */
export function sheetStructureBoundsOverlapRange(
	bounds: SheetStructureBounds,
	startRowIndex: number,
	endRowIndex: number,
	startColumnIndex: number,
	endColumnIndex: number,
) {
	return startRowIndex <= bounds.endRowIndex &&
		endRowIndex >= bounds.startRowIndex &&
		startColumnIndex <= bounds.endColumnIndex &&
		endColumnIndex >= bounds.startColumnIndex;
}

/*
 * Return whether one range is outside every protected footprint.
 */
export function isSheetStructureRangeOutsideProtectedBounds(
	bounds: SheetStructureBounds[],
	startRowIndex: number,
	endRowIndex: number,
	startColumnIndex: number,
	endColumnIndex: number,
) {
	return !bounds.some((bound) => sheetStructureBoundsOverlapRange(
		bound,
		startRowIndex,
		endRowIndex,
		startColumnIndex,
		endColumnIndex,
	));
}

/*
 * Return whether a protected region prevents one row-delete upward shift.
 */
export function isSheetStructureRowDeleteShiftBlocked(
	bounds: SheetStructureBounds[],
	rowIndex: number,
	columnIndex: number,
	targetIndex: number,
) {
	return bounds.some((bound) => columnIndex >= bound.startColumnIndex &&
		columnIndex <= bound.endColumnIndex &&
		bound.startRowIndex <= rowIndex - 1 &&
		bound.endRowIndex >= targetIndex);
}

/*
 * Return whether a protected region prevents one column-delete left shift.
 */
export function isSheetStructureColumnDeleteShiftBlocked(
	bounds: SheetStructureBounds[],
	rowIndex: number,
	columnIndex: number,
	targetIndex: number,
) {
	return bounds.some((bound) => rowIndex >= bound.startRowIndex &&
		rowIndex <= bound.endRowIndex &&
		bound.startColumnIndex <= columnIndex - 1 &&
		bound.endColumnIndex >= targetIndex);
}

/*
 * Return whether a protected region prevents one row-range delete upward shift.
 */
export function isSheetStructureRangeRowDeleteShiftBlocked(
	bounds: SheetStructureBounds[],
	startRowIndex: number,
	startColumnIndex: number,
	endColumnIndex: number,
	targetIndex: number,
) {
	return bounds.some((bound) => startColumnIndex <= bound.endColumnIndex &&
		endColumnIndex >= bound.startColumnIndex &&
		bound.startRowIndex <= startRowIndex - 1 &&
		bound.endRowIndex >= targetIndex);
}

/*
 * Return whether a protected region prevents one column-range delete left shift.
 */
export function isSheetStructureRangeColumnDeleteShiftBlocked(
	bounds: SheetStructureBounds[],
	startColumnIndex: number,
	startRowIndex: number,
	endRowIndex: number,
	targetIndex: number,
) {
	return bounds.some((bound) => startRowIndex <= bound.endRowIndex &&
		endRowIndex >= bound.startRowIndex &&
		bound.startColumnIndex <= startColumnIndex - 1 &&
		bound.endColumnIndex >= targetIndex);
}

/*
 * Return the row and column coordinate for one cell after a structure edit.
 */
export function getSheetStructureCellCoordAfterEdit(
	rowIndex: number,
	columnIndex: number,
	operation: SheetStructureOperationEnum,
	targetIndex: number,
	bounds: SheetStructureBounds[] = [],
): SheetStructureCellCoord | null {
	if (operation === 'INSERT_ROW_ABOVE' && rowIndex >= targetIndex) {
		return isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex, columnIndex) &&
				isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex + 1, columnIndex)
			? {
				columnIndex,
				rowIndex: rowIndex + 1,
			}
			: {
				columnIndex,
				rowIndex,
			};
	}

	if (operation === 'INSERT_COLUMN_LEFT' && columnIndex >= targetIndex) {
		return isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex, columnIndex) &&
				isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex, columnIndex + 1)
			? {
				columnIndex: columnIndex + 1,
				rowIndex,
			}
			: {
				columnIndex,
				rowIndex,
			};
	}

	if (operation === 'DELETE_ROW') {
		if (rowIndex === targetIndex && isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex, columnIndex)) {
			return null;
		}

		if (
			rowIndex > targetIndex &&
			isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex, columnIndex) &&
			isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex - 1, columnIndex) &&
			!isSheetStructureRowDeleteShiftBlocked(bounds, rowIndex, columnIndex, targetIndex)
		) {
			return {
				columnIndex,
				rowIndex: rowIndex - 1,
			};
		}
	}

	if (operation === 'DELETE_COLUMN') {
		if (columnIndex === targetIndex && isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex, columnIndex)) {
			return null;
		}

		if (
			columnIndex > targetIndex &&
			isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex, columnIndex) &&
			isSheetStructureCellOutsideProtectedBounds(bounds, rowIndex, columnIndex - 1) &&
			!isSheetStructureColumnDeleteShiftBlocked(bounds, rowIndex, columnIndex, targetIndex)
		) {
			return {
				columnIndex: columnIndex - 1,
				rowIndex,
			};
		}
	}

	return {
		columnIndex,
		rowIndex,
	};
}

/*
 * Return the range coordinate fields after a structure edit.
 */
export function getSheetStructureRangeAfterEdit<T extends SheetStructureRangeLike>(
	range: T,
	operation: SheetStructureOperationEnum,
	targetIndex: number,
	bounds: SheetStructureBounds[] = [],
): T | null {
	const startRowIndex = normalizeSheetStructureIndex(range.startRowIndex);
	const endRowIndex = normalizeSheetStructureIndex(range.endRowIndex);
	const startColumnIndex = normalizeSheetStructureIndex(range.startColumnIndex);
	const endColumnIndex = normalizeSheetStructureIndex(range.endColumnIndex);

	if (!startRowIndex || !endRowIndex || !startColumnIndex || !endColumnIndex) {
		return range;
	}

	const outside = isSheetStructureRangeOutsideProtectedBounds(
		bounds,
		startRowIndex,
		endRowIndex,
		startColumnIndex,
		endColumnIndex,
	);

	if (!outside) {
		return range;
	}

	if (operation === 'INSERT_ROW_ABOVE') {
		if (startRowIndex >= targetIndex) {
			return {
				...range,
				endRowIndex: endRowIndex + 1,
				startRowIndex: startRowIndex + 1,
			};
		}

		if (startRowIndex < targetIndex && endRowIndex >= targetIndex) {
			return {
				...range,
				endRowIndex: endRowIndex + 1,
			};
		}
	}

	if (operation === 'INSERT_COLUMN_LEFT') {
		if (startColumnIndex >= targetIndex) {
			return {
				...range,
				endColumnIndex: endColumnIndex + 1,
				startColumnIndex: startColumnIndex + 1,
			};
		}

		if (startColumnIndex < targetIndex && endColumnIndex >= targetIndex) {
			return {
				...range,
				endColumnIndex: endColumnIndex + 1,
			};
		}
	}

	if (operation === 'DELETE_ROW') {
		if (startRowIndex === targetIndex && endRowIndex === targetIndex) {
			return null;
		}

		if (startRowIndex <= targetIndex && endRowIndex > targetIndex) {
			return {
				...range,
				endRowIndex: endRowIndex - 1,
			};
		}

		if (
			startRowIndex > targetIndex &&
			!isSheetStructureRangeRowDeleteShiftBlocked(bounds, startRowIndex, startColumnIndex, endColumnIndex, targetIndex)
		) {
			return {
				...range,
				endRowIndex: endRowIndex - 1,
				startRowIndex: startRowIndex - 1,
			};
		}
	}

	if (operation === 'DELETE_COLUMN') {
		if (startColumnIndex === targetIndex && endColumnIndex === targetIndex) {
			return null;
		}

		if (startColumnIndex <= targetIndex && endColumnIndex > targetIndex) {
			return {
				...range,
				endColumnIndex: endColumnIndex - 1,
			};
		}

		if (
			startColumnIndex > targetIndex &&
			!isSheetStructureRangeColumnDeleteShiftBlocked(bounds, startColumnIndex, startRowIndex, endRowIndex, targetIndex)
		) {
			return {
				...range,
				endColumnIndex: endColumnIndex - 1,
				startColumnIndex: startColumnIndex - 1,
			};
		}
	}

	return range;
}

/*
 * Return sparse cells keyed by their post-structure-edit coordinates.
 */
export function applySheetStructureEditToCellsByCoord<T extends SheetStructureCellLike>(
	cellsByCoord: Map<string, T>,
	operation: SheetStructureOperationEnum,
	targetIndex: number,
	bounds: SheetStructureBounds[] = [],
) {
	let changed = false;
	const nextCellsByCoord = new Map<string, T>();

	cellsByCoord.forEach((cell, coordKey) => {
		const rowIndex = normalizeSheetStructureIndex(cell.rowIndex);
		const columnIndex = normalizeSheetStructureIndex(cell.columnIndex);

		if (!rowIndex || !columnIndex) {
			nextCellsByCoord.set(coordKey, cell);
			return;
		}

		const nextCoord = getSheetStructureCellCoordAfterEdit(rowIndex, columnIndex, operation, targetIndex, bounds);
		if (!nextCoord) {
			changed = true;
			return;
		}

		const nextCoordKey = getSheetStructureCoordKey(nextCoord.rowIndex, nextCoord.columnIndex);
		const nextCell = nextCoord.rowIndex === rowIndex && nextCoord.columnIndex === columnIndex
			? cell
			: {
				...cell,
				columnIndex: nextCoord.columnIndex,
				rowIndex: nextCoord.rowIndex,
			} as T;

		if (nextCoordKey !== coordKey || nextCell !== cell) {
			changed = true;
		}

		nextCellsByCoord.set(nextCoordKey, nextCell);
	});

	return changed ? nextCellsByCoord : cellsByCoord;
}

/*
 * Return saved ranges with their coordinates projected through one structure edit.
 */
export function applySheetStructureEditToRanges<T extends SheetStructureRangeLike>(
	ranges: T[] | null | undefined,
	operation: SheetStructureOperationEnum,
	targetIndex: number,
	bounds: SheetStructureBounds[] = [],
) {
	let changed = false;
	const nextRanges: T[] = [];

	(ranges || []).forEach((range) => {
		const nextRange = getSheetStructureRangeAfterEdit(range, operation, targetIndex, bounds);

		if (!nextRange) {
			changed = true;
			return;
		}

		if (nextRange !== range) {
			changed = true;
		}

		nextRanges.push(nextRange);
	});

	return changed ? nextRanges : ranges || [];
}

/*
 * Return the row or column design after one structure edit.
 */
export function getSheetStructureDesignAfterEdit(
	designInput: SheetDesignObj,
	operation: SheetStructureOperationEnum,
	targetIndex: number,
	bounds: SheetStructureBounds[] = [],
) {
	const design = normalizeSheetDesign(designInput);
	const rowSpans = getSheetStructureProtectedAxisSpans(bounds, 'ROW');
	const columnSpans = getSheetStructureProtectedAxisSpans(bounds, 'COLUMN');
	const rowDelta = operation === 'INSERT_ROW_ABOVE' ? 1 : operation === 'DELETE_ROW' ? -1 : 0;
	const columnDelta = operation === 'INSERT_COLUMN_LEFT' ? 1 : operation === 'DELETE_COLUMN' ? -1 : 0;

	return {
		...design,
		grid: {
			...design.grid,
			columnCount: Math.max(1, design.grid.columnCount + columnDelta),
			rowCount: Math.max(1, design.grid.rowCount + rowDelta),
		},
		columns: columnDelta
			? shiftSheetAxisDesignForStructureEdit(design.columns, operation, targetIndex, columnSpans)
			: design.columns,
		rows: rowDelta
			? shiftSheetAxisDesignForStructureEdit(design.rows, operation, targetIndex, rowSpans)
			: design.rows,
	};
}

/*
 * Return one loaded row count after an optimistic row structure edit.
 */
export function getSheetLoadedRowCountAfterStructureEdit(
	loadedRowCount: number,
	operation: SheetStructureOperationEnum,
	nextDesign: SheetDesignObj,
) {
	const rowDelta = operation === 'INSERT_ROW_ABOVE' ? 1 : operation === 'DELETE_ROW' ? -1 : 0;

	return Math.max(1, Math.min(nextDesign.grid.rowCount, loadedRowCount + rowDelta));
}

/*
 * Return one last-content row index after an optimistic row structure edit.
 */
export function getSheetLastContentRowIndexAfterStructureEdit(
	lastContentRowIndex: number | null | undefined,
	operation: SheetStructureOperationEnum,
	targetIndex: number,
) {
	if (!lastContentRowIndex || operation === 'INSERT_COLUMN_LEFT' || operation === 'DELETE_COLUMN') {
		return lastContentRowIndex || null;
	}

	if (operation === 'INSERT_ROW_ABOVE' && targetIndex <= lastContentRowIndex) {
		return lastContentRowIndex + 1;
	}

	if (operation === 'DELETE_ROW' && targetIndex <= lastContentRowIndex) {
		return Math.max(1, lastContentRowIndex - 1);
	}

	return lastContentRowIndex;
}

/*
 * Return a SQL predicate that excludes coordinates inside protected region bounds.
 */
export function getSheetOutsideProtectedCellBoundsPredicate(
	bounds: SheetStructureBounds[],
	rowExpression: string,
	columnExpression: string,
	startParameterIndex: number,
): SheetStructureBoundsPredicate {
	if (!bounds.length) {
		return {
			args: [],
			text: 'TRUE',
		};
	}

	const args: number[] = [];
	const clauses = bounds.map((bound, index) => {
		const parameterIndex = startParameterIndex + (index * 4);

		args.push(bound.startRowIndex, bound.endRowIndex, bound.startColumnIndex, bound.endColumnIndex);

		return `(${rowExpression} BETWEEN $${parameterIndex} AND $${parameterIndex + 1}
			AND ${columnExpression} BETWEEN $${parameterIndex + 2} AND $${parameterIndex + 3})`;
	});

	return {
		args,
		text: `NOT (${clauses.join(' OR ')})`,
	};
}

/*
 * Return a SQL predicate that excludes ranges overlapping protected region bounds.
 */
export function getSheetOutsideProtectedRangeBoundsPredicate(
	bounds: SheetStructureBounds[],
	startRowExpression: string,
	endRowExpression: string,
	startColumnExpression: string,
	endColumnExpression: string,
	startParameterIndex: number,
): SheetStructureBoundsPredicate {
	if (!bounds.length) {
		return {
			args: [],
			text: 'TRUE',
		};
	}

	const args: number[] = [];
	const clauses = bounds.map((bound, index) => {
		const parameterIndex = startParameterIndex + (index * 4);

		args.push(bound.endRowIndex, bound.startRowIndex, bound.endColumnIndex, bound.startColumnIndex);

		return `(${startRowExpression} <= $${parameterIndex}
			AND ${endRowExpression} >= $${parameterIndex + 1}
			AND ${startColumnExpression} <= $${parameterIndex + 2}
			AND ${endColumnExpression} >= $${parameterIndex + 3})`;
	});

	return {
		args,
		text: `NOT (${clauses.join(' OR ')})`,
	};
}

/*
 * Return a SQL predicate that prevents row-delete shifts from crossing protected row spans.
 */
export function getSheetRowDeleteBarrierPredicate(
	bounds: SheetStructureBounds[],
	rowExpression: string,
	columnExpression: string,
	targetIndexExpression: string,
	startParameterIndex: number,
): SheetStructureBoundsPredicate {
	if (!bounds.length) {
		return {
			args: [],
			text: 'TRUE',
		};
	}

	const args: number[] = [];
	const clauses = bounds.map((bound, index) => {
		const parameterIndex = startParameterIndex + (index * 4);

		args.push(bound.startColumnIndex, bound.endColumnIndex, bound.startRowIndex, bound.endRowIndex);

		return `(${columnExpression} BETWEEN $${parameterIndex} AND $${parameterIndex + 1}
			AND $${parameterIndex + 2} <= ${rowExpression} - 1
			AND $${parameterIndex + 3} >= ${targetIndexExpression})`;
	});

	return {
		args,
		text: `NOT (${clauses.join(' OR ')})`,
	};
}

/*
 * Return a SQL predicate that prevents column-delete shifts from crossing protected column spans.
 */
export function getSheetColumnDeleteBarrierPredicate(
	bounds: SheetStructureBounds[],
	rowExpression: string,
	columnExpression: string,
	targetIndexExpression: string,
	startParameterIndex: number,
): SheetStructureBoundsPredicate {
	if (!bounds.length) {
		return {
			args: [],
			text: 'TRUE',
		};
	}

	const args: number[] = [];
	const clauses = bounds.map((bound, index) => {
		const parameterIndex = startParameterIndex + (index * 4);

		args.push(bound.startRowIndex, bound.endRowIndex, bound.startColumnIndex, bound.endColumnIndex);

		return `(${rowExpression} BETWEEN $${parameterIndex} AND $${parameterIndex + 1}
			AND $${parameterIndex + 2} <= ${columnExpression} - 1
			AND $${parameterIndex + 3} >= ${targetIndexExpression})`;
	});

	return {
		args,
		text: `NOT (${clauses.join(' OR ')})`,
	};
}

/*
 * Return a SQL predicate that prevents row-range shifts from crossing protected bounds.
 */
export function getSheetRangeRowDeleteBarrierPredicate(
	bounds: SheetStructureBounds[],
	startRowExpression: string,
	startColumnExpression: string,
	endColumnExpression: string,
	targetIndexExpression: string,
	startParameterIndex: number,
): SheetStructureBoundsPredicate {
	if (!bounds.length) {
		return {
			args: [],
			text: 'TRUE',
		};
	}

	const args: number[] = [];
	const clauses = bounds.map((bound, index) => {
		const parameterIndex = startParameterIndex + (index * 4);

		args.push(bound.startColumnIndex, bound.endColumnIndex, bound.startRowIndex, bound.endRowIndex);

		return `(${startColumnExpression} <= $${parameterIndex + 1}
			AND ${endColumnExpression} >= $${parameterIndex}
			AND $${parameterIndex + 2} <= ${startRowExpression} - 1
			AND $${parameterIndex + 3} >= ${targetIndexExpression})`;
	});

	return {
		args,
		text: `NOT (${clauses.join(' OR ')})`,
	};
}

/*
 * Return a SQL predicate that prevents column-range shifts from crossing protected bounds.
 */
export function getSheetRangeColumnDeleteBarrierPredicate(
	bounds: SheetStructureBounds[],
	startColumnExpression: string,
	startRowExpression: string,
	endRowExpression: string,
	targetIndexExpression: string,
	startParameterIndex: number,
): SheetStructureBoundsPredicate {
	if (!bounds.length) {
		return {
			args: [],
			text: 'TRUE',
		};
	}

	const args: number[] = [];
	const clauses = bounds.map((bound, index) => {
		const parameterIndex = startParameterIndex + (index * 4);

		args.push(bound.startRowIndex, bound.endRowIndex, bound.startColumnIndex, bound.endColumnIndex);

		return `(${startRowExpression} <= $${parameterIndex + 1}
			AND ${endRowExpression} >= $${parameterIndex}
			AND $${parameterIndex + 2} <= ${startColumnExpression} - 1
			AND $${parameterIndex + 3} >= ${targetIndexExpression})`;
	});

	return {
		args,
		text: `NOT (${clauses.join(' OR ')})`,
	};
}
