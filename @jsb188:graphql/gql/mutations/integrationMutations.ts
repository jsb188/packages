import { gql } from 'graphql-tag';

export const createSquareAuthorizationUrlMtn = gql`
mutation createSquareAuthorizationUrl (
  $organizationId: GenericID!
) {
  createSquareAuthorizationUrl (
    organizationId: $organizationId
  )
}
`;

export const disconnectSquareMtn = gql`
mutation disconnectSquare (
  $organizationId: GenericID!
) {
  disconnectSquare (
    organizationId: $organizationId
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
