import type { FilterLogEntriesArgs } from '@jsb188/mday/types/log.d.ts';
import { useQuery, useReactiveFragment } from '../client';
import { logEntriesForReportQry, logEntriesQry } from '../gql/queries/logQueries';
import type { PaginationArgs, UseQueryParams } from '../types';

/**
 * Constants
 */

// I tried 100, but that was way too small.
// Having less data is better for performance for iPads and low-end devices, because it might reduce brief rendering mishaps,
// But a decent amount of visual load size is needed for Virtualized List to work well.
const LOG_ENTRIES_LIMIT = 250;

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
    skip: !variables.organizationId || params.skip,
  });

  return {
    logEntries: data?.logEntries,
    ...rest
  };
}

/**
 * Fetch all log entries for one report source.
 */

export function useLogEntriesForReport(
  variables: {
    organizationId?: string | null;
    reportSourceId?: string | null;
    reportSubmissionId: string | null;
  },
  params: UseQueryParams = {}
) {
  const { organizationId, reportSourceId, reportSubmissionId } = variables;
  const { data, ...rest } = useQuery(logEntriesForReportQry, {
    ...params,
    variables,
    skip: !organizationId || !reportSourceId || !reportSubmissionId || params.skip,
  });

  return {
    logEntriesForReport: data?.logEntriesForReport,
    ...rest,
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
      [`$logArableFragment:${logEntryId}`, 'details'],
      [`$logFarmersMarketFragment:${logEntryId}`, 'details'],
      [`$logGrowerNetworkFragment:${logEntryId}`, 'details'],
      [`$logLivestockFragment:${logEntryId}`, 'details'],
    ],
    queryCount,
  );
}
