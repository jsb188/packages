import { useQuery, useReactiveFragment, useReactiveFragmentMap } from '@jsb188/graphql/client';
import { makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import { GRID_ITEM_LIST_LIMIT } from '@jsb188/mday/constants/sheet.ts';
import type { DataTablesFilterArgs } from '@jsb188/mday/types/dataTable.d.ts';
import type { GridItemSortEnum } from '@jsb188/mday/types/sheet.d.ts';
import { useMemo } from 'react';
import { dataTableCellsForRowsQry, dataTableQry, dataTableRowsQry, dataTablesQry } from '../gql/queries/dataTableQueries.ts';
import type { PaginationArgs, UseQueryParams } from '../types.d.ts';

/**
 * Constants
 */

const SHEET_ROWS_LIMIT = 200;

export type DataTablesVariables = PaginationArgs & {
	filter?: DataTablesFilterArgs | null;
	organizationId?: string | null;
	sort?: GridItemSortEnum | null;
};

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

/*
 * Return the query key that belongs to one source-cell hydration variables payload.
 */

export function getDataTableCellsForRowsQueryKey(variables: Record<string, unknown>) {
	return `#dataTableCellsForRows:${makeVariablesKey(variables)}`;
}

/*
 * Add front-end deleted status to deleted or inactive DataTable records.
 */

function mapDataTableDeletedStatus(dataTable: any) {
	if (!dataTable || dataTable.__deleted || (!dataTable.deletedAt && dataTable.active !== false)) {
		return dataTable;
	}

	return {
		...dataTable,
		__deleted: true,
	};
}

/*
 * Return whether one useDataTables input is the paginated variables object.
 */
function isDataTablesVariables(value: string | null | undefined | DataTablesVariables): value is DataTablesVariables {
	return !!value && typeof value === 'object';
}

/*
 * Return GraphQL variables for the paginated dataTables query.
 */
function getDataTablesQueryVariables(
	organizationIdOrVariables?: string | null | DataTablesVariables,
	active?: boolean | null,
): DataTablesVariables {
	if (isDataTablesVariables(organizationIdOrVariables)) {
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

/**
 * Fetch dataTables for an organization.
 */

export function useDataTables(
	organizationId?: string | null | DataTablesVariables,
	active?: boolean | null,
	params: UseQueryParams = {},
) {
	const variables = getDataTablesQueryVariables(organizationId, active);
	const { data, ...rest } = useQuery(dataTablesQry, {
		variables,
		skip: !variables.organizationId,
		...params,
	});
	const dataTables = useReactiveFragmentMap(data?.dataTables || null, 'dataTableFragment');
	const dataTablesWithDeletedStatus = useMemo(() => (
		dataTables?.map(mapDataTableDeletedStatus) || dataTables
	), [dataTables]);

	return {
		dataTables: dataTablesWithDeletedStatus,
		...rest,
	};
}

/*
 * Fetch one dataTable by id.
 */

export function useDataTable(
	dataTableId?: string | null,
	organizationId?: string | null,
	params: UseQueryParams = {},
) {
	const cachedDataTable = useReactiveDataTableFragment(dataTableId || '', null);
	const { data, ...rest } = useQuery(dataTableQry, {
		variables: {
			organizationId,
			dataTableId,
		},
		...params,
		skip: !organizationId || !dataTableId || !!cachedDataTable || !!params.skip,
	});
	const dataTable = useMemo(() => mapDataTableDeletedStatus(data?.dataTable), [data?.dataTable]);

	return {
		dataTable: cachedDataTable || dataTable,
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
	params: UseQueryParams = {},
) {
	const variables = {
		dataTableId,
		organizationId,
		cursor,
		limit,
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
 * Fetch DataTable source cells for a grouped set of row ids.
 */

export function useDataTableCellsForRows(
	organizationId?: string | null,
	requests?: Array<{
		dataTableId: string;
		dataTableRowIds: string[];
	}> | null,
	params: UseQueryParams = {},
) {
	const variables = {
		organizationId,
		requests: requests || [],
	};
	const { data, ...rest } = useQuery(dataTableCellsForRowsQry, {
		variables,
		skip: !organizationId || !requests?.length,
		...params,
	});
	const queryMatchesVariables = rest.queryKey === getDataTableCellsForRowsQueryKey(variables) ||
		rest.variablesKey === makeVariablesKey(variables);
	const reactiveCells = useReactiveFragmentMap(queryMatchesVariables ? data?.dataTableCellsForRows || null : null, 'dataTableCellFragment');

	return {
		dataTableCellsForRows: queryMatchesVariables ? reactiveCells : undefined,
		...rest,
	};
}

/**
 * Get reactive dataTable fragment.
 */

export function useReactiveDataTableFragment(dataTableId: string, currentData?: any, queryCount?: number) {
	const dataTable = useReactiveFragment(
		currentData,
		[`$dataTableFragment:${dataTableId}`],
		queryCount,
	);
	const dataTableWithDeletedStatus = useMemo(() => mapDataTableDeletedStatus(dataTable), [dataTable]);

	return dataTableWithDeletedStatus;
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
