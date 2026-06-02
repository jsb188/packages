import { makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import { useQuery, useReactiveFragment, useReactiveFragmentMap } from '@jsb188/graphql/client';
import { sheetGridQry, sheetQry, sheetsQry } from '../gql/queries/sheetQueries.ts';
import type { UseQueryParams } from '../types.d.ts';

export type SheetGridViewportVariables = {
	startRowIndex: number;
	startColumnIndex: number;
	rowCount: number;
	columnCount: number;
};

/*
 * Return the query key that belongs to one sheet grid variables key.
 */

function getSheetGridQueryKey(variablesKey: string) {
	return `#sheetGrid:${variablesKey}`;
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

/*
 * Fetch one sheet by id.
 */

export function useSheet(
	sheetId?: string | null,
	organizationId?: string | null,
	params: UseQueryParams = {},
) {
	const { data, ...rest } = useQuery(sheetQry, {
		variables: {
			organizationId,
			sheetId,
		},
		skip: !organizationId || !sheetId,
		...params,
	});

	return {
		sheet: data?.sheet,
		...rest,
	};
}

/*
 * Get reactive Sheet fragment.
 */

export function useReactiveSheetFragment(sheetId: string, currentData?: any, queryCount?: number) {
	return useReactiveFragment(
		currentData,
		[`$sheetFragment:${sheetId}`],
		queryCount,
	);
}

/*
 * Get reactive SheetGrid fragment.
 */

export function useReactiveSheetGridFragment(sheetGridId: string, currentData?: any, queryCount?: number) {
	return useReactiveFragment(
		currentData,
		sheetGridId ? [`$sheetGridFragment:${sheetGridId}`] : [],
		queryCount,
	);
}

/*
 * Get reactive SheetGrid cell fragments.
 */

export function useReactiveSheetGridCells(sheetGrid?: any | null) {
	const reactiveCells = useReactiveFragmentMap(sheetGrid?.cells || null, 'sheetCellFragment');

	return mergeReactiveCellsIntoSheetGrid(sheetGrid, reactiveCells);
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
