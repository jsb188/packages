import { OPERATION_ENUMS, ROLE_ENUMS } from '../constants/organization.ts';

/*
 * ACL
 */

export type OrganizationRoleEnum = typeof ROLE_ENUMS[number];
export type OrganizationOperationEnum = typeof OPERATION_ENUMS[number];

export interface OrganizationACL {
  id: string;
  manageBilling: boolean | null;
  manageIntegrations: boolean | null;
  manageMembers: boolean | null;
  manageProducts: boolean | null;
  manageSettings: boolean | null;
  viewMembers: boolean | null;
  role: OrganizationRoleEnum | null;
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
  // members: OrganizationMemberData[] | null;
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
