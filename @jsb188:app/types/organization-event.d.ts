import { ORGANIZATION_EVENT_TYPES } from '../constants/organization-event.ts';

export type OrganizationEventTypeEnum = typeof ORGANIZATION_EVENT_TYPES[number];

/**
 * Org addresses
 */

export interface OrganizationAddressInsertObj {
	id?: number; // Only for edits
	line1: string;
	line2?: string | null;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

export interface OrganizationAddressObj extends OrganizationAddressInsertObj {
	__table: 'organization_addresses';
	id: number;
	organizationId: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface OrganizationAddressGQLData {
	id: string;
	organizationId: string;
	line1: string;
	line2?: string | null;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Org events
 */

export interface OrganizationEventUpsertObj {
	id?: number; // Only for edits
	addressId: number;
	addressOverrideId?: number | null;

	deleted?: boolean; // For delete ops only

	name: string;
	type: OrganizationEventTypeEnum;
	startAt: Date;
	endAt: Date;
}

export interface OrganizationEventDataObj extends OrganizationEventUpsertObj {
	__table: 'organization_events';
	id: number;
	organizationId: number;
	accountId: number;
	address: OrganizationAddressObj; // This must *never* be null
	addressOverride?: OrganizationAddressObj | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface OrganizationEventGQLData {
	id: string;
	organizationId: string;
	accountId: string;
	name: string;
	type: OrganizationEventTypeEnum;
	startAt: string;
	endAt: string;
	address: OrganizationAddressGQLData; // This must *never* be null
	addressOverride?: OrganizationAddressGQLData | null;
	createdAt: string;
	updatedAt: string;
}
