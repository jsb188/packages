import { gql } from 'graphql-tag';
import { inboundContactFragment } from '../fragments/inboundContactFragments.ts';
import { organizationFragment } from '../fragments/organizationFragments.ts';

export const editInboundContactMtn = gql`
mutation editInboundContact (
  $organizationId: GenericID!
  $inboundContactId: GenericID!
  $personName: String
  $email: String
  $phone: String
  $memory: String
) {
  editInboundContact (
    organizationId: $organizationId
    inboundContactId: $inboundContactId
    personName: $personName
    email: $email
    phone: $phone
    memory: $memory
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
