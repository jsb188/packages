import type {
	SheetCellGQL,
	SheetDesignObj,
	SheetGridGQL,
	SheetGridViewportObj,
	SheetRangeGQL,
	SheetStructureOperationEnum,
} from '@jsb188/mday/types/sheet.d.ts';
import {
	applySheetStructureEditToCellsByCoord,
	getSheetLastContentRowIndexAfterStructureEdit,
	getSheetLoadedRowCountAfterStructureEdit,
	type SheetStructureBounds,
} from './sheet-structure-edit.ts';
import {
	getSheetCanvasCellsByCoord,
	type SheetLoadedGridState,
} from './sheet-utils.ts';

export type SheetPendingStructureGridState = {
	cellsByCoord: Map<string, SheetCellGQL>;
	design: SheetDesignObj;
	ranges: SheetRangeGQL[];
};

/*
 * Return the local loaded-grid state after projecting one structure edit through cached cells.
 */
export function getSheetLoadedGridStateAfterStructureEdit(params: {
	bounds: SheetStructureBounds[];
	currentState: SheetLoadedGridState;
	fallbackCellsByCoord: Map<string, SheetCellGQL>;
	nextDesign: SheetDesignObj;
	operation: SheetStructureOperationEnum;
	targetIndex: number;
}) {
	const cellsByCoord = params.currentState.cellsByCoord.size
		? params.currentState.cellsByCoord
		: params.fallbackCellsByCoord;

	return {
		...params.currentState,
		cellsByCoord: applySheetStructureEditToCellsByCoord(
			cellsByCoord,
			params.operation,
			params.targetIndex,
			params.bounds,
		),
		lastContentRowIndex: getSheetLastContentRowIndexAfterStructureEdit(
			params.currentState.lastContentRowIndex,
			params.operation,
			params.targetIndex,
		),
		loadedRowCount: getSheetLoadedRowCountAfterStructureEdit(
			params.currentState.loadedRowCount,
			params.operation,
			params.nextDesign,
		),
	};
}

/*
 * Give React and the browser one frame to paint the optimistic structure edit before starting the mutation.
 */
export function waitForSheetStructureOptimisticPaint() {
	return new Promise<void>((resolve) => {
		if (typeof globalThis.requestAnimationFrame === 'function') {
			globalThis.requestAnimationFrame(() => resolve());
			return;
		}

		globalThis.setTimeout(resolve, 0);
	});
}

/*
 * Return viewport bounds for comparing a pending local projection with a fetched grid payload.
 */
function getSheetGridViewportBounds(viewport?: Partial<SheetGridViewportObj> | null) {
	const startRowIndex = Math.max(1, Math.floor(Number(viewport?.startRowIndex || 1)));
	const startColumnIndex = Math.max(1, Math.floor(Number(viewport?.startColumnIndex || 1)));
	const rowCount = Math.max(1, Math.floor(Number(viewport?.rowCount || 1)));
	const columnCount = Math.max(1, Math.floor(Number(viewport?.columnCount || 1)));

	return {
		endColumnIndex: startColumnIndex + columnCount - 1,
		endRowIndex: startRowIndex + rowCount - 1,
		startColumnIndex,
		startRowIndex,
	};
}

/*
 * Return whether one cell coordinate belongs to one viewport.
 */
function isSheetCellCoordInsideViewport(coordKey: string, viewport?: Partial<SheetGridViewportObj> | null) {
	const [rowIndexString, columnIndexString] = coordKey.split(':');
	const rowIndex = Number(rowIndexString || 0);
	const columnIndex = Number(columnIndexString || 0);
	const bounds = getSheetGridViewportBounds(viewport);

	return rowIndex >= bounds.startRowIndex &&
		rowIndex <= bounds.endRowIndex &&
		columnIndex >= bounds.startColumnIndex &&
		columnIndex <= bounds.endColumnIndex;
}

/*
 * Return whether one saved range intersects the fetched grid viewport.
 */
function sheetGridRangeIntersectsViewport(range: SheetRangeGQL, viewport?: Partial<SheetGridViewportObj> | null) {
	const bounds = getSheetGridViewportBounds(viewport);

	return Number(range.startRowIndex || 0) <= bounds.endRowIndex &&
		Number(range.endRowIndex || 0) >= bounds.startRowIndex &&
		Number(range.startColumnIndex || 0) <= bounds.endColumnIndex &&
		Number(range.endColumnIndex || 0) >= bounds.startColumnIndex;
}

/*
 * Return a stable comparison key for one sparse sheet cell.
 */
function getSheetGridCellComparisonKey(cell?: SheetCellGQL | null) {
	if (!cell) {
		return '';
	}

	return [
		cell.id || '',
		cell.rowIndex || '',
		cell.columnIndex || '',
		cell.sourceType || '',
		cell.regionId || '',
	].join('|');
}

/*
 * Return whether the fetched grid cells match the pending local projection inside the fetched viewport.
 */
export function sheetGridCellsMatchPendingStructure(sheetGrid: SheetGridGQL, pending: SheetPendingStructureGridState) {
	const incomingCellsByCoord = getSheetCanvasCellsByCoord(sheetGrid.cells as SheetCellGQL[] | null);

	for (const [coordKey, incomingCell] of incomingCellsByCoord) {
		const expectedCell = pending.cellsByCoord.get(coordKey) || null;
		if (getSheetGridCellComparisonKey(incomingCell) !== getSheetGridCellComparisonKey(expectedCell)) {
			return false;
		}
	}

	for (const [coordKey, expectedCell] of pending.cellsByCoord) {
		if (!isSheetCellCoordInsideViewport(coordKey, sheetGrid.viewport)) {
			continue;
		}

		const incomingCell = incomingCellsByCoord.get(coordKey) || null;
		if (getSheetGridCellComparisonKey(incomingCell) !== getSheetGridCellComparisonKey(expectedCell)) {
			return false;
		}
	}

	return true;
}

/*
 * Return a stable comparison key for one saved range.
 */
function getSheetGridRangeComparisonKey(range: SheetRangeGQL) {
	return [
		range.id || '',
		range.startRowIndex || '',
		range.startColumnIndex || '',
		range.endRowIndex || '',
		range.endColumnIndex || '',
		range.position || '',
		range.active ?? '',
	].join('|');
}

/*
 * Return whether fetched ranges match the pending local range projection.
 */
export function sheetGridRangesMatchPendingStructure(sheetGrid: SheetGridGQL, pending: SheetPendingStructureGridState) {
	const incomingKeys = (sheetGrid.ranges || []).map(getSheetGridRangeComparisonKey).sort();
	const expectedKeys = pending.ranges
		.filter((range) => sheetGridRangeIntersectsViewport(range, sheetGrid.viewport))
		.map(getSheetGridRangeComparisonKey)
		.sort();

	return incomingKeys.length === expectedKeys.length &&
		incomingKeys.every((key, index) => key === expectedKeys[index]);
}

/*
 * Return whether the server Sheet design has caught up to one optimistic structure design.
 */
export function sheetStructureDesignMatchesServerDesign(serverDesign: SheetDesignObj, optimisticDesign?: SheetDesignObj | null) {
	if (!optimisticDesign) {
		return false;
	}

	return (
		serverDesign.grid.rowCount === optimisticDesign.grid.rowCount &&
		serverDesign.grid.columnCount === optimisticDesign.grid.columnCount &&
		JSON.stringify(serverDesign.rows || {}) === JSON.stringify(optimisticDesign.rows || {}) &&
		JSON.stringify(serverDesign.columns || {}) === JSON.stringify(optimisticDesign.columns || {})
	);
}
