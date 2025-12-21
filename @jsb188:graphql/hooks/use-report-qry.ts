import type { ReportsFilterArgs, ReportsSortEnum } from '@jsb188/mday/types/report.d';
import { useQuery, useReactiveFragment } from '../client';
import { reportsQry, reportSubmissionQry } from '../gql/queries/reportQueries';
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
    filter: ReportsFilterArgs;
    sort: ReportsSortEnum;
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

/**
 * Fetch report submissions for a single page in the report
 */

export function useReportSubmission(
  organizationId: string,
  reportId: string,
  sectionKey: string,
  period: string,
) {
  const { data, ...rest } = useQuery(reportSubmissionQry, {
    variables: {
      organizationId,
      reportId,
      sectionKey,
      period,
    },
    skip: !organizationId || !reportId || !sectionKey || !period,
  });

  const reportSubmission = data?.reportSubmission;
  const notReady = !reportSubmission;

  return {
    reportSubmission,
    notReady,
    ...rest
  };
}
