import type { SquareOAuthScope } from '../constants/square.ts';

export type SquareConnectionCapabilities = {
  canReadMerchant: boolean;
  canReadLocations: boolean;
  canViewSalesData: boolean;
  canCreatePaymentRequests: boolean;
};

/*
 * Convert Square OAuth scopes into app-level capabilities used by UI and agents.
 */
export function getSquareConnectionCapabilities(scopes?: string[] | null): SquareConnectionCapabilities {
  const grantedScopes = new Set(scopes || []);

  return {
    canReadMerchant: grantedScopes.has('MERCHANT_PROFILE_READ' satisfies SquareOAuthScope),
    canReadLocations: grantedScopes.has('MERCHANT_PROFILE_READ' satisfies SquareOAuthScope),
    canViewSalesData: grantedScopes.has('PAYMENTS_READ' satisfies SquareOAuthScope) || grantedScopes.has('ORDERS_READ' satisfies SquareOAuthScope),
    canCreatePaymentRequests: grantedScopes.has('ORDERS_WRITE' satisfies SquareOAuthScope) && grantedScopes.has('PAYMENTS_WRITE' satisfies SquareOAuthScope),
  };
}
