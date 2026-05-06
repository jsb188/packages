import type { IntegrationConnectionStatusEnum } from './integration.ts';
import { INTEGRATION_CONNECTION_STATUSES } from './integration.ts';

export const SQUARE_OAUTH_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
  'ORDERS_READ',
  'ORDERS_WRITE',
  'PAYMENTS_WRITE',
] as const;

export type SquareOAuthScope = typeof SQUARE_OAUTH_SCOPES[number];

export const SQUARE_CONNECTION_STATUSES = INTEGRATION_CONNECTION_STATUSES;

export type SquareConnectionStatusEnum = IntegrationConnectionStatusEnum;
