import { gql } from 'graphql-tag';
import { inboundContactFragment } from '../fragments/inboundContactFragments.ts';
import { organizationFragment } from '../fragments/organizationFragments.ts';

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

    orgs {
      inboundContactId
      organizationId

      organization {
        ...organizationFragment
      }
    }
  }
}

${inboundContactFragment}
${organizationFragment}
`;
