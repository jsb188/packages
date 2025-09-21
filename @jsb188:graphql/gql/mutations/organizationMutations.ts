import { gql } from 'graphql-tag';
import { organizationEventFragment } from '../fragments/organizationFragments';
import { addressFragment } from '../fragments/otherFragments';

export const editOrganizationEventMtn = gql`
mutation editOrganizationEvent (
  $organizationId: GenericID!
  $orgEventId: GenericID!
) {
  editOrganizationEvent (
    organizationId: $organizationId
    orgEventId: $orgEventId
  ) {
    ...organizationEventFragment

    address {
      ...addressFragment
    }
  }
}

${organizationEventFragment}
${addressFragment}
`;

export const deleteOrganizationEventMtn = gql`
mutation deleteOrganizationEvent (
  $organizationId: GenericID!
  $orgEventId: GenericID!
) {
  deleteOrganizationEvent (
    organizationId: $organizationId
    orgEventId: $orgEventId
  )
}
`;
