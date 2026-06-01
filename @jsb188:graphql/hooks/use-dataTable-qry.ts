import { useQuery, useReactiveFragment, useReactiveFragmentMap } from '@jsb188/graphql/client';
import { makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import { dataTableRowsQry, dataTablesQry } from '../gql/queries/dataTableQueries.ts';
import type { UseQueryParams } from '../types.d.ts';

/**
 * Constants
 */

const SHEET_ROWS_LIMIT = 200;

/*
 * Return all dataTable cell records nested under the provided dataTable rows.
 */

function getDataTableRowCells(dataTableRows?: any[] | null) {
	return dataTableRows?.flatMap((row) => row.cells || []) || null;
}

/*
 * Merge reactive dataTable cell fragments back into their parent dataTable rows.
 */

function mergeReactiveCellsIntoRows(dataTableRows?: any[] | null, dataTableCells?: any[] | null) {
	if (!dataTableRows || !dataTableCells) {
		return dataTableRows;
	}

	const cellMap = new Map(dataTableCells.map((cell) => [cell.id, cell]));
	let changedRows = false;

	const nextRows = dataTableRows.map((row) => {
		let changedCells = false;
		const nextCells = row.cells?.map((cell: any) => {
			const nextCell = cellMap.get(cell.id) || cell;
			if (nextCell !== cell) {
				changedCells = true;
			}

			return nextCell;
		}) || [];

		if (!changedCells) {
			return row;
		}

		changedRows = true;

		return {
			...row,
			cells: nextCells,
		};
	});

	return changedRows ? nextRows : dataTableRows;
}

/*
 * Get reactive dataTable rows and their nested cell fragments.
 */

export function useReactiveDataTableRows(dataTableRows?: any[] | null) {
	const reactiveRows = useReactiveFragmentMap(dataTableRows || null, 'dataTableRowFragment');
	const reactiveCells = useReactiveFragmentMap(getDataTableRowCells(reactiveRows || dataTableRows), 'dataTableCellFragment');

	return mergeReactiveCellsIntoRows(reactiveRows || dataTableRows, reactiveCells);
}

/*
 * Return the query key that belongs to one dataTable rows variables payload.
 */

function getDataTableRowsQueryKey(variables: Record<string, unknown>) {
	return `#dataTableRows:${makeVariablesKey(variables)}`;
}

/**
 * Fetch dataTables for an organization.
 */

export function useDataTables(
	organizationId?: string | null,
	active?: boolean | null,
	params: UseQueryParams = {},
) {
	const { data, ...rest } = useQuery(dataTablesQry, {
		variables: {
			organizationId,
			active,
		},
		skip: !organizationId,
		...params,
	});

	return {
		dataTables: data?.dataTables,
		...rest,
	};
}

/**
 * Fetch rows and cells for one dataTable.
 */

export function useDataTableRows(
	dataTableId?: string | null,
	organizationId?: string | null,
	cursor?: string | null,
	limit: number = SHEET_ROWS_LIMIT,
	filter?: {
		viewId?: string | null;
	} | null,
	params: UseQueryParams = {},
) {
	const variables = {
		dataTableId,
		organizationId,
		cursor,
		limit,
		filter,
	};
	const { data, ...rest } = useQuery(dataTableRowsQry, {
		variables,
		skip: !organizationId || !dataTableId,
		...params,
	});

	const queryMatchesVariables = rest.queryKey === getDataTableRowsQueryKey(variables) ||
		rest.variablesKey === makeVariablesKey(variables);
	const dataTableRows = useReactiveDataTableRows(queryMatchesVariables ? data?.dataTableRows : null);

	return {
		dataTableRows: queryMatchesVariables ? dataTableRows : undefined,
		...rest,
	};
}

/**
 * Get reactive dataTable fragment.
 */

export function useReactiveDataTableFragment(dataTableId: string, currentData?: any, queryCount?: number) {
	return useReactiveFragment(
		currentData,
		[`$dataTableFragment:${dataTableId}`],
		queryCount,
	);
}

/**
 * Get reactive dataTable row fragment.
 */

export function useReactiveDataTableRowFragment(dataTableRowId: string, currentData?: any, queryCount?: number) {
	return useReactiveFragment(
		currentData,
		[`$dataTableRowFragment:${dataTableRowId}`],
		queryCount,
	);
}

/**
 * Get reactive dataTable cell fragment.
 */

export function useReactiveDataTableCellFragment(dataTableCellId: string, currentData?: any, queryCount?: number) {
	return useReactiveFragment(
		currentData,
		[`$dataTableCellFragment:${dataTableCellId}`],
		queryCount,
	);
}
