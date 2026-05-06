import type { IntegrationConnectionStatusEnum } from '../constants/integration.ts';
import type { SquareConnectionCapabilities } from '../utils/square.ts';

/**
 * Integration connection database object.
 */
export interface IntegrationConnectionData {
	__table: 'integrations';
	id: bigint;
	organizationId: bigint;
	provider: 'SQUARE';
	externalAccountId: string | null;
	scopes: string[];
	status: IntegrationConnectionStatusEnum;
	expiresAt: Date | null;
	refreshTokenExpiresAt: Date | null;
	lastSyncedAt: Date | null;
	lastTokenRefreshAt: Date | null;
	lastError: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * GraphQL data for integration connection types.
 */
export interface IntegrationConnectionGQL {
	id: string | null;
	organizationId: string;
	provider: 'SQUARE';
	externalAccountId: string | null;
	scopes: string[];
	status: IntegrationConnectionStatusEnum;
	expiresAt: string | null;
	refreshTokenExpiresAt: string | null;
	lastSyncedAt: string | null;
	lastTokenRefreshAt: string | null;
	lastError: string | null;
	capabilities: SquareConnectionCapabilities;
	createdAt: string | null;
	updatedAt: string | null;
}
