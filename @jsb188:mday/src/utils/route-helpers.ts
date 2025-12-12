import i18n from '@jsb188/app/i18n';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
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

  // * Arable; Modules for Food Safety
  'app/globalgap': '/app/globalgap',
  'app/cleaning': '/app/cleaning',

  // * Arable; Food Safety
  'app/hygiene': '/app/hygiene',
  'app/sanitation': '/app/sanitation',
  'app/materials': '/app/materials',
  'app/biosecurity': '/app/biosecurity',
  'app/employees': '/app/employees',

  // # Farmers Market
  'app/vendors': '/app/vendors',

  // # Livestock
  'app/livestock': '/app/livestock',

  // # Grower Network
  'app/growers': '/app/growers',
  'app/foreign_growers': '/app/foreign-growers',

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

const F = {
  normal_logging: ['NORMAL_LOGGING'],
  food_safety: ['FOOD_SAFETY', 'GLOBAL_GAP'],
};

/**
 * Rules
 */

// @ts-ignore
const ROUTES_DICT: Record<AppRouteName, {
  to: string;
  text: string;
  iconName: string;
  allowedOperations?: OrganizationOperationEnum[];
  notAllowedOperations?: OrganizationOperationEnum[];
  requiredFeature?: OrganizationFeatureEnum[];
}> = {

  // Advanced

  'app/ai_workflows': {
    to: makePathname('app/ai_workflows'),
    text: i18n.t('form.ai_workflows'),
    iconName: COMMON_ICON_NAMES.ai_workflow,
  },

  'app/logs': {
    to: makePathname('app/logs'),
    text: i18n.t('log.all_logs'),
    iconName: COMMON_ICON_NAMES.logs,
    notAllowedOperations: ['GROWER_NETWORK'], // Temporary for now
  },

  // Arable

  'app/seeding': {
    to: ROUTES_MAP['app/seeding'],
    text: i18n.t('log.seeding'),
    iconName: COMMON_ICON_NAMES.seeding,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  'app/transplanting': {
    to: makePathname('app/transplanting'),
    text: i18n.t('log.transplanting'),
    iconName: COMMON_ICON_NAMES.transplanting,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  'app/field_work': {
    to: makePathname('app/field_work'),
    text: i18n.t('log.field_work'),
    iconName: COMMON_ICON_NAMES.field_work,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  'app/harvested': {
    to: makePathname('app/harvested'),
    text: i18n.t('log.harvested'),
    iconName: COMMON_ICON_NAMES.harvest,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  'app/post_harvest': {
    to: makePathname('app/post_harvest'),
    text: i18n.t('log.post_harvest'),
    iconName: COMMON_ICON_NAMES.post_harvest,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  'app/purchases': {
    to: makePathname('app/purchases'),
    text: i18n.t('log.purchases'),
    iconName: COMMON_ICON_NAMES.invoice,

    allowedOperations: OP_FARMING,
    requiredFeature: F.normal_logging,
  },
  'app/orders': {
    to: makePathname('app/orders'),
    text: i18n.t('form.sales_orders'),
    iconName: COMMON_ICON_NAMES.receipt,

    allowedOperations: OP_FARMING,
    requiredFeature: F.normal_logging,
  },

  // Arable; Reports

  'app/globalgap': {
    to: makePathname('app/globalgap'),
    text: i18n.t('product.globalgap'),
    iconName: COMMON_ICON_NAMES.global_gap,

    allowedOperations: OP_FARMING,
    requiredFeature: ['GLOBAL_GAP'],
  },
  'app/cleaning': {
    to: makePathname('app/cleaning'),
    text: i18n.t('log.cleaning_logs'),
    iconName: COMMON_ICON_NAMES.SANITATION,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },

  // Arable; Food Safety

  'app/hygiene': {
    to: ROUTES_MAP['app/hygiene'],
    text: i18n.t('log.hygiene'),
    iconName: COMMON_ICON_NAMES.HYGIENE,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  'app/sanitation': {
    to: ROUTES_MAP['app/sanitation'],
    text: i18n.t('log.sanitation'),
    iconName: COMMON_ICON_NAMES.SANITATION,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  'app/materials': {
    to: makePathname('app/materials'),
    text: i18n.t('log.materials'),
    iconName: COMMON_ICON_NAMES.MATERIALS,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  'app/biosecurity': {
    to: makePathname('app/biosecurity'),
    text: i18n.t('log.biosecurity'),
    iconName: COMMON_ICON_NAMES.BIOSECURITY,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  'app/employees': {
    to: makePathname('app/employees'),
    text: i18n.t('log.employees'),
    iconName: COMMON_ICON_NAMES.EMPLOYEES,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },

  // Farmers Market
  'app/vendors': {
    to: makePathname('app/vendors'),
    text: i18n.t('form.vendors'),
    iconName: COMMON_ICON_NAMES.shop_vendor,

    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: F.normal_logging
  },
  'app/markets': {
    to: makePathname('app/markets'),
    text: i18n.t('form.markets'),
    iconName: COMMON_ICON_NAMES.shop_market,

    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: ['CAL_EVENTS'],
  },
  'app/receipts': {
    to: makePathname('app/receipts') + '?s=1',
    text: i18n.t('form.market_receipts'),
    iconName: COMMON_ICON_NAMES.market_receipt,

    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: F.normal_logging
  },

  // Livestock
  'app/livestock': {
    to: makePathname('app/livestock'),
    text: i18n.t('form.livestock'),
    iconName: COMMON_ICON_NAMES.livestock,

    allowedOperations: ['LIVESTOCK'],
    requiredFeature: F.normal_logging
  },

  // Grower Network
  'app/growers': {
    to: makePathname('app/growers'),
    text: i18n.t('form.domestic_growers'),
    iconName: COMMON_ICON_NAMES.growers,

    allowedOperations: ['GROWER_NETWORK'],
  },
  'app/foreign_growers': {
    to: makePathname('app/foreign_growers'),
    text: i18n.t('form.foreign_growers'),
    iconName: COMMON_ICON_NAMES.foreign_growers,

    allowedOperations: ['GROWER_NETWORK'],
  },
};

/**
 * Make pathname to a route in Marketday app.
 * @param routeName - The name of the route.
 * @param pathSegment - Optional additional path segment to append.
 * @returns The full pathname for the route.
 */

export function makePathname(routeName: AppRouteName, pathSegment?: string | null): string {
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
  const routePath = ROUTES_MAP[routeName as AppRouteName];
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

export function getRouteName(pathname: string): AppRouteName | '' {
  for (const routeName in ROUTES_MAP) {
    if (pathname.startsWith(ROUTES_MAP[routeName as AppRouteName])) {
      return routeName as AppRouteName;
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

  const routeRules = ROUTES_DICT[routeName];
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

/**
 * Helper; get static nav list based on organization's operation & features
 */

interface NavListItem {
  break: never;
  to: string;
  text: string;
  iconName: string;
};

interface NavBreakItem {
  break: boolean;
  to: never;
  text: never;
  iconName: never;
};

export type NavigationItem = NavListItem | NavBreakItem;

export function getNavigationList(
  operation: OrganizationOperationEnum | null,
  orgFeatures?: OrganizationFeatureEnum[],
): NavigationItem[] {

  const breakItem = {
    break: true,
  };

  let navListArr: any[] = [];
  switch (operation) {
    case 'ARABLE':
      navListArr = [
        {
          text: i18n.t('form.reports'),
          navList: [
            ROUTES_DICT['app/globalgap'],
            ROUTES_DICT['app/cleaning'],
          ]
        },
        // {
        //   text: i18n.t('log.food_safety'),
        //   navList: [
        //     ROUTES_DICT['app/hygiene'],
        //     ROUTES_DICT['app/sanitation'],
        //     ROUTES_DICT['app/materials'],
        //     ROUTES_DICT['app/biosecurity'],
        //     ROUTES_DICT['app/employees'],
        //   ]
        // },
        {
          text: i18n.t(`org.type_active.${operation}`),
          navList: [
            ROUTES_DICT['app/seeding'],
            ROUTES_DICT['app/transplanting'],
            ROUTES_DICT['app/field_work'],
            ROUTES_DICT['app/harvested'],
            ROUTES_DICT['app/post_harvest'],
            breakItem,

            ROUTES_DICT['app/purchases'],
            ROUTES_DICT['app/orders'],
          ]
        },
      ];
      break;
    case 'LIVESTOCK':
      navListArr = [
        {
          text: i18n.t(`org.type_active.${operation}`),
          navList: [
            ROUTES_DICT['app/livestock'],
            { ...ROUTES_DICT['app/purchases'], text: i18n.t('log.supply_purchases') },
          ]
        },
      ];
      break;
    case 'FARMERS_MARKET':
      navListArr = [
        {
          text: i18n.t(`org.type_active.${operation}`),
          navList: [
            ROUTES_DICT['app/vendors'],
            ROUTES_DICT['app/markets'],
            ROUTES_DICT['app/receipts'],
          ]
        },
      ];
      break;
    case 'GROWER_NETWORK':
      navListArr = [
        {
          text: i18n.t(`org.type_active.${operation}`),
          navList: [
            ROUTES_DICT['app/growers'],
            ROUTES_DICT['app/foreign_growers'],
          ]
        }
      ];
      break;
    default:
      navListArr = [];
  }

  navListArr = [{
    to: makePathname('app'),
    text: i18n.t('app.home'),
    // className: 'mb_df',
    iconName: COMMON_ICON_NAMES[operation!] || 'home',
  },
    breakItem,
  ].concat(navListArr).concat([{
    text: i18n.t('form.advanced'),
    initialExpanded: false,
    navList: [
      ROUTES_DICT['app/ai_workflows'],
      ROUTES_DICT['app/logs']
    ]
  }] as any);

  const mapNavItems = (item: any) => {
    if (Array.isArray(item)) {
      const [navItem, ...requiredFeatures] = item;
      if (requiredFeatures.some(feature => orgFeatures?.includes?.(feature))) {
        return navItem;
      }
      return null;
    } else if (item?.navList) {
      item.navList = item.navList.reduce((acc: any[], x: any, i: number) => {
        const mappedItem = mapNavItems(x);
        if (
          mappedItem &&
          (mappedItem.to || (acc.length && i !== (item.navList.length - 1)))
        ) {
          acc.push(mappedItem);
        }
        return acc;
      }, []);

      // if (!item?.navList.find((item: any) => item.to)) {
      if (!item.navList.length) {
        return null;
      }
    } else if (!isRouteAllowed(item.to, operation, orgFeatures)) {
      return null;
    }
    return item;
  };

  return navListArr.map(mapNavItems).filter(Boolean);
}
