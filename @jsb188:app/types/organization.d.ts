import { CHILD_ORGANIZATION_TYPE_ENUMS, OPERATION_ENUMS, ROLE_CATEGORY_ENUMS, ROLE_ENUMS } from '../constants/organization.ts';

/*
 * ACL
 */

export type OrganizationRoleEnum = typeof ROLE_ENUMS[number];
export type OrganizationOperationEnum = typeof OPERATION_ENUMS[number];
export type OrganizationRoleCategoryEnum = typeof ROLE_CATEGORY_ENUMS[number];
export type OrganizationChildTypeEnum = typeof CHILD_ORGANIZATION_TYPE_ENUMS[number];

type ACLPermission = 0 | 1 | 2 | 3; // 0: no access, 1: read-only, 2: allow-write, 3: allow-manage
type ACLPermissionEnum = 'NONE' | 'READ' | 'WRITE' | 'MANAGE';

export interface OrganizationACL {
	id: string;
	billing: ACLPermission;
	logs: ACLPermission;
	members: ACLPermission;
	finances: ACLPermission;
	settings: ACLPermission;
	integrations: ACLPermission;
	digests: ACLPermission;
	reminders: ACLPermission;
}

export interface OrganizationACLGQLData {
	id: string;
	billing: ACLPermissionEnum;
	logs: ACLPermissionEnum;
	members: ACLPermissionEnum;
	finances: ACLPermissionEnum;
	settings: ACLPermissionEnum;
	integrations: ACLPermissionEnum;
	digests: ACLPermissionEnum;
	reminders: ACLPermissionEnum;
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
	id: number;
	stripeCustomerId: string | null;
	name: string;
  operation: OrganizationOperationEnum;
  dailyDigestTime: string | null;
  reminders: string | null;
	domains: string[] | null;
  settings?: {
    emoji: string | null;
    timeZone: string | null;
  }
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

/**
 * GraphQL data for organization types
 */

export interface OrganizationGQLData {
	id: string;
	name: string;
	stripeCustomerId: string | null;
  reminders: string | null;
	domains: string[] | null;
	membersCount: number;
}

export interface OrganizationRelGQLData {
	id: string;
	primary: boolean;
	role: OrganizationRoleEnum;
	acl: OrganizationACLGQLData;
	organization: OrganizationGQLData;
}

export interface OrganizationChildGQLData {
  id: string;
  childType: OrganizationChildTypeEnum;
	organization: OrganizationGQLData;
}
