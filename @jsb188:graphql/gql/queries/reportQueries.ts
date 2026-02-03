import { gql } from 'graphql-tag';
import { reportColumnDataFragment, reportFragment, reportAvailabilityFragment, reportRowDataFragment, reportSectionFragment } from '../fragments/reportFragments';
import { storageFileFragment } from '../fragments/storageFragments';

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

      files {
        ...storageFileFragment
      }

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
${storageFileFragment}
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
