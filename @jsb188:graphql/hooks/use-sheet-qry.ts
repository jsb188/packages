import { GRID_ITEM_LIST_LIMIT } from '@jsb188/mday/constants/sheet.ts';
import type { SheetsFilterArgs, GridItemSortEnum } from '@jsb188/mday/types/sheet.d.ts';
import { useQuery, useReactiveFragment, useReactiveFragmentMap } from '@jsb188/graphql/client';
import { useMemo } from 'react';
import { sheetQry, sheetsQry, sheetViewQry } from '../gql/queries/sheetQueries.ts';
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

  // IMPORTANT: Keep `|| data?.sheet` here -- this prevents an incorrect !sheet state and `loading` state mismatch
  // It's either that or we have to NOT use useMemo() here, both are valid options.
	const sheet = useMemo(() => mapSheetDeletedStatus(data?.sheet), [data?.sheet]) || data?.sheet;

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
 * Get reactive SheetCell fragments.
 */
export function useReactiveSheetCells(cells?: any[] | null) {
	return useReactiveFragmentMap(cells || null, 'sheetCellFragment');
}

/*
 * Return the reactive fragment key carrying realtime sheetView cell deltas
 * for one sheet ({ id, cellsDelta, deletedCellCoords } patches).
 */
export function getSheetViewFragmentKey(sheetId: string) {
	return `$sheetViewFragment:${sheetId}`;
}

/*
 * Fetch one full sheet viewport in a single round trip: sheet metadata plus
 * cells that already carry their final server-computed values (user cells and
 * materialized region cells uniformly). No second-phase formula reference
 * resolution is needed.
 *
 * NOTE: The result is intentionally NOT wrapped in useReactiveFragment.
 * Realtime updates arrive as $sheetViewFragment cell deltas which the sheet
 * cell store consumes directly (observeReactiveFragments +
 * getSheetViewFragmentKey); merging them into this query result would fight
 * the store's revision-gated merge.
 */

export function useSheetView(
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
	const { data, ...rest } = useQuery(sheetViewQry, {
		variables,
		skip: !organizationId || !sheetId || !viewport,
		...params,
	});

	return {
		sheetView: data?.sheetView || null,
		...rest,
	};
}
