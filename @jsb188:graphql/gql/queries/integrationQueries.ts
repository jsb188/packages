import { gql } from 'graphql-tag';
import { squareConnectionFragment } from '../fragments/integrationFragments';

export const squareConnectionQry = gql`
query squareConnection (
  $organizationId: GenericID!
) {
  squareConnection (
    organizationId: $organizationId
  ) {
    ...squareConnectionFragment
  }
}

${squareConnectionFragment}
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
