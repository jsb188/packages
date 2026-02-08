import { COLORS } from '@jsb188/app/constants/app.ts';
import { intersection } from '@jsb188/app/utils/object.ts';
import { DEFAULT_TIMEZONE } from '@jsb188/app/utils/timeZone.ts';
import { FEATURES_BY_OPERATION } from '../constants/product.ts';
import type {
  MergedOrgContact,
  OrgContact,
  OrganizationFeatureEnum,
  OrganizationOperationEnum,
  OrganizationRelData,
  OrganizationRelGQL,
  OrganizationRoleEnum,
  OrganizationSettingsObj
} from '../types/organization.d.ts';

// Placeholder to match Server import
type ViewerOrganization = any;

export const PERMISSION_TO_INT = {
	NONE: 0,
	READ: 1,
	WRITE: 2,
	MANAGE: 3,
};

const INT_TO_PERMISSION = Object.keys(PERMISSION_TO_INT);

/**
 * Get numeric value of role's permission level (used for comparisons)
 * @param role - Role enum
 */

export function getRoleValue(role: OrganizationRoleEnum): number {
	return [
		'GUEST',
		'MEMBER',
		'MANAGER',
		'ADMIN',
		'OWNER',
	].indexOf(role);
}

/**
 * Get default permissions by role
 */

export function getDefaultPermissionsByRole(orgRel: OrganizationRelGQL | OrganizationRelData | ViewerOrganization) {
	const role = orgRel?.role || 'MEMBER';
	const acl: Record<string, any> = { ...orgRel?.acl };

	for (const key in acl) {
		// if (typeof acl[key] === 'number') {
		if (!isNaN(Number(acl[key]))) {
			acl[key] = INT_TO_PERMISSION[acl[key]] || 'NONE';
		}
	}

	// Also keep this synced with [resolvers/organizationTypeResolvers.ts]

	// 0 = "NONE"
	// 1 = "READ"
	// 2 = "WRITE"
	// 3 = "MANAGE"

	switch (role) {
		case 'ADMIN':
		case 'OWNER':
			return {
				billing: acl.billing || 'MANAGE',
				compliance: acl.compliance || 'MANAGE',
				digests: acl.digests || 'MANAGE', // 2/3 = receive digests, 1 = only see from web app
				finances: acl.finances || 'MANAGE',
				integrations: acl.integrations || 'MANAGE',
				logs: acl.logs || 'MANAGE', // "READ" for logs does nothing
				members: acl.members || 'MANAGE',
				orgManagement: acl.orgManagement || 'MANAGE',
				products: acl.products || 'MANAGE',
				settings: acl.settings || 'MANAGE',
				viewData: acl.viewData || 'MANAGE', // This blocks access from users being able to read other people's logs
			};
		case 'MANAGER':
			return {
				billing: acl.billing || 'READ',
				compliance: acl.compliance || 'WRITE',
				digests: acl.digests || 'READ', // 2/3 = receive digests, 1 = only see from web app
				finances: acl.finances || 'READ',
				integrations: acl.integrations || 'NONE',
				logs: acl.logs || 'MANAGE', // "READ" for logs does nothing
				members: acl.members || 'WRITE',
				orgManagement: acl.orgManagement || 'WRITE',
				products: acl.products || 'READ',
				settings: acl.settings || 'READ',
				viewData: acl.viewData || 'MANAGE', // This blocks access from users being able to read other people's logs
			};
		case 'GUEST':
			return {
				billing: acl.billing || 'NONE',
				compliance: acl.compliance || 'NONE',
				digests: acl.digests || 'NONE',
				finances: acl.finances || 'NONE',
				integrations: acl.integrations || 'NONE',
				logs: acl.logs || 'NONE',
				members: acl.members || 'NONE',
				orgManagement: acl.orgManagement || 'NONE',
				products: acl.products || 'READ',
				settings: acl.settings || 'NONE',
				viewData: acl.viewData || 'NONE',
			};
		case 'MEMBER':
		default:
	}

	return {
		billing: acl.billing || 'NONE',
		compliance: acl.compliance || 'READ',
		digests: acl.digests || 'NONE', // 2/3 = receive digests, 1 = only see from web app
		finances: acl.finances || 'NONE',
		integrations: acl.integrations || 'NONE',
		logs: acl.logs || 'WRITE', // "READ" for logs does nothing
		members: acl.members || 'READ',
		orgManagement: acl.orgManagement || 'READ',
		products: acl.products || 'READ',
		settings: acl.settings || 'READ',
		viewData: acl.viewData || 'NONE', // This blocks access from users being able to read other people's logs
	};
}

/**
 * Check if this account's ACL has required permissions for an action
 */

export type PermissionCheckFor = keyof ReturnType<typeof getDefaultPermissionsByRole>;
export type ACLPermissionCheck = 'READ' | 'WRITE' | 'MANAGE';

export function checkACLPermission(
	orgRel: OrganizationRelGQL | OrganizationRelData | ViewerOrganization | null | undefined,
	check: PermissionCheckFor,
	requiredPermission: ACLPermissionCheck,
): boolean | null {
	if (!orgRel) {
		return null;
	}

	const acl = getDefaultPermissionsByRole(orgRel);

	const requiredInt = PERMISSION_TO_INT[requiredPermission] || 4; // If invalid, it will always return false
	const permission = acl[check] as ACLPermissionCheck;
	const acccountPermissionInt = PERMISSION_TO_INT[permission] || 0; // If invalid, it will always return false

	return acccountPermissionInt >= requiredInt;
}

/**
 * Get the default object for Oganization settings
 * @param timeZone - Time zone string
 * @return Default organization settings object
 */

export function getDefaultOrganizationSettings(
	timeZone: string | null,
	contacts?: OrgContact[],
	// do params here for priority service + manage roles
): Partial<OrganizationSettingsObj> {
	const orgSettings: Record<string, any> = {
		timeZone: timeZone || DEFAULT_TIMEZONE,
		color: COLORS[Math.floor(Math.random() * COLORS.length)],
	};

	if (contacts?.length) {
		orgSettings.directory = contacts.map((contact) => {
			return {
				...contact,
				department: contact.department || 'OTHER',
			};
		}).filter((contact) => contact.emailAddress || contact.phoneNumber);
	}

	return orgSettings;
}

/**
 * Get the enabled features for the organization;
 * If none or empty, return the default features based on operation
 */

export function getOrganizationFeatures(
	operation: OrganizationOperationEnum,
	enabledFeatures?: OrganizationFeatureEnum[] | null,
): OrganizationFeatureEnum[] {
	// @ts-expect-error - Allow operation as string
	const allowedFeatures = FEATURES_BY_OPERATION[operation] || [];
	const filteredFeatures = intersection(enabledFeatures || [], allowedFeatures);
	return filteredFeatures.length ? filteredFeatures : allowedFeatures[0] ? [allowedFeatures[0]] : [];
}

/**
 * Map organization feature to a color (used for workflows without logType)
 * @param feature - The feature of the workflow
 * @returns The color associated with the feature
 */

export function getOrganizationFeatureColor(feature?: OrganizationFeatureEnum | null) {
	const featureToColor = {
		FOOD_SAFETY: 'violet',
		GLOBAL_GAP: 'fuchsia',
		ORGANIC_CERTIFICATION: 'yellow',
		CAL_EVENTS: 'cyan',
		CAL_EVENTS_ATTENDANCE: 'cyan',
		CAL_EVENTS_LOAD_LIST: 'amber',
		LIVESTOCK: 'brown',
		LIVESTOCK_MANAGEMENT: 'brown',
	} as Record<OrganizationFeatureEnum, string>;

	return (feature && featureToColor[feature]) || 'stone';
}

/**
 * Merge directory with preferred contacts
 */

export function mergeOrgDirectory(directory: OrgContact[], preferredContacts?: OrgContact[]): MergedOrgContact[] {
	if (!preferredContacts?.length) {
		return directory || [];
	}

	// Create a map of preferredContacts by department
	const preferredMap = new Map<string, OrgContact>();
	for (const contact of preferredContacts) {
		if (contact.department) {
			preferredMap.set(contact.department, contact);
		}
	}

	// Merge directory with preferred contacts, removing matched entries from map
	const merged: MergedOrgContact[] = (directory || []).map((dirContact) => {
		const preferred = preferredMap.get(dirContact.department);
		preferredMap.delete(dirContact.department);

		return {
			department: dirContact.department,
			name: preferred?.name ?? dirContact.name,
			phoneNumber: preferred?.phoneNumber ?? dirContact.phoneNumber,
			emailAddress: preferred?.emailAddress ?? dirContact.emailAddress,
			defaultName: dirContact.name,
			defaultPhoneNumber: dirContact.phoneNumber,
			defaultEmailAddress: dirContact.emailAddress,
		};
	});

	// Add remaining preferred contacts (not in directory)
	for (const [, preferred] of preferredMap) {
		merged.push({
			department: preferred.department,
			name: preferred.name,
			phoneNumber: preferred.phoneNumber,
			emailAddress: preferred.emailAddress,
			defaultName: null,
			defaultPhoneNumber: null,
			defaultEmailAddress: null,
		});
	}

	return merged;
}
