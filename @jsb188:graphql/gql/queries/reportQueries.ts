import { gql } from 'graphql-tag';
import { reportFragment } from '../fragments/reportFragments';

export const reportsQry = gql`
query reports (
  $organizationId: GenericID!
  $type: ReportType!
  $period: String!
) {
  reports (
    organizationId: $organizationId
    type: $type
    period: $period
  ) {
    ...reportFragment
  }
}

${reportFragment}
`;
