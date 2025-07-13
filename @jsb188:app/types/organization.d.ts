import { OPERATION_ENUMS, ROLE_ENUMS } from '../constants/organization.ts';

/*
 * ACL
 */

export type OrganizationRoleEnum = typeof ROLE_ENUMS[number];
export type OrganizationOperationEnum = typeof OPERATION_ENUMS[number];

type ACLPermission = 0 | 1 | 2 | 3; // 0: no access, 1: read-only, 2: allow-write, 3: allow-manage

export interface OrganizationACL {
	id: string;
	billing: ACLPermission;
	logs: ACLPermission;
	members: ACLPermission;
	finances: ACLPermission;
	products: ACLPermission;
	settings: ACLPermission;
	integrations: ACLPermission;
	digests: ACLPermission;
}

/**
 * Organization object
 */

export interface OrganizationShortData {
	id: string;
	name: string;
	primary: boolean;
	acl: OrganizationACL;
}

export interface OrganizationData {
	id: string;
	name: string;
	emoji: string;
	primary: boolean;
	acl: OrganizationACL;
	stripeCustomerId: string | null;
	domains: string[] | null;
	membersCount: number;
}

/**
 * Full organization object with relationship
 */

export interface OrganizationRelData {
	id: string;
	primary: boolean;
	role: OrganizationRoleEnum;
	acl: OrganizationACL;
	organization: OrganizationData;
}
