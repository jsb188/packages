import type { SquareConnectionStatusEnum } from '../constants/square.ts';
import type { SquareConnectionCapabilities } from '../utils/square.ts';

/**
 * Square connection database object.
 */
export interface SquareConnectionData {
	__table: 'square_connections';
	id: bigint;
	organizationId: bigint;
	merchantId: string | null;
	scopes: string[];
	status: SquareConnectionStatusEnum;
	expiresAt: Date | null;
	refreshTokenExpiresAt: Date | null;
	lastSyncedAt: Date | null;
	lastTokenRefreshAt: Date | null;
	lastError: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * GraphQL data for Square connection types.
 */
export interface SquareConnectionGQL {
	id: string | null;
	organizationId: string;
	merchantId: string | null;
	scopes: string[];
	status: SquareConnectionStatusEnum;
	expiresAt: string | null;
	refreshTokenExpiresAt: string | null;
	lastSyncedAt: string | null;
	lastTokenRefreshAt: string | null;
	lastError: string | null;
	capabilities: SquareConnectionCapabilities;
	createdAt: string | null;
	updatedAt: string | null;
}
