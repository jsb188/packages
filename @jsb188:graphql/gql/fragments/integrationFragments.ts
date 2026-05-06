export const integrationConnectionFragment = `fragment integrationConnectionFragment on IntegrationConnection {
  id
  organizationId
  provider
  externalAccountId
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
