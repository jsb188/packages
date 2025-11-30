import type { OrganizationFeatureEnum, OrganizationOperationEnum } from '../types/organization.d';

/**
 * Constants; Routes
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

  // # Arable
  'app/seeding': '/app/seeding',
  'app/transplanting': '/app/transplanting',
  'app/field_work': '/app/field-work',
  'app/harvested': '/app/harvested',
  'app/post_harvest': '/app/post-harvest',

  // * Arable; Food Safety
  'app/hygiene': '/app/hygiene',
  'app/sanitation': '/app/sanitation',
  'app/equipments': '/app/equipments',
  'app/biosecurity': '/app/biosecurity',
  'app/employees': '/app/employees',

  // # Farmers Market
  'app/vendors': '/app/vendors',

  // # Livestock
  'app/livestock': '/app/livestock',

  // # Advanced
  'app/logs': '/app/logs',
  'app/ai_workflows': '/app/ai-workflows',
};

type AppRouteName = keyof typeof ROUTES_MAP;
type AppRoutePath = typeof ROUTES_MAP[AppRouteName];

const PATH_TO_ROUTE_NAME: Record<AppRoutePath, AppRouteName> = Object.entries(ROUTES_MAP).reduce((acc, [routeName, path]) => {
  // @ts-ignore
  acc[path] = routeName;
  return acc;
}, {});

/**
 * Constants; Re-usable rules
 */

const OP_FARMING = ['ARABLE', 'LIVESTOCK'];

const FEATURES = {
  normal_logging: ['NORMAL_LOGGING'],
  food_safety: ['FOOD_SAFETY', 'GLOBAL_GAP'],
};

/**
 * Rules
 */

// @ts-ignore
const ROUTES_RULE: Record<AppRouteName, {
  allowedOperations?: OrganizationOperationEnum[];
  notAllowedOperations?: OrganizationOperationEnum[];
  requiredFeature?: OrganizationFeatureEnum[];
}> = {

  // Arable
  'app/seeding': {
    allowedOperations: ['ARABLE'],
    requiredFeature: FEATURES.normal_logging,
  },
  'app/transplanting': {
    allowedOperations: ['ARABLE'],
    requiredFeature: FEATURES.normal_logging,
  },
  'app/field_work': {
    allowedOperations: ['ARABLE'],
    requiredFeature: FEATURES.normal_logging,
  },
  'app/harvested': {
    allowedOperations: ['ARABLE'],
    requiredFeature: FEATURES.normal_logging,
  },
  'app/post_harvest': {
    allowedOperations: ['ARABLE'],
    requiredFeature: FEATURES.normal_logging,
  },
  'app/purchases': {
    allowedOperations: OP_FARMING,
    requiredFeature: FEATURES.normal_logging,
  },
  'app/orders': {
    allowedOperations: OP_FARMING,
    requiredFeature: FEATURES.normal_logging,
  },
  'app/hygiene': {
    allowedOperations: OP_FARMING,
    requiredFeature: FEATURES.food_safety,
  },
  'app/sanitation': {
    allowedOperations: OP_FARMING,
    requiredFeature: FEATURES.food_safety,
  },
  'app/equipments': {
    allowedOperations: OP_FARMING,
    requiredFeature: FEATURES.food_safety,
  },
  'app/biosecurity': {
    allowedOperations: OP_FARMING,
    requiredFeature: FEATURES.food_safety,
  },
  'app/employees': {
    allowedOperations: OP_FARMING,
    requiredFeature: FEATURES.food_safety,
  },

  // Farmers Market
  'app/vendors': {
    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: FEATURES.normal_logging
  },
  'app/markets': {
    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: ['CAL_EVENTS'],
  },
  'app/receipts': {
    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: FEATURES.normal_logging
  },

  // Livestock
  'app/livestock': {
    allowedOperations: ['LIVESTOCK'],
    requiredFeature: FEATURES.normal_logging
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
  operation?: OrganizationOperationEnum | null,
  orgFeatures?: OrganizationOperationEnum[] | null,
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
    (!orgFeatures || !routeRules.requiredFeature || routeRules.requiredFeature.some((feature) => orgFeatures.includes(feature)))
  );
}
