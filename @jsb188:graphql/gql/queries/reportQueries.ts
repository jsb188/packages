import { gql } from 'graphql-tag';
import { reportFragment, reportSectionFragment } from '../fragments/reportFragments';

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
  }
}

${reportFragment}
${reportSectionFragment}
`;
