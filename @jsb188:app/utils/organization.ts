import type { OrganizationGQLData, OrganizationRelData, OrganizationRelGQLData } from '../types/organization.d';
import i18n from '../i18n';

// Placeholder to match Server import
type ViewerOrganization = any;

const PERMISSION_TO_INT = {
	NONE: 0,
	READ: 1,
	WRITE: 2,
	MANAGE: 3,
};

const INT_TO_PERMISSION = Object.keys(PERMISSION_TO_INT);

/**
 * Get default permissions by role
 */

export function getDefaultPermissionsByRole(orgRel: OrganizationRelGQLData | OrganizationRelData | ViewerOrganization) {
	const role = orgRel?.role || 'MEMBER';
	const acl: Record<string, any> = { ...orgRel?.acl };

	for (const key in acl) {
		if (typeof acl[key] === 'number') {
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
				digests: acl.digests || 'MANAGE', // 2/3 = receive digests, 1 = only see from web app
				logs: acl.logs || 'MANAGE', // "READ" for logs does nothing
				viewData: acl.viewData || 'MANAGE', // This blocks access from users being able to read other people's logs
				members: acl.members || 'MANAGE',
				finances: acl.finances || 'MANAGE',
				settings: acl.settings || 'MANAGE',
				integrations: acl.integrations || 'MANAGE',
				reminders: acl.reminders || 'MANAGE',
				events: acl.events || 'MANAGE',
        compliance: acl.compliance || 'MANAGE',
			};
		case 'MANAGER':
			return {
				billing: acl.billing || 'READ',
				digests: acl.digests || 'WRITE', // 2/3 = receive digests, 1 = only see from web app
				logs: acl.logs || 'MANAGE', // "READ" for logs does nothing
				viewData: acl.viewData || 'MANAGE', // This blocks access from users being able to read other people's logs
				members: acl.members || 'WRITE',
				finances: acl.finances || 'READ',
				settings: acl.settings || 'READ',
				integrations: acl.integrations || 'NONE',
				reminders: acl.reminders || 'MANAGE',
				events: acl.events || 'MANAGE',
        compliance: acl.compliance || 'WRITE',
			};
		case 'MEMBER':
		default:
	}

	return {
		billing: acl.billing || 'NONE',
		digests: acl.digests || 'NONE', // 2/3 = receive digests, 1 = only see from web app
		logs: acl.logs || 'WRITE', // "READ" for logs does nothing
		viewData: acl.viewData || 'NONE', // This blocks access from users being able to read other people's logs
		members: acl.members || 'READ',
		finances: acl.finances || 'NONE',
		settings: acl.settings || 'READ',
		integrations: acl.integrations || 'NONE',
		reminders: acl.reminders || 'WRITE',
		events: acl.events || 'MANAGE',
    compliance: acl.compliance || 'READ',
	};
}

/**
 * Check if this account's ACL has required permissions for an action
 */

export type ACLPermissionCheck = 'READ' | 'WRITE' | 'MANAGE';
export type PermissionCheckFor = keyof ReturnType<typeof getDefaultPermissionsByRole>;

export function checkACLPermission(
	orgRel: OrganizationRelGQLData | OrganizationRelData | ViewerOrganization,
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
 * Get Icon name for organization operation
 * @param operation - Organization operation string
 * @returns Icon name as string
 */

export function getOperationIconName(operation: string | null | undefined): string {
	return {
		ARABLE: 'seedling-filled',
    FARMERS_MARKET: 'building-store-filled', // when you replace this, delete the icon too
		LIVESTOCK: 'horse-filled',
	}[operation || ''] || 'info-circle-filled';
}

/**
 * Get all title icons for organization/vendor
 * @param org - Organization GQL data
 * @returns Array of icon label objects with icon name and tooltip text
 */

export function getTitleIconsForOrganization(org: OrganizationGQLData) {
	const { operation, compliance } = org;
	const titleIcons = [];

	if (operation) {
		titleIcons.push({
			iconName: getOperationIconName(operation),
			tooltipText: i18n.t(`organization.type.${operation}`),
		});
	}

	if (compliance?.length) {
		const today = new Date();
		const todayCalDate = today.toISOString().split('T')[0];
		const notExpired = compliance.filter((item: any) => item.expirationDate && item.expirationDate > todayCalDate);

		if (notExpired.length > 0) {
			titleIcons.push({
				iconName: 'award-filled',
				tooltipText: notExpired.map((item: any) => item.name).join(', '),
			});
		}
	}

	return titleIcons;
}
