import type { PaginationArgs, UseQueryParams } from '../types';
import { useQuery } from '../client';
import { logEntriesQry } from '../gql/queries/logQueries';
import type { FilterLogEntriesArgs } from '@jsb188/mday/types/log.d';

/**
 * Constants
 */

const LOG_ENTRIES_LIMIT = 50;

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

interface LogEntriesArgs extends PaginationArgs {
  organizationId: string;
  accountId?: string;
  timeZone: string | null;
  filter: FilterLogEntriesArgs;
}

export function useLogEntries(variables: LogEntriesArgs, params: UseQueryParams = {}) {

  const { data, ...other } = useQuery(logEntriesQry, {
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
    ...other
  };
}
