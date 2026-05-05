export const squareConnectionFragment = `fragment squareConnectionFragment on SquareConnection {
  id
  organizationId
  merchantId
  scopes
  status
  expiresAt
  refreshTokenExpiresAt
  lastSyncedAt
  lastTokenRefreshAt
  lastError
  createdAt
  updatedAt

  capabilities {
    canReadMerchant
    canReadLocations
    canViewSalesData
    canCreatePaymentRequests
  }
}`;
