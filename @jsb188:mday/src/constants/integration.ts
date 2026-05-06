export const INTEGRATION_PROVIDERS = [
  'SQUARE',
] as const;

export type IntegrationProviderEnum = typeof INTEGRATION_PROVIDERS[number];

export const INTEGRATION_CONNECTION_STATUSES = [
  'CONNECTED',
  'DISCONNECTED',
  'ERROR',
  'REVOKED',
] as const;

export type IntegrationConnectionStatusEnum = typeof INTEGRATION_CONNECTION_STATUSES[number];
