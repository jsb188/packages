import type { OrganizationFeatureEnum, OrganizationOperationEnum } from '@jsb188/app/types/organization.d';

/**
 * Constants
 */

const ROUTES_MAP = {
  // If path ends with a slash, "$some_param_id" path segment is expected.
  // Keep these at top
  'app/ai_chat': '/app/c/',

  // Keep non "/.." paths (paths with "$some_param_id") at bottom
  'app': '/app',
  'app/markets': '/app/markets',
  'app/orders': '/app/orders',
  'app/purchases': '/app/purchases',
  'app/receipts': '/app/receipts',

  // Arable
  'app/seeding': '/app/seeding',
  'app/transplanting': '/app/transplanting',
  'app/field_work': '/app/field-work',
  'app/harvested': '/app/harvested',
  'app/post_harvest': '/app/post-harvest',

  // Farmers Market
  'app/vendors': '/app/vendors',

  // Livestock
  'app/livestock': '/app/livestock',

  // Unsorted (see all)
  'app/logs': '/app/logs',
  'app/ai_workflows': '/app/ai-workflows',
};

const PATH_TO_ROUTE_NAME = Object.entries(ROUTES_MAP).reduce((acc, [routeName, path]) => {
  acc[path] = routeName;
  return acc;
}, {} as { [path: string]: string });

const ROUTES_RULE: Record<string, {
  allowedOperations?: OrganizationOperationEnum[];
  notAllowedOperations?: OrganizationOperationEnum[];
  requiredFeature?: OrganizationFeatureEnum;
}> = {

  // Arable
  'app/seeding': {
    allowedOperations: ['ARABLE'],
  },
  'app/transplanting': {
    allowedOperations: ['ARABLE'],
  },
  'app/field_work': {
    allowedOperations: ['ARABLE'],
  },
  'app/harvested': {
    allowedOperations: ['ARABLE'],
  },
  'app/post_harvest': {
    allowedOperations: ['ARABLE'],
  },

  // Farmers Market
  'app/markets': {
    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: 'EVENTS',
  },
  'app/vendors': {
    allowedOperations: ['FARMERS_MARKET'],
  },
  'app/purchases': {
    notAllowedOperations: ['FARMERS_MARKET'],
  },
  'app/orders': {
    allowedOperations: ['ARABLE', 'LIVESTOCK'],
  },
  'app/receipts': {
    allowedOperations: ['FARMERS_MARKET'],
  },

  // Livestock
  'app/livestock': {
    allowedOperations: ['LIVESTOCK'],
    // requiredFeature: 'LIVESTOCK_ANIMALS', ??
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
 * @param orgFeatures - Enabled features for organization.
 */

export function isRouteAllowed(
  routePath: string,
  operation: OrganizationOperationEnum | null,
  orgFeatures: OrganizationOperationEnum[] | null,
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
    // If {orgFeature} is null, assume data is not finished loading yet, and allow "benefit of doubt" access
    (!orgFeatures || !routeRules.requiredFeature || orgFeatures.includes(routeRules.requiredFeature))
  );
}
