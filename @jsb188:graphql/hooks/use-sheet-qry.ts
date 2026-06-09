import { makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import { GRID_ITEM_LIST_LIMIT } from '@jsb188/mday/constants/sheet.ts';
import type { SheetsFilterArgs, SheetFormulaReferenceObj, GridItemSortEnum } from '@jsb188/mday/types/sheet.d.ts';
import { useQuery, useReactiveFragment, useReactiveFragmentMap } from '@jsb188/graphql/client';
import { useMemo } from 'react';
import { sheetFormulaReferencesQry, sheetGridQry, sheetQry, sheetsQry } from '../gql/queries/sheetQueries.ts';
import type { PaginationArgs, UseQueryParams } from '../types.d.ts';

export type SheetGridViewportVariables = {
	startRowIndex: number;
	startColumnIndex: number;
	rowCount: number;
	columnCount: number;
};

export type SheetsVariables = PaginationArgs & {
	filter?: SheetsFilterArgs | null;
	organizationId?: string | null;
	sort?: GridItemSortEnum | null;
};

export type SheetFormulaReferenceInputVariables = Pick<
	SheetFormulaReferenceObj,
	| 'cellKey'
	| 'columnIndex'
	| 'columnLabel'
	| 'dataTableName'
	| 'endColumnIndex'
	| 'endRowIndex'
	| 'id'
	| 'kind'
	| 'rowIdentifier'
	| 'rowIndex'
	| 'startColumnIndex'
	| 'startRowIndex'
	| 'text'
>;

/*
 * Return the query key that belongs to one sheet grid variables key.
 */

function getSheetGridQueryKey(variablesKey: string) {
	return `#sheetGrid:${variablesKey}`;
}

/*
 * Return a formula reference cache key for one reference id.
 */
export function getSheetFormulaReferenceFragmentKey(referenceId: string) {
	return `$sheetFormulaReferenceFragment:${referenceId}`;
}

/*
 * Return GraphQL-safe input fields for one formula dependency reference.
 */
function getSheetFormulaReferenceInput(reference: SheetFormulaReferenceObj): SheetFormulaReferenceInputVariables {
	return {
		cellKey: reference.cellKey || null,
		columnIndex: reference.columnIndex ?? null,
		columnLabel: reference.columnLabel || null,
		dataTableName: reference.dataTableName || null,
		endColumnIndex: reference.endColumnIndex ?? null,
		endRowIndex: reference.endRowIndex ?? null,
		id: reference.id || null,
		kind: reference.kind,
		rowIdentifier: reference.rowIdentifier ?? null,
		rowIndex: reference.rowIndex ?? null,
		startColumnIndex: reference.startColumnIndex ?? null,
		startRowIndex: reference.startRowIndex ?? null,
		text: reference.text,
	};
}

/*
 * Return GraphQL-safe input fields for formula dependency references.
 */
function getSheetFormulaReferenceInputs(references?: SheetFormulaReferenceObj[] | null) {
	return (references || [])
		.filter((reference) => reference?.id && reference.kind && reference.text)
		.map(getSheetFormulaReferenceInput);
}

/*
 * Merge reactive SheetCell fragments back into a sheetGrid viewport.
 */

function mergeReactiveCellsIntoSheetGrid(sheetGrid?: any | null, sheetGridCells?: any[] | null) {
	if (!sheetGrid || !sheetGridCells) {
		return sheetGrid;
	}

	if (sheetGridCells === sheetGrid.cells && !sheetGridCells.some((cell) => cell?.__deleted)) {
		return sheetGrid;
	}

	const nextCells = sheetGridCells.filter((cell) => !cell?.__deleted);
	if (nextCells.length === sheetGrid.cells?.length && nextCells.every((cell, index) => cell === sheetGrid.cells[index])) {
		return sheetGrid;
	}

	return {
		...sheetGrid,
		cells: nextCells,
	};
}

/*
 * Add front-end deleted status to inactive or trashed Sheet records.
 */

function mapSheetDeletedStatus(sheet: any) {
	if (!sheet || sheet.__deleted || (!sheet.deletedAt && sheet.active !== false)) {
		return sheet;
	}

	return {
		...sheet,
		__deleted: true,
	};
}

/*
 * Return whether one useSheets input is the paginated variables object.
 */
function isSheetsVariables(value: string | null | undefined | SheetsVariables): value is SheetsVariables {
	return !!value && typeof value === 'object';
}

/*
 * Return GraphQL variables for the paginated sheets query.
 */
function getSheetsQueryVariables(
	organizationIdOrVariables?: string | null | SheetsVariables,
	active?: boolean | null,
): SheetsVariables {
	if (isSheetsVariables(organizationIdOrVariables)) {
		return {
			...organizationIdOrVariables,
			after: organizationIdOrVariables.after ?? true,
			cursor: organizationIdOrVariables.cursor ?? null,
			filter: organizationIdOrVariables.filter ?? null,
			limit: organizationIdOrVariables.limit ?? GRID_ITEM_LIST_LIMIT,
			sort: organizationIdOrVariables.sort || 'UPDATED_AT_DESC',
		};
	}

	return {
		organizationId: organizationIdOrVariables,
		after: true,
		cursor: null,
		filter: { active },
		limit: GRID_ITEM_LIST_LIMIT,
		sort: 'UPDATED_AT_DESC',
	};
}

/*
 * Fetch sheets for an organization.
 */

export function useSheets(
	organizationId?: string | null | SheetsVariables,
	active?: boolean | null,
	params: UseQueryParams = {},
) {
	const variables = getSheetsQueryVariables(organizationId, active);
	const { data, ...rest } = useQuery(sheetsQry, {
		variables,
		skip: !variables.organizationId,
		...params,
	});
	const sheets = useReactiveFragmentMap(data?.sheets || null, 'sheetFragment');
	const sheetsWithDeletedStatus = useMemo(() => (
		sheets?.map(mapSheetDeletedStatus) || sheets
	), [sheets]);

	return {
		sheets: sheetsWithDeletedStatus,
		...rest,
	};
}

/*
 * Fetch one sheet by id.
 */

export function useSheet(
	sheetId?: string | null,
	organizationId?: string | null,
	params: UseQueryParams = {},
) {
	const cachedSheet = useReactiveSheetFragment(sheetId || '', null);
	const { data, ...rest } = useQuery(sheetQry, {
		variables: {
			organizationId,
			sheetId,
		},
		...params,
		skip: !organizationId || !sheetId || !!cachedSheet || !!params.skip,
	});
	const sheet = useMemo(() => mapSheetDeletedStatus(data?.sheet), [data?.sheet]);

	return {
		sheet: cachedSheet || sheet,
		...rest,
	};
}

/*
 * Get reactive Sheet fragment.
 */

export function useReactiveSheetFragment(sheetId: string, currentData?: any, queryCount?: number) {
	const sheet = useReactiveFragment(
		currentData,
		[`$sheetFragment:${sheetId}`],
		queryCount,
	);
	const sheetWithDeletedStatus = useMemo(() => mapSheetDeletedStatus(sheet), [sheet]);

	return sheetWithDeletedStatus;
}

/*
 * Get reactive SheetGrid fragment.
 */

export function useReactiveSheetGridFragment(sheetGridId: string, currentData?: any, queryCount?: number) {
	const reactiveSheetGrid = useReactiveFragment(
		currentData,
		sheetGridId ? [`$sheetGridFragment:${sheetGridId}`] : [],
		queryCount,
	);

	if (!currentData || !reactiveSheetGrid) {
		return reactiveSheetGrid;
	}

	return {
		...currentData,
		regions: reactiveSheetGrid.regions ?? currentData.regions,
	};
}

/*
 * Get reactive SheetGrid cell fragments.
 */

export function useReactiveSheetGridCells(sheetGrid?: any | null) {
	const reactiveCells = useReactiveFragmentMap(sheetGrid?.cells || null, 'sheetCellFragment');

	return mergeReactiveCellsIntoSheetGrid(sheetGrid, reactiveCells);
}

/*
 * Get reactive SheetCell fragments.
 */
export function useReactiveSheetCells(cells?: any[] | null) {
	return useReactiveFragmentMap(cells || null, 'sheetCellFragment');
}

/*
 * Get reactive Sheet formula reference fragments.
 */
export function useReactiveSheetFormulaReferences(references?: SheetFormulaReferenceObj[] | null) {
	return useReactiveFragmentMap(references || null, 'sheetFormulaReferenceFragment') as SheetFormulaReferenceObj[] | null;
}

/*
 * Fetch formula dependency references that were incomplete in the sheetGrid response.
 */
export function useSheetFormulaReferences(
	sheetId?: string | null,
	organizationId?: string | null,
	references?: SheetFormulaReferenceObj[] | null,
	params: UseQueryParams = {},
) {
	const referenceInputs = useMemo(() => getSheetFormulaReferenceInputs(references), [references]);
	const { data, ...rest } = useQuery(sheetFormulaReferencesQry, {
		variables: {
			organizationId,
			sheetId,
			references: referenceInputs,
		},
		...params,
		skip: !organizationId || !sheetId || !referenceInputs.length || !!params.skip,
	});
	const sheetFormulaReferences = useReactiveSheetFormulaReferences(data?.sheetFormulaReferences || null);

	return {
		sheetFormulaReferences,
		...rest,
	};
}

/*
 * Fetch one sheet viewport by id.
 */

export function useSheetGrid(
	sheetId?: string | null,
	organizationId?: string | null,
	viewport?: SheetGridViewportVariables | null,
	params: UseQueryParams = {},
) {
	const variables = {
		organizationId,
		sheetId,
		viewport,
	};
	const { data, ...rest } = useQuery(sheetGridQry, {
		variables,
		skip: !organizationId || !sheetId || !viewport,
		...params,
	});
	const variablesKey = makeVariablesKey(variables);
	const queryMatchesVariables = rest.queryKey === getSheetGridQueryKey(variablesKey) ||
		rest.variablesKey === variablesKey;
	const reactiveSheetGrid = useReactiveSheetGridFragment(sheetId || '', queryMatchesVariables ? data?.sheetGrid : undefined);
	const sheetGrid = useReactiveSheetGridCells(reactiveSheetGrid);

	return {
		sheetGrid,
		...rest,
	};
}
