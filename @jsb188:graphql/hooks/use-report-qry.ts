import { useQuery, useReactiveFragment } from '../client';
import { reportsQry } from '../gql/queries/reportQueries';
import type { UseQueryParams } from '../types';

/**
 * Get reactive log fragment
 */

export function useReactiveReportFragment(reportId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$reportFragment:${reportId}`,
    ],
    queryCount,
  );
}

/**
 * Fetch list of reports by type and period
 */

export function useReports(
  variables: {
    organizationId: string;
    productId: string;
    calDate: string;
  },
  params: UseQueryParams = {},
) {

  const { organizationId } = variables;

  const { data, ...rest } = useQuery(reportsQry, {
    variables,
    skip: !organizationId,
    ...params,
  });

  const reports = data?.reports;
  const notReady = !reports;

  return {
    reports,
    notReady,
    ...rest
  };
}
