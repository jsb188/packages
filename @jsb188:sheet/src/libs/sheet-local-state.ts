import type { DataTableRowsForSheetRegionGQL } from '@jsb188/mday/types/dataTable.d.ts';
import type { SheetCellGQL, SheetFormulaReferenceObj, SheetRegionGQL } from '@jsb188/mday/types/sheet.d.ts';
import { isSheetFormulaText } from '@jsb188/mday/utils/sheet.ts';
import {
	getClientCalculatedSheetFormulaCell,
	sheetCellCanClientCalculateFormula,
	sheetFormulaTextIsClientPreviewable,
} from './sheet-formula-evaluation.ts';
import {
	getOptimisticSheetCellFromEditInput,
	getSheetCellSnapshotEditInput,
	type SheetCellEditInput,
} from './sheet-history.ts';
import { getSheetCanvasCoordKey } from './sheet-utils.ts';

export type SheetLocalRegionUpsertInput = {
	region: SheetRegionGQL;
	replaceRegionId?: string | null;
	rows?: DataTableRowsForSheetRegionGQL | null;
};

export type SheetLocalRegionDeleteInput = {
	regionId: string;
};

export type SheetOptimisticCellEditTransitionParams = {
	baseCellsByCoord: Map<string, SheetCellGQL>;
	currentOptimisticCellsByCoord: Map<string, SheetCellGQL>;
	formulaDependencyCellsByCoord?: Map<string, SheetCellGQL> | null;
	formulaReferencesById?: Map<string, SheetFormulaReferenceObj> | null;
	inputs: SheetCellEditInput[];
	timeZone?: string | null;
};

export type SheetOptimisticCellEditTransition = {
	optimisticCellsByCoord: Map<string, SheetCellGQL>;
	saveInputs: SheetCellEditInput[];
};

/*
 * Return Sheet cell coordinate maps merged from left to right.
 */
export function mergeSheetCellCoordMaps(...maps: Array<Map<string, SheetCellGQL> | null | undefined>) {
	const next = new Map<string, SheetCellGQL>();

	maps.forEach((map) => {
		map?.forEach((cell, key) => {
			next.set(key, cell);
		});
	});

	return next;
}

/*
 * Return cells overlaid on top of any fetched formula dependency cells.
 */
export function getSheetFormulaCalculationCellsByCoord(
	cellsByCoord: Map<string, SheetCellGQL>,
	dependencyCellsByCoord?: Map<string, SheetCellGQL> | null,
) {
	if (!dependencyCellsByCoord?.size) {
		return cellsByCoord;
	}

	const next = new Map(dependencyCellsByCoord);

	cellsByCoord.forEach((cell, key) => {
		next.set(key, cell);
	});

	return next;
}

/*
 * Return one optimistic Sheet cell with client-calculated formula values applied when possible.
 */
export function getClientCalculatedOptimisticSheetCell(params: {
	cell: SheetCellGQL;
	cellsByCoord: Map<string, SheetCellGQL>;
	formulaReferencesById?: Map<string, SheetFormulaReferenceObj> | null;
	timeZone?: string | null;
}) {
	if (!sheetCellCanClientCalculateFormula(params.cell)) {
		return params.cell;
	}

	return getClientCalculatedSheetFormulaCell({
		cell: params.cell,
		cellsByCoord: params.cellsByCoord,
		referencesById: params.formulaReferencesById,
		timeZone: params.timeZone,
	});
}

/*
 * Return the optimistic cell and mutation payload state after applying Sheet cell edit inputs locally.
 */
export function getSheetOptimisticCellEditTransition(
	params: SheetOptimisticCellEditTransitionParams,
): SheetOptimisticCellEditTransition {
	const nextOptimisticCellsByCoord = new Map(params.currentOptimisticCellsByCoord);
	const pendingCells = params.inputs.map((input) => {
		const key = getSheetCanvasCoordKey(input.cell.rowIndex, input.cell.columnIndex);
		const currentCell = nextOptimisticCellsByCoord.get(key) || params.baseCellsByCoord.get(key) || null;
		const optimisticCell = getOptimisticSheetCellFromEditInput(input, currentCell);

		nextOptimisticCellsByCoord.set(key, optimisticCell);

		return {
			input,
			key,
			optimisticCell,
		};
	});
	const formulaCalculationCellsByCoord = getSheetFormulaCalculationCellsByCoord(
		mergeSheetCellCoordMaps(
			params.baseCellsByCoord,
			nextOptimisticCellsByCoord,
		),
		params.formulaDependencyCellsByCoord,
	);
	const saveInputs = pendingCells.map(({ input, key, optimisticCell }) => {
		let calculatedCell = getClientCalculatedOptimisticSheetCell({
			cell: optimisticCell,
			cellsByCoord: formulaCalculationCellsByCoord,
			formulaReferencesById: params.formulaReferencesById,
			timeZone: params.timeZone,
		});

		// Formulas with data table references resolve on the server: render a
		// loading state until the mutation result carries the computed value
		const pendingFormulaText = calculatedCell.formulaText || calculatedCell.formula?.text || calculatedCell.rawInput || '';
		if (
			calculatedCell.sourceType !== 'REGION_GENERATED' &&
			isSheetFormulaText(pendingFormulaText) &&
			!sheetFormulaTextIsClientPreviewable(pendingFormulaText)
		) {
			calculatedCell = {
				...calculatedCell,
				__formulaLoading: true,
				value: null,
				textValue: null,
				numberValue: null,
				booleanValue: null,
				dateValue: null,
				datetimeValue: null,
			} as SheetCellGQL;
		}

		nextOptimisticCellsByCoord.set(key, calculatedCell);

		return input.clear
			? input
			: getSheetCellSnapshotEditInput(input.cell.rowIndex, input.cell.columnIndex, calculatedCell);
	});

	return {
		optimisticCellsByCoord: nextOptimisticCellsByCoord,
		saveInputs,
	};
}

/*
 * Return Sheet regions with local optimistic region edits layered over server regions.
 */
export function getSheetRegionsWithLocalUpdates(
	serverRegions?: SheetRegionGQL[] | null,
	localRegions?: SheetRegionGQL[] | null,
) {
	if (!localRegions) {
		return serverRegions || [];
	}

	const localRegionIds = new Set(localRegions.map((region) => String(region.id || '')));
	const activeServerRegions = (serverRegions || []).filter((region) => {
		return !localRegionIds.has(String(region.id || ''));
	});

	return [
		...activeServerRegions,
		...localRegions.filter((region) => region.active !== false),
	];
}

/*
 * Return local Sheet regions after one optimistic region upsert.
 */
export function upsertSheetLocalRegion(
	currentRegions: SheetRegionGQL[] | null,
	serverRegions: SheetRegionGQL[] | null | undefined,
	input: SheetLocalRegionUpsertInput,
) {
	const baseRegions = getSheetRegionsWithLocalUpdates(serverRegions, currentRegions);
	const replaceRegionId = String(input.replaceRegionId || input.region.id || '');
	let inserted = false;
	const nextRegions = baseRegions.map((region) => {
		if (String(region.id || '') !== replaceRegionId) {
			return region;
		}

		inserted = true;
		return input.region;
	});

	return inserted ? nextRegions : [...nextRegions, input.region];
}

/*
 * Return local Sheet regions after one optimistic region delete.
 */
export function deleteSheetLocalRegion(
	currentRegions: SheetRegionGQL[] | null,
	serverRegions: SheetRegionGQL[] | null | undefined,
	input: SheetLocalRegionDeleteInput,
) {
	const regionId = String(input.regionId || '');
	const baseRegions = getSheetRegionsWithLocalUpdates(serverRegions, currentRegions);
	let deleted = false;

	// Keep the deleted region as an inactive tombstone: its id must stay in
	// the local list so the stale server copy is excluded from the merged
	// result until the server's regions patch catches up
	const nextRegions = baseRegions.map((region) => {
		if (String(region.id || '') !== regionId) {
			return region;
		}

		deleted = true;
		return {
			...region,
			active: false,
		};
	});

	return deleted ? nextRegions : currentRegions;
}

