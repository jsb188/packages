import type { OrganizationData } from './organization.d.ts';
import type { INBOUND_CONTACT_SORT_ENUMS } from '../constants/inboundContact.ts';
import type { OrganizationGQL } from './organization.d.ts';

export type InboundContactsSortEnum = typeof INBOUND_CONTACT_SORT_ENUMS[number];

/**
 * Inbound contact relationship to one organization.
 */
export interface InboundContactOrgData {
	__table: 'inbound_contact_orgs';
	inboundContactId: bigint;
	organizationId: bigint;
	organization?: OrganizationData | null;
}

/**
 * Inbound contact memory record owned by one organization.
 */
export interface InboundContactData {
	__table: 'inbound_contacts';
	id: bigint;
	organizationId: bigint;
	personName: string | null;
	email: string | null;
	phone: string | null;
	memory: string | null;
	orgs?: InboundContactOrgData[] | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * GraphQL inbound contact relationship to one organization.
 */
export interface InboundContactOrgGQL {
	inboundContactId: string;
	organizationId: string;
	organization?: OrganizationGQL | null;
}

/**
 * GraphQL inbound contact memory record.
 */
export interface InboundContactGQL {
	__deleted?: boolean;

	id: string;
	organizationId: string;
	cursor: string;
	personName: string | null;
	email: string | null;
	phone: string | null;
	memory: string | null;
	orgs?: InboundContactOrgGQL[] | null;
	createdAt: string;
	updatedAt: string;
}
