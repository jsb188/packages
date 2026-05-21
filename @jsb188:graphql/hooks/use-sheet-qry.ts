import { useQuery, useReactiveFragment, useReactiveFragmentMap } from '@jsb188/graphql/client';
import { makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import { sheetRowsQry, sheetsQry } from '../gql/queries/sheetQueries.ts';
import type { UseQueryParams } from '../types.d.ts';

/**
 * Constants
 */

const SHEET_ROWS_LIMIT = 200;

/*
 * Return all sheet cell records nested under the provided sheet rows.
 */

function getSheetRowCells(sheetRows?: any[] | null) {
	return sheetRows?.flatMap((row) => row.cells || []) || null;
}

/*
 * Merge reactive sheet cell fragments back into their parent sheet rows.
 */

function mergeReactiveCellsIntoRows(sheetRows?: any[] | null, sheetCells?: any[] | null) {
	if (!sheetRows || !sheetCells) {
		return sheetRows;
	}

	const cellMap = new Map(sheetCells.map((cell) => [cell.id, cell]));

	return sheetRows.map((row) => ({
		...row,
		cells: row.cells?.map((cell: any) => cellMap.get(cell.id) || cell) || [],
	}));
}

/*
 * Get reactive sheet rows and their nested cell fragments.
 */

export function useReactiveSheetRows(sheetRows?: any[] | null) {
	const reactiveRows = useReactiveFragmentMap(sheetRows || null, 'sheetRowFragment');
	const reactiveCells = useReactiveFragmentMap(getSheetRowCells(reactiveRows || sheetRows), 'sheetCellFragment');

	return mergeReactiveCellsIntoRows(reactiveRows || sheetRows, reactiveCells);
}

/*
 * Return the query key that belongs to one sheet rows variables payload.
 */

function getSheetRowsQueryKey(variables: Record<string, unknown>) {
	return `#sheetRows:${makeVariablesKey(variables)}`;
}

/**
 * Fetch sheets for an organization.
 */

export function useSheets(
	organizationId?: string | null,
	active?: boolean | null,
	params: UseQueryParams = {},
) {
	const { data, ...rest } = useQuery(sheetsQry, {
		variables: {
			organizationId,
			active,
		},
		skip: !organizationId,
		...params,
	});

	return {
		sheets: data?.sheets,
		...rest,
	};
}

/**
 * Fetch rows and cells for one sheet.
 */

export function useSheetRows(
	sheetId?: string | null,
	organizationId?: string | null,
	cursor?: string | null,
	limit: number = SHEET_ROWS_LIMIT,
	filter?: {
		viewId?: string | null;
	} | null,
	params: UseQueryParams = {},
) {
	const variables = {
		sheetId,
		organizationId,
		cursor,
		limit,
		filter,
	};
	const { data, ...rest } = useQuery(sheetRowsQry, {
		variables,
		skip: !organizationId || !sheetId,
		...params,
	});

	const queryMatchesVariables = rest.queryKey === getSheetRowsQueryKey(variables) ||
		rest.variablesKey === makeVariablesKey(variables);
	const sheetRows = useReactiveSheetRows(queryMatchesVariables ? data?.sheetRows : null);

	return {
		sheetRows: queryMatchesVariables ? sheetRows : undefined,
		...rest,
	};
}

/**
 * Get reactive sheet fragment.
 */

export function useReactiveSheetFragment(sheetId: string, currentData?: any, queryCount?: number) {
	return useReactiveFragment(
		currentData,
		[`$sheetFragment:${sheetId}`],
		queryCount,
	);
}

/**
 * Get reactive sheet row fragment.
 */

export function useReactiveSheetRowFragment(sheetRowId: string, currentData?: any, queryCount?: number) {
	return useReactiveFragment(
		currentData,
		[`$sheetRowFragment:${sheetRowId}`],
		queryCount,
	);
}

/**
 * Get reactive sheet cell fragment.
 */

export function useReactiveSheetCellFragment(sheetCellId: string, currentData?: any, queryCount?: number) {
	return useReactiveFragment(
		currentData,
		[`$sheetCellFragment:${sheetCellId}`],
		queryCount,
	);
}
