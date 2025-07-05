export const platformProductFragment = `fragment platformProductFragment on PlatformProduct {
  id
  active
  prices {
    id
    name
    productName
    productGroup
    unitAmount
    currency
    recurringInterval
    recurringIntervalCount
  }
}`;

export const platformProductPurchaseResultFragment = `fragment platformProductPurchaseResultFragment on PlatformProductPurchaseResult {
  id
  userId
  coins
  productName
  productGroup
  paid
  cancelled
  expireAt
}`;
