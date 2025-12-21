import { gql } from 'graphql-tag';
import { reportFragment, reportSectionFragment, reportRowDataFragment, reportColumnDataFragment } from '../fragments/reportFragments';

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
