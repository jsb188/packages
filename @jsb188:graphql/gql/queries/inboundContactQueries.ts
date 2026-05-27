import { gql } from 'graphql-tag';
import { inboundContactFragment } from '../fragments/inboundContactFragments.ts';

export const inboundContactQry = gql`
query inboundContact (
  $organizationId: GenericID!
  $inboundContactId: GenericID!
) {
  inboundContact (
    organizationId: $organizationId
    inboundContactId: $inboundContactId
  ) {
    ...inboundContactFragment
  }
}

${inboundContactFragment}
`;

export const inboundContactsQry = gql`
query inboundContacts (
  $organizationId: GenericID!
  $sort: InboundContactsSort
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  inboundContacts (
    organizationId: $organizationId
    sort: $sort
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...inboundContactFragment
  }
}

${inboundContactFragment}
`;
