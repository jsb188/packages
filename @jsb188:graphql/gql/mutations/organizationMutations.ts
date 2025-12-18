import { gql } from 'graphql-tag';
import { organizationChildFragment, organizationComplianceFragment, organizationFragment, organizationInstructionsFragment, organizationRelationshipFragment } from '../fragments/organizationFragments';

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
) {
  editOrganization (
    organizationId: $organizationId
    name: $name
  ) {
    ...organizationFragment
  }
}

${organizationFragment}
`;