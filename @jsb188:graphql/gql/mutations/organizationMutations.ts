import { gql } from 'graphql-tag';
import { organizationFragment, organizationRelationshipFragment } from '../fragments/organizationFragments';

export const switchOrganizationMtn = gql`
mutation switchOrganization (
  $organizationId: GenericID!
) {
  switchOrganization (
    organizationId: $organizationId
  )
}
`;

export const deleteComplianceDocumentMtn = gql`
mutation deleteComplianceDocument (
  $organizationId: GenericID!
  $complianceId: GenericID!
) {
  deleteComplianceDocument (
    organizationId: $organizationId
    complianceId: $complianceId
  )
}
`;

export const editOrganizationMtn = gql`
mutation editOrganization (
  $organizationId: GenericID!
  $name: String
  $address: AddressInput
) {
  editOrganization (
    organizationId: $organizationId
    name: $name
    address: $address
  ) {
    ...organizationFragment
  }
}

${organizationFragment}
`;

export const editMembershipMtn = gql`
mutation editMembership (
  $organizationId: GenericID!
  $accountId: GenericID!
  $role: OrganizationRole
  $notes: String
) {
  editMembership (
    organizationId: $organizationId
    accountId: $accountId
    role: $role
    notes: $notes
  ) {
    ...organizationRelationshipFragment
  }
}

${organizationRelationshipFragment}
`;

export const removeMembershipMtn = gql`
mutation removeMembership (
  $membershipId: GenericID!
) {
  removeMembership (
    membershipId: $membershipId
  )
}
`;
