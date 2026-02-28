import { gql } from 'graphql-tag';
import { organizationChildFragment, organizationFragment, organizationRelationshipFragment } from '../fragments/organizationFragments';

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
  $operation: OrganizationOperation
  $address: AddressInput
  $directory: [OrgContactInput!]
) {
  editOrganization (
    organizationId: $organizationId
    name: $name
    operation: $operation
    address: $address
    directory: $directory
  ) {
    ...organizationFragment
  }
}

${organizationFragment}
`;

export const editChildOrganizationMtn = gql`
mutation editChildOrganization (
  $organizationId: GenericID!
  $childOrgId: GenericID!
  $name: String
  $operation: OrganizationOperation
  $address: AddressInput
  $preferredContacts: [OrgContactInput!]
) {
  editChildOrganization (
    organizationId: $organizationId
    childOrgId: $childOrgId
    name: $name
    operation: $operation
    address: $address
    preferredContacts: $preferredContacts
  ) {
    ...organizationChildFragment

    organization {
      ...organizationFragment
    }
  }
}

${organizationChildFragment}
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
