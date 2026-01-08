import type { FilterLogEntriesArgs } from '@jsb188/mday/types/log.d';
import { useQuery, useReactiveFragment } from '../client';
import { logEntriesQry, logEvidencesQry } from '../gql/queries/logQueries';
import type { PaginationArgs, UseQueryParams } from '../types';

/**
 * Constants
 */

// I tried 100, but that was way too small.
// Having less data is better for performance for iPads and low-end devices, because it might reduce brief rendering mishaps,
// But a decent amount of visual load size is needed for Virtualized List to work well.
const LOG_ENTRIES_LIMIT = 250;

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
    organizationId?: string | null;
    accountId?: string;
    timeZone: string | null;
    filter: FilterLogEntriesArgs;
  },
  params: UseQueryParams = {}
) {
  const { data, ...rest } = useQuery(logEntriesQry, {
    ...params,
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: LOG_ENTRIES_LIMIT
    },
    // If this query is used for virtualized list pagination, set {params.skip=true}
    skip: !variables.organizationId || !variables.filter?.operation || params.skip,
  });

  return {
    logEntries: data?.logEntries,
    ...rest
  };
}

/**
 * Fetch logs as evidences for a specific report
 */

export function useLogEvidences(
  variables: {
    organizationId: string,
    reportId: string,
    cursor?: string | null,
    after?: boolean,
    limit?: number,
  },
  params: UseQueryParams = {}
) {
  const { data, ...rest } = useQuery(logEvidencesQry, {
    ...params,
    variables: {
      ...variables,
      after: variables.after ?? true,
      limit: variables.limit ?? 1000, // Change this when we have pagination support
    },
    skip: !variables.organizationId || !variables.reportId || params.skip,
  });

  return {
    logEvidences: data?.logEvidences,
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
