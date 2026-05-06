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

export const createSquarePaymentRequestMtn = gql`
mutation createSquarePaymentRequest (
  $organizationId: GenericID!
  $locationId: String!
  $name: String!
  $amount: String!
  $currency: String!
  $description: String
  $paymentNote: String
  $idempotencyKey: String
) {
  createSquarePaymentRequest (
    organizationId: $organizationId
    locationId: $locationId
    name: $name
    amount: $amount
    currency: $currency
    description: $description
    paymentNote: $paymentNote
    idempotencyKey: $idempotencyKey
  ) {
    id
    orderId
    url
    longUrl
    createdAt
  }
}
`;
