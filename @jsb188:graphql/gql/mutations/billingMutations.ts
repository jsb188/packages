import { gql } from 'graphql-tag';
import { platformProductPurchaseResultFragment } from '../fragments/billingFragments';

export const purchasePlatformProductMtn = gql`
mutation purchasePlatformProduct (
  $paymentId: String!
  $paymentMethodId: String!
  $productGroup: PlatformProductGroup!
  $email: String!
  $name: String
) {
  purchasePlatformProduct (
    paymentId: $paymentId
    paymentMethodId: $paymentMethodId
    productGroup: $productGroup
    email: $email
    name: $name
  ) {
    ...platformProductPurchaseResultFragment
  }
}

${platformProductPurchaseResultFragment}
`;

export const cancelPlatformSubscriptionMtn = gql`
mutation cancelPlatformSubscription {
  cancelPlatformSubscription {
    ...platformProductPurchaseResultFragment
  }
}

${platformProductPurchaseResultFragment}
`;
