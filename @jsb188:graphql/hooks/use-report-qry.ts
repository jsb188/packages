import type { ReportsFilterArgs, ReportsSortEnum } from '@jsb188/mday/types/report.d';
import { useQuery, useReactiveFragment } from '../client';
import { availableReportsQry, reportsQry } from '../gql/queries/reportQueries';
import type { UseQueryParams } from '../types';

/**
 * Get reactive report fragment
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
 * Get reactive report section fragment
 */

export function useReactiveReportSectionFragment(reportSectionId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$reportSectionFragment:${reportSectionId}`,
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
    filter: ReportsFilterArgs;
    sort: ReportsSortEnum;
  },
  params: UseQueryParams = {},
) {

  const { organizationId, filter } = variables;
  const { skip, ...restParams } = params;
  const { data, ...rest } = useQuery(reportsQry, {
    variables,
    skip: skip || !organizationId || !filter,
    ...restParams,
  });

  return {
    reports: data?.reports,
    ...rest
  };
}

/**
 * Fetch list of available reports statuses
 */

export function useAvailableReports(
  organizationId: string | null,
  params: UseQueryParams = {},
) {

  const { skip, ...restParams } = params;
  const { data, ...rest } = useQuery(availableReportsQry, {
    variables: {
      organizationId,
    },
    skip: skip || !organizationId,
    ...restParams,
  });

  return {
    availableReports: data?.availableReports,
    ...rest
  };
}
