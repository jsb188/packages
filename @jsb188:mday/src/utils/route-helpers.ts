import { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';

/**
 * Constants
 */

const ROUTES_MAP = {
  // If path ends with a slash, "$some_param_id" path segment is expected.
  ai_chat: '/app/c/',
  // Keep non "/" paths (paths with "$some_param_id") at bottom
  app: '/app',
  livestock: '/app/livestock',
  logs: '/app/logs',
  markets: '/app/markets',
  orders: '/app/orders',
  partners: '/app/partners',
  purchases: '/app/purchases',
  receipts: '/app/receipts',

  // Arable
  seeding: '/app/seeding',
  transplanting: '/app/transplanting',
  field_work: '/app/field-work',
  harvested: '/app/harvested',
  post_harvest: '/app/post-harvest',
};

const PATH_TO_ROUTE_NAME = Object.entries(ROUTES_MAP).reduce((acc, [routeName, path]) => {
  acc[path] = routeName;
  return acc;
}, {} as { [path: string]: string });

const ROUTES_RULE: Record<string, {
  allowedOperations?: OrganizationOperationEnum[];
  notAllowedOperations?: OrganizationOperationEnum[];
  requireManageInventory: boolean;
  requireManageActions: boolean;
}> = {
  livestock: {
    allowedOperations: ['LIVESTOCK'],
    requireManageInventory: true,
    requireManageActions: false,
  },
  markets: {
    allowedOperations: ['FARMERS_MARKET'],
    requireManageInventory: true,
    requireManageActions: false,
  },
  partners: {
    allowedOperations: ['FARMERS_MARKET'],
    requireManageInventory: false,
    requireManageActions: false,
  },
  purchases: {
    notAllowedOperations: ['FARMERS_MARKET'],
    requireManageInventory: false,
    requireManageActions: false,
  },
  orders: {
    allowedOperations: ['ARABLE', 'LIVESTOCK'],
    requireManageInventory: false,
    requireManageActions: false,
  },
  receipts: {
    allowedOperations: ['FARMERS_MARKET'],
    requireManageInventory: false,
    requireManageActions: true,
  },

  // Arable
  seeding: {
    allowedOperations: ['ARABLE'],
    requireManageInventory: false,
    requireManageActions: false,
  },
  transplanting: {
    allowedOperations: ['ARABLE'],
    requireManageInventory: false,
    requireManageActions: false,
  },
  field_work: {
    allowedOperations: ['ARABLE'],
    requireManageInventory: false,
    requireManageActions: false,
  },
  harvested: {
    allowedOperations: ['ARABLE'],
    requireManageInventory: false,
    requireManageActions: false,
  },
  post_harvest: {
    allowedOperations: ['ARABLE'],
    requireManageInventory: false,
    requireManageActions: false,
  },
};

/**
 * Types
 */

type MarketdayRouteName = keyof typeof ROUTES_MAP;

/**
 * Make pathname to a route in Marketday app.
 * @param routeName - The name of the route.
 * @param pathSegment - Optional additional path segment to append.
 * @returns The full pathname for the route.
 */

export function makePathname(routeName: MarketdayRouteName, pathSegment?: string | null): string {
  const routePath = ROUTES_MAP[routeName] ?? ROUTES_MAP.app;
  if (routePath.endsWith('/')) {
    return pathSegment ? `${routePath}${pathSegment}` : routePath.substring(0, routePath.length - 1);
  }
  return routePath;
}

/**
 * Check if route is valid.
 * @param routeName - The name of the route.
 * @param pathSegment - Optional additional path segment to append.
 * @returns The full pathname for the route.
 */

export function isRouteValid(routeName: string, pathSegment?: string | null): boolean {
  const routePath = ROUTES_MAP[routeName as MarketdayRouteName];
  return (
    !!routePath &&
    (!routePath.endsWith('/') || !!pathSegment)
  );
}

/**
 * Get route name from pathname.
 * @param pathname - The pathname to check.
 * @returns The route name if found.
 */

export function getRouteName(pathname: string): MarketdayRouteName | '' {
  for (const routeName in ROUTES_MAP) {
    if (pathname.startsWith(ROUTES_MAP[routeName as MarketdayRouteName])) {
      return routeName as MarketdayRouteName;
    }
  }
  return '';
}

/**
 * Check if route exists
 * @param routePath - Route path to check.
 */

export function doesRouteExist(routePath: string): boolean {
  return Object.values(ROUTES_MAP).some((path) => {
    if (path.endsWith('/')) {
      return routePath.startsWith(path);
    }
    return routePath === path;
  });
}

/**
 * Check if this organization's operation allows access to this route path
 * @param routePath - Route path to check.
 * @param operation - Organization operation.
 * @param canManageInventory - Whether organization can manage inventory.
 * @param canManageActions - Whether organization can manage events.
 */

export function isRouteAllowed(
  routePath: string,
  operation: OrganizationOperationEnum | null,
  canManageInventory: boolean,
  canManageActions: boolean
): boolean {

  const routeName = PATH_TO_ROUTE_NAME[routePath];
  if (!routeName) {
    return true;
  }

  const routeRules = ROUTES_RULE[routeName];
  if (!routeRules) {
    return true;
  }

  return (
    (!routeRules.allowedOperations || routeRules.allowedOperations.includes(operation || '')) &&
    (!routeRules.notAllowedOperations || !routeRules.notAllowedOperations.includes(operation || '')) &&
    (!routeRules.requireManageInventory || canManageInventory) &&
    (!routeRules.requireManageActions || canManageActions)
  );
}
