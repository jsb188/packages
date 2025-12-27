import { gql } from 'graphql-tag';
import { reportSubmissionFragment, reportFragment, reportSectionFragment, reportRowDataFragment, reportColumnDataFragment } from '../fragments/reportFragments';

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

    rows {
      ...reportRowDataFragment

      columns {
        ...reportColumnDataFragment
      }
    }
  }
}

${reportSubmissionFragment}
${reportRowDataFragment}
${reportColumnDataFragment}
`;
