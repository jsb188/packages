import { gql } from 'graphql-tag';
import { reportColumnDataFragment, reportFragment, reportRowDataFragment, reportSectionFragment } from '../fragments/reportFragments';

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
    # Its used for cleaning logs only right now
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
