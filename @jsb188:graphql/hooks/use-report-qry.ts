import type { ReportsFilterArgs, ReportsSortEnum } from '@jsb188/mday/types/report.d.ts';
import { useQuery, useReactiveFragment, useReactiveFragmentMap } from '../client';
import { reportGroupsQry, reportQry, reportsQry, reportSubmissionsQry } from '../gql/queries/reportQueries';
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
 * Get reactive report submission fragment
 */

export function useReactiveReportSubmissionFragment(reportSubmissionId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$reportSubmissionFragment:${reportSubmissionId}`,
    ],
    queryCount,
  );
}

/**
 * Get reactive report column fragments for a row of report columns.
 */

export function useReactiveReportColumnFragmentMap(currentData?: any[] | null) {
  return useReactiveFragmentMap(currentData || null, 'reportColumnDataFragment');
}

/**
 * Fetch list of reports by type and period
 */

export function useReports(
  variables: {
    organizationId: string;
    filter: ReportsFilterArgs;
    sort?: ReportsSortEnum;
  },
  params: UseQueryParams = {},
) {

  const { organizationId, filter } = variables;
  const { skip, ...restParams } = params;
  const { data, ...rest } = useQuery(reportsQry, {
    variables,
    skip: skip || !organizationId || !filter?.reportGroupId || !(filter?.startPeriod || filter?.endPeriod),
    ...restParams,
  });

  return {
    reports: data?.reports,
    ...rest
  };
}

/**
 * Fetch one report by report source id
 */

export function useReport(
  organizationId: string | null,
  reportSourceId: string | null,
  params: UseQueryParams = {},
) {
  const { skip, ...restParams } = params;
  const { data, ...rest } = useQuery(reportQry, {
    variables: {
      organizationId,
      reportSourceId,
    },
    skip: skip || !organizationId || !reportSourceId,
    ...restParams,
  });

  return {
    report: data?.report,
    ...rest
  };
}

/**
 * Fetch list of report groups for organization
 */

export function useReportGroups(
  organizationId: string | null,
  params: UseQueryParams = {},
) {

  const { skip, ...restParams } = params;
  const { data, ...rest } = useQuery(reportGroupsQry, {
    variables: {
      organizationId,
    },
    skip: skip || !organizationId,
    ...restParams,
  });

  return {
    reportGroups: data?.reportGroups,
    ...rest
  };
}

/**
 * Fetch list of report submissions for organization
 */

export function useReportSubmissions(
  variables: {
    organizationId: string | null;
    filter: ReportsFilterArgs;
    sort?: ReportsSortEnum;
    limit?: number;
  },
  params: UseQueryParams = {},
) {

  const {
    organizationId,
    filter,
    sort = 'PERIOD_DESC',
    limit = 100,
  } = variables;
  const { skip, ...restParams } = params;
  const { data, ...rest } = useQuery(reportSubmissionsQry, {
    variables: {
      ...variables,
      sort,
      limit,
    },
    skip: skip || !organizationId || !filter,
    ...restParams,
  });

  return {
    reportSubmissions: data?.reportSubmissions,
    ...rest
  };
}
