import type { OrganizationData } from './organization.d.ts';

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
