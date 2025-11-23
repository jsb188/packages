import {
  COMPLIANCE_DOCUMENT_TYPE_ENUMS,
  OPERATION_ENUMS,
  ROLE_CATEGORY_ENUMS,
  ROLE_ENUMS
} from '../constants/organization.ts';
import { PRODUCT_FEATURES } from '../constants/product.ts';

import type { LogTypeEnum } from '@jsb188/mday/types/log.d';
import type { AccountData } from './account.d.ts';
import type { StorageData } from './other.d.ts';

/*
 * Enums
 */

export type OrganizationFeatureEnum = typeof PRODUCT_FEATURES[number];
export type OrganizationRoleEnum = typeof ROLE_ENUMS[number];
export type OrganizationOperationEnum = typeof OPERATION_ENUMS[number];
export type OrganizationRoleCategoryEnum = typeof ROLE_CATEGORY_ENUMS[number];
export type OrganizationComplianceType = typeof COMPLIANCE_DOCUMENT_TYPE_ENUMS[number];

/*
 * ACL
 */

type ACLPermission = 0 | 1 | 2 | 3; // 0: no access, 1: read-only, 2: allow-write, 3: allow-manage
type ACLPermissionEnum = 'NONE' | 'READ' | 'WRITE' | 'MANAGE';

export interface OrganizationACL {
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
	settings?: OrganizationSettingsObj | null;
	activated: boolean;
}

export interface OrganizationSettingsObj {
	timeZone: string | null;
	language: string | null;
	color: string | null;
	priorityService: boolean;
	features: OrganizationFeatureEnum[];
}

export interface OrganizationChildData {
	__table: 'organization_rels';
	parentId: number | bigint | null;
	childId: number | bigint;
	organization: OrganizationData;
	primaryContact: {
		__table: 'account_organization_rels';
		id: number;
		account: AccountData;
	};
	anyContact?: {
		__table: 'account_organization_rels';
		id: number;
		account: AccountData;
	};
	addedAt: Date;
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

export interface OrganizationComplianceGQL {
  __deleted?: boolean;

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

export interface OrganizationGQL {
	id: string;
	stripeCustomerId: string | null;
	name: string;
	operation: OrganizationOperationEnum;
	compliance: OrganizationComplianceGQL[] | null;
	settings?: OrganizationSettingsObj | null;
	activated: boolean;
	membersCount: number;
}

export interface OrganizationRelGQL {
	id: string;
	primary: boolean;
	role: OrganizationRoleEnum;
	acl: OrganizationACLGQLData;
	organization: OrganizationGQL;
}

export interface OrganizationChildGQL {
	id: string;
	organization: OrganizationGQL;
	primaryContact: AccountData;
  metadata?: Partial<{
    primaryContactName: string;
    primaryPhoneNumber: string;
    primaryEmailAddress: string;
  }>;
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

export interface OrganizationComplianceObj {
	storageIds: number[] | null;
	number: string;
	name: string;
	type: OrganizationComplianceType;
	expirationDate: string; // cast as date: "YYYY-MM-DD" format (in database)
	notes?: string;
}

export interface OrganizationComplianceData extends Omit<OrganizationComplianceObj, 'expirationDate'> {
	__table: 'organization_compliances';
	id: number;
	organizationId: number;
	expirationDate: Date; // in runtime deno-postgres converts it into JS Date (apparently because it has to)
	documents: OrganizationComplianceFileData[] | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Workflow instructions
 */

export interface OrganizationInstructionsData {
	__table: 'organization_instructions';
	id: bigint | number;
	organizationId: bigint | number;
	logType: LogTypeEnum;
	instructions: string;
	summary: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface OrganizationInstructionsGQL {
	__deleted?: boolean;

	id: string;
	organizationId: string;
	logType: LogTypeEnum;
	instructions: string;
	summary: string;
	createdAt: string; // ISO date string
	updatedAt: string; // ISO date string
}
