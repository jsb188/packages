import {
  COMPLIANCE_DOCUMENT_TYPE_ENUMS,
  OPERATION_ENUMS,
  ORG_CONTACTS,
  ROLE_CATEGORY_ENUMS,
  ROLE_ENUMS
} from '../constants/organization.ts';
import { PRODUCT_FEATURES } from '../constants/product.ts';

import type { AddressObj } from '@jsb188/app/types/other.d.ts';
import type { StorageData, StorageGQL } from './storage.d.ts';

/*
 * Enums
 */

export type OrganizationFeatureEnum = typeof PRODUCT_FEATURES[number];
export type OrganizationRoleEnum = typeof ROLE_ENUMS[number];
export type OrganizationOperationEnum = typeof OPERATION_ENUMS[number];
export type OrganizationDepartmentEnum = typeof ORG_CONTACTS[number];
export type OrganizationRoleCategoryEnum = typeof ROLE_CATEGORY_ENUMS[number];
export type OrganizationComplianceType = typeof COMPLIANCE_DOCUMENT_TYPE_ENUMS[number];

/**
 * Query filters
 */

export interface ChildOrgsFilterArgs {
	internationalOnly?: boolean;
}

/*
 * ACL
 */

export type ACLPermission = 0 | 1 | 2 | 3; // 0: no access, 1: read-only, 2: allow-write, 3: allow-manage
export type ACLPermissionEnum = 'NONE' | 'READ' | 'WRITE' | 'MANAGE';

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
	id: bigint;
	stripeCustomerId: string | null;
	name: string;
	commodities: string[] | null;
	operation: OrganizationOperationEnum;
	dailyDigestTime: string | null;
	features: OrganizationFeatureEnum[];
	settings?: OrganizationSettingsObj | null;
	address?:
		| null
		| AddressObj & {
			__table: 'organization_addresses';
			organizationId: bigint;
		};
	activated: boolean;
}

export interface OrganizationSiteData {
	__table: 'organization_sites';
	id: bigint;
	organizationId: bigint;
	parentId?: bigint | null;
	name: string;
	note?: string | null;
}

export interface OrgContact {
	department: OrganizationDepartmentEnum;
	name?: string | null;
	phoneNumber?: string | null;
	emailAddress?: string | null;
}

export interface MergedOrgContact extends OrgContact {
	department: OrganizationDepartmentEnum;
	defaultName?: string | null;
	defaultPhoneNumber?: string | null;
	defaultEmailAddress?: string | null;
	officialContact?: boolean;
	locked?: boolean;
}

export interface OrganizationSettingsObj {
	timeZone: string | null;
	language: string | null;
	color: string | null;
	priorityService: boolean;
	directory?: OrgContact[];
}

export interface OrganizationChildData {
	__table: 'organization_rels';
	parentId: number | bigint | null;
	childId: number | bigint;
	organization: OrganizationData;
  preferredContacts?: {
    [key: OrganizationDepartmentEnum]: Partial<{
      name: string | null;
      phoneNumber: string | null;
      emailAddress: string | null;
    }>;
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
	number: string | null;
	documentName: string | null;
	type: OrganizationComplianceType;
	expirationDate: string; // YYYY-MM-DD
	createdAt: string; // ISO date string
	updatedAt: string; // ISO date string
	files: StorageGQL[] | null;
}

export interface OrganizationGQL {
  __deleted?: boolean;

	id: string;
	stripeCustomerId: string | null;
	name: string;
	commodities: string[] | null;
	address: AddressObj;
	operation: OrganizationOperationEnum;
	compliance: OrganizationComplianceGQL[] | null;
	features: OrganizationFeatureEnum[];
	settings?: OrganizationSettingsObj | null;
	directory: OrgContact[];
	activated: boolean;
	membersCount: number;
}

export interface OrganizationSiteGQL {
	__deleted?: boolean;

	id: string;
	organizationId: string;
	parentId?: string | null;
	name: string;
	note?: string | null;
	organizationName?: string | null;
	parentName?: string | null;
}

export interface OrganizationRelAccountGQL {
	id: string;
	deleted: boolean;
	color: string | null;
	profile: null | {
		id: string;
		firstName: string | null;
		lastName: string | null;
		photoId: string | null;
		photoUri: string | null;
	};
	settings: Record<string, any> | null;
	email: null | {
		id: string;
		address: string | null;
		verified: boolean;
	};
	phone: null | {
		id: string;
		number: string | null;
		verified: boolean;
		primary: boolean;
	};
}

export interface OrganizationRelGQL {
  __deleted?: boolean;

	id: string;
	organizationId?: string;
	account?: OrganizationRelAccountGQL | null;
	primary: boolean;
	role: OrganizationRoleEnum;
	acl: OrganizationACLGQLData;
	organization: OrganizationGQL;
}

export interface OrganizationChildGQL {
  __deleted?: boolean;

	id: string;
  parentId: string;
  cursor: string;
	organization: OrganizationGQL;
  preferredContacts: OrgContact[];
	addedAt: Date;
}

/**
 * Compliances
 */

export interface OrganizationComplianceFileData {
	__table: 'organization_compliance_files';
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
