import {
  COMPLIANCE_DOCUMENT_TYPE_ENUMS,
  OPERATION_ENUMS,
  ROLE_CATEGORY_ENUMS,
  ROLE_ENUMS
} from '../constants/organization.ts';

import type { AccountData } from './account.d.ts';
import type { StorageData } from './other.d.ts';

/*
 * ACL
 */

export type OrganizationRoleEnum = typeof ROLE_ENUMS[number];
export type OrganizationOperationEnum = typeof OPERATION_ENUMS[number];
export type OrganizationRoleCategoryEnum = typeof ROLE_CATEGORY_ENUMS[number];
export type OrganizationComplianceType = typeof COMPLIANCE_DOCUMENT_TYPE_ENUMS[number];

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
  __table: 'organizations';
	id: number;
	stripeCustomerId: string | null;
	name: string;
	operation: OrganizationOperationEnum;
	dailyDigestTime: string | null;
	reminders: string | null;
	domains: string[] | null;
	settings?: OrganizationSettingsObj | null;
}

export interface OrganizationSettingsObj {
  timeZone: string | null;
  language: string | null;
  color: string | null;
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

export interface OrganizationComplianceGQLData {
	id: string;
	number: string;
	name: string;
	type: OrganizationComplianceType;
	expirationDate: string; // YYYY-MM-DD
	notes: string;
	createdAt: string; // ISO date string
	updatedAt: string; // ISO date string

	files: {
		id: string;
		complianceId: string;
		storageId: string;
		uri: string | null;
		contentType: string | null;
		order: number;
	}[];
}

export interface OrganizationGQLData {
	id: string;
	stripeCustomerId: string | null;
	name: string;
	operation: OrganizationOperationEnum;
	compliance: OrganizationComplianceGQLData[] | null;
	domains: string[] | null;
	settings?: OrganizationSettingsObj | null;
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
	organization: OrganizationGQLData;
	primaryContact: AccountData;
	addedAt: Date;
}

/**
 * Compliances
 */

export interface OrganizationComplianceFileData {
	__table: 'organization_compliance_files';
	id: number;
	complianceId: number;
	storageId: number;
	order: number;
	file: StorageData;
}

export interface OrganizationComplianceInsertObj {
	storageIds: number[] | null;
	number: string;
	name: string;
	type: OrganizationComplianceType;
	expirationDate: string; // cast as date: "YYYY-MM-DD" format (in database)
	notes?: string;
}

export interface OrganizationComplianceData extends Omit<OrganizationComplianceInsertObj, 'expirationDate'> {
	__table: 'organization_compliances';
	id: number;
	organizationId: number;
	expirationDate: Date; // in runtime deno-postgres converts it into JS Date (apparently because it has to)
	documents: OrganizationComplianceFileData[] | null;
	createdAt: Date;
	updatedAt: Date;
}
