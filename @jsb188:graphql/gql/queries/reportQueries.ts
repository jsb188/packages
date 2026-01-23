import { gql } from 'graphql-tag';
import { reportColumnDataFragment, reportFragment, reportAvailabilityFragment, reportRowDataFragment, reportSectionFragment } from '../fragments/reportFragments';

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

      rows {
        ...reportRowDataFragment

        columns {
          ...reportColumnDataFragment
        }
      }
    }

    # This needs to be deprecated and merged to sections
    # Its only used for cleaning logs right now

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

export const availableReportsQry = gql`
query availableReports (
  $organizationId: GenericID!
) {
  availableReports (
    organizationId: $organizationId
  ) {
    ...reportAvailabilityFragment
  }
}

${reportAvailabilityFragment}
`;
