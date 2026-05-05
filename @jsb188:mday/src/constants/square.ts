export const SQUARE_OAUTH_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
  'ORDERS_READ',
  'ORDERS_WRITE',
  'PAYMENTS_WRITE',
] as const;

export type SquareOAuthScope = typeof SQUARE_OAUTH_SCOPES[number];

export const SQUARE_CONNECTION_STATUSES = [
  'CONNECTED',
  'DISCONNECTED',
  'ERROR',
  'REVOKED',
] as const;

export type SquareConnectionStatusEnum = typeof SQUARE_CONNECTION_STATUSES[number];
