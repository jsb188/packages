import { OrganizationRelGQLData } from "../types/organization.d";

/**
 * Get deefault permissions by role
 */

export function getDefaultPermissionsByRole(orgRel: OrganizationRelGQLData) {

  const role = orgRel?.role || 'MEMBER';
  const acl = orgRel?.acl || {};

  // Also keep this synced with [resolvers/organizationTypeResolvers.ts]

  // 0 = "NONE"
  // 1 = "READ"
  // 2 = "WRITE"
  // 3 = "MANAGE"

  switch (role) {
    case 'ADMIN':
    case 'OWNER':
      return {
        billing: 'MANAGE',
        digests: acl.digests || 'MANAGE', // 2/3 = receive digests, 1 = only see from web app
        logs: 'MANAGE',
        members: 'MANAGE',
        finances: 'MANAGE',
        products: 'MANAGE',
        settings: 'MANAGE',
        integrations: 'MANAGE',
      };
    case 'MANAGER':
      return {
        billing: acl.billing || 'READ',
        digests: acl.digests || 'WRITE', // 2/3 = receive digests, 1 = only see from web app
        logs: acl.logs || 'MANAGE',
        members: acl.members || 'WRITE',
        finances: acl.finances || 'READ',
        products: acl.products || 'MANAGE',
        settings: acl.settings || 'READ',
        integrations: acl.integrations || 'NONE',
      };
    case 'MEMBER':
    default:
  }

  return {
    billing: acl.billing || 'NONE',
    digests: acl.digests || 'NONE', // 2/3 = receive digests, 1 = only see from web app
    logs: acl.logs || 'WRITE',
    members: acl.members || 'READ',
    finances: acl.finances || 'NONE',
    products: acl.products || 'READ',
    settings: acl.settings || 'READ',
    integrations: acl.integrations || 'NONE',
  };
}

/**
 * Check if this account's ACL has required permissions for an action
 */

type ACLPermissionCheck = 'READ' | 'WRITE' | 'MANAGE';

export function checkACLPermission(
  orgRel: OrganizationRelGQLData,
  check: keyof ReturnType<typeof getDefaultPermissionsByRole>,
  requiredPermission: ACLPermissionCheck
): boolean | null {
  if (!orgRel) {
    return null;
  }

  const acl = getDefaultPermissionsByRole(orgRel);

  const permissionsToInt = {
    READ: 1,
    WRITE: 2,
    MANAGE: 3,
  };

  const requiredInt = permissionsToInt[requiredPermission] || 4; // If invalid, it will always return false
  const permission = acl[check] as ACLPermissionCheck;
  const acccountPermissionInt = permissionsToInt[permission] || 0; // If invalid, it will always return false

  return acccountPermissionInt >= requiredInt;
}