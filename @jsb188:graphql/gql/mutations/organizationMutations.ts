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