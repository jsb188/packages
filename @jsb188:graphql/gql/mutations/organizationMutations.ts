import { gql } from 'graphql-tag';

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