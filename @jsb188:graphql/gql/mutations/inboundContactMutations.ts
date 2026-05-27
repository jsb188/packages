import { gql } from 'graphql-tag';
import { inboundContactFragment } from '../fragments/inboundContactFragments.ts';

export const editInboundContactMtn = gql`
mutation editInboundContact (
  $organizationId: GenericID!
  $inboundContactId: GenericID!
  $associatedOrganizationIds: [GenericID]
  $personName: String
  $memory: String
) {
  editInboundContact (
    organizationId: $organizationId
    inboundContactId: $inboundContactId
    associatedOrganizationIds: $associatedOrganizationIds
    personName: $personName
    memory: $memory
  ) {
    ...inboundContactFragment
  }
}

${inboundContactFragment}
`;
