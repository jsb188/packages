import { gql } from 'graphql-tag';

export const createIntegrationAuthorizationUrlMtn = gql`
mutation createIntegrationAuthorizationUrl (
  $organizationId: GenericID!
  $provider: IntegrationProvider!
) {
  createIntegrationAuthorizationUrl (
    organizationId: $organizationId
    provider: $provider
  )
}
`;

export const disconnectIntegrationMtn = gql`
mutation disconnectIntegration (
  $organizationId: GenericID!
  $provider: IntegrationProvider!
) {
  disconnectIntegration (
    organizationId: $organizationId
    provider: $provider
  )
}
`;
