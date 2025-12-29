import { gql } from 'graphql-tag';
import { reportColumnDataFragment, reportFragment, reportRowDataFragment, reportSectionFragment, reportSubmissionFragment } from '../fragments/reportFragments';
import { logEntryFragmentImports, logEntryFragmentStatement } from './logQueries';

export const reportsQry = gql`
query reports (
  $organizationId: GenericID!
  $filter: ReportsFilter!
  $sort: ReportsSort
) {
  reports (
    organizationId: $organizationId
    filter: $filter
    sort: $sort
  ) {
    ...reportFragment

    sections {
      ...reportSectionFragment
    }

    rows {
      ...reportRowDataFragment

      columns {
        ...reportColumnDataFragment
      }
    }
  }
}

${reportFragment}
${reportSectionFragment}
${reportRowDataFragment}
${reportColumnDataFragment}
`;

export const reportSubmissionsQry = gql`
query reportSubmissions (
  $organizationId: GenericID!
  $reportId: GenericID!
  $period: CalDateString!
) {
  reportSubmissions (
    organizationId: $organizationId
    reportId: $reportId
    period: $period
  ) {
    ...reportSubmissionFragment

    evidences {
      id
      reportSubmissionId
      sectionKey

      log {
        ${logEntryFragmentStatement}
      }
    }

    rows {
      ...reportRowDataFragment

      columns {
        ...reportColumnDataFragment
      }
    }
  }
}

${logEntryFragmentImports}
${reportSubmissionFragment}
${reportRowDataFragment}
${reportColumnDataFragment}
`;
