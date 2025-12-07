import { gql } from 'graphql-tag';
import { reportFragment, reportSectionFragment, reportColumnDataFragment } from '../fragments/reportFragments';

export const reportsQry = gql`
query reports (
  $organizationId: GenericID!
  $filter: ReportsFilter!
) {
  reports (
    organizationId: $organizationId
    filter: $filter
  ) {
    ...reportFragment

    sections {
      ...reportSectionFragment
    }

    tables {
      headers {
        preset
        columns {
          ...reportColumnDataFragment
        }
      }
      rows {
        preset
        columns {
          ...reportColumnDataFragment
        }
      }
    }
  }
}

${reportFragment}
${reportSectionFragment}
${reportColumnDataFragment}
`;
