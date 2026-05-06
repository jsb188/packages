import { gql } from 'graphql-tag';
import { integrationConnectionFragment } from '../fragments/integrationFragments.ts';

export const integrationConnectionQry = gql`
query integrationConnection (
  $organizationId: GenericID!
  $provider: String!
) {
  integrationConnection (
    organizationId: $organizationId
    provider: $provider
  ) {
    ...integrationConnectionFragment
  }
}

${integrationConnectionFragment}
`;

export const squareSalesTotalsQry = gql`
query squareSalesTotals (
  $organizationId: GenericID!
  $beginTime: DateTime!
  $endTime: DateTime!
  $locationId: String
) {
  squareSalesTotals (
    organizationId: $organizationId
    beginTime: $beginTime
    endTime: $endTime
    locationId: $locationId
  ) {
    currency
    grossAmount
    count

    totalsByLocation {
      locationId
      currency
      grossAmount
      count
    }
  }
}
`;
