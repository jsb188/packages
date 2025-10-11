import type { FilterLogEntriesArgs } from '@jsb188/mday/types/log.d';
import { useQuery, useReactiveFragment } from '../client';
import { logEntriesQry } from '../gql/queries/logQueries';
import type { PaginationArgs, UseQueryParams } from '../types';

/**
 * Constants
 */

const LOG_ENTRIES_LIMIT = 200;

/**
 * Helper; use this to get/use same filter for logEntries() query everywhere
 */

export function getDefaultLogEntriesFilter(operation: FilterLogEntriesArgs['operation']): FilterLogEntriesArgs {
  return {
    operation,
    types: null,
    startDate: null,
    endDate: null,
    query: ''
  };
}

/**
 * Fetch log entries
 */

export function useLogEntries(
  variables: PaginationArgs & {
    organizationId: string;
    accountId?: string;
    timeZone: string | null;
    filter: FilterLogEntriesArgs;
  },
  params: UseQueryParams = {}
) {

  const { data, ...rest } = useQuery(logEntriesQry, {
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: LOG_ENTRIES_LIMIT
    },
    // If this query is used for virtualized list pagination, set {params.skip=true}
    skip: !variables.organizationId || !variables.filter?.operation,
    ...params,
  });

  return {
    logEntries: data?.logEntries,
    ...rest
  };
}

/**
 * Get reactive log fragment
 */

export function useReactiveLogFragment(logEntryId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$logEntryFragment:${logEntryId}`,

      // By having the second paramter as null, we only observe the reactive changes without setting the data
      // [`$logArableFragment:${logEntryId}`, null],

      // This is not needed because $logEntryFragment has spread data
      // [`$accountFragment:${logEntryId}`, 'account']
    ],
    queryCount,
  );
}
