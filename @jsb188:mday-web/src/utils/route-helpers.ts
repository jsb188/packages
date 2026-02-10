import i18n from '@jsb188/app/i18n/index.ts';
import type { OrganizationFeatureEnum, OrganizationOperationEnum } from '@jsb188/mday/types/organization.d.ts';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';

// Use this for report periods, etc
const CURRENT_YEAR = String(new Date().getFullYear());

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

type ValidRoutePath =
  '/app'
  | '/app/c/'
  | '/app/ai-workflows' // Temporary
  | '/app/workflows'
  | '/app/logs'
  | '/app/seeding'
  | '/app/transplanting'
  | '/app/field-work'
  | '/app/harvested'
  | '/app/post-harvest'
  | '/app/orders'
  | '/app/globalgap/'
  | '/app/cleaning'
  | '/app/purchases'
  | '/app/organic'
  | '/app/hygiene'
  | '/app/sanitation'
  | '/app/materials'
  | '/app/biosecurity'
  | '/app/employees'
  | '/app/vendors'
  | '/app/markets'
  | '/app/receipts'
  | '/app/livestock'
  | '/app/growers'
  | '/app/foreign-growers';

interface RouteDictObj {
  to: ValidRoutePath;
  text: string;
  iconName?: string;
  allowedOperations?: OrganizationOperationEnum[];
  notAllowedOperations?: OrganizationOperationEnum[];
  requiredFeature?: OrganizationFeatureEnum[];

  // These values prevent rendering flickers when calculating TOC/breadcrumbs between page renders
  hasPhysicalToolbar?: 'ALWAYS' | 'NEVER' | ((parts: string[]) => boolean);
  hasAsideNav?: 'ALWAYS' | 'NEVER' | ((parts: string[]) => boolean);
  toolbarShadowStyle?: string;
}

const ROUTES_DICT: Record<ValidRoutePath, RouteDictObj> = {

  // Main /app/ routes
  // If route ends with '/', it requires (or optionally accepts) a path segment
  // e.g. "/app/c/" means "/app/c/:chatId" etc
  // e.g. "/app" means exactly "/app", and it never expects a path segment

  '/app': {
    to: '/app',
    text: 'app.home',
  },

  '/app/c/': {
    to: '/app/c/',
    text: 'app.route_ai_chat',
    iconName: COMMON_ICON_NAMES.chat,

    hasPhysicalToolbar: 'ALWAYS',
    hasAsideNav: 'NEVER',
    toolbarShadowStyle: 'shadow_bg_drop_lg',
  },

  // Advanced

  '/app/ai-workflows': { // Temporary
    to: '/app/ai-workflows',
    text: 'form.ai_workflows',
    iconName: COMMON_ICON_NAMES.ai_workflow,
  },

  '/app/workflows': {
    to: '/app/workflows',
    text: 'form.ai_workflows',
    iconName: COMMON_ICON_NAMES.ai_workflow,
    hasAsideNav: 'NEVER',
  },

  '/app/logs': {
    to: '/app/logs',
    text: 'log.all_logs',
    iconName: COMMON_ICON_NAMES.logs,
    notAllowedOperations: ['GROWER_NETWORK'], // Temporary for now
  },

  // Arable

  '/app/seeding': {
    to: '/app/seeding',
    text: 'log.seeding',
    iconName: COMMON_ICON_NAMES.seeding,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  '/app/transplanting': {
    to: '/app/transplanting',
    text: 'log.transplanting',
    iconName: COMMON_ICON_NAMES.transplanting,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  '/app/field-work': {
    to: '/app/field-work',
    text: 'log.field_work',
    iconName: COMMON_ICON_NAMES.field_work,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  '/app/harvested': {
    to: '/app/harvested',
    text: 'log.harvested',
    iconName: COMMON_ICON_NAMES.harvest,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  '/app/post-harvest': {
    to: '/app/post-harvest',
    text: 'log.post_harvest',
    iconName: COMMON_ICON_NAMES.post_harvest,

    allowedOperations: ['ARABLE'],
    requiredFeature: F.normal_logging,
  },
  '/app/purchases': {
    to: '/app/purchases',
    text: 'log.purchases',
    iconName: COMMON_ICON_NAMES.invoice,

    allowedOperations: OP_FARMING,
    requiredFeature: F.normal_logging,
  },
  '/app/orders': {
    to: '/app/orders',
    text: 'form.sales_orders',
    iconName: COMMON_ICON_NAMES.receipt,

    allowedOperations: OP_FARMING,
    requiredFeature: F.normal_logging,
  },

  // Arable; Reports

  '/app/globalgap/': {
    to: ('/app/globalgap/' + CURRENT_YEAR) as ValidRoutePath,
    text: 'product.report.GLOBAL_GAP',
    iconName: COMMON_ICON_NAMES.generic_report,

    allowedOperations: OP_FARMING,
    requiredFeature: ['GLOBAL_GAP'],

    hasPhysicalToolbar: (parts: string[]) => parts.length > 4,
    hasAsideNav: (parts: string[]) => parts.length > 4,
  },
  '/app/cleaning': {
    to: '/app/cleaning',
    text: 'product.report.CLEANING',
    iconName: COMMON_ICON_NAMES.SANITATION,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  '/app/organic': {
    to: '/app/organic',
    text: 'product.report.ORGANIC_CERTIFICATION',
    iconName: COMMON_ICON_NAMES.generic_report,

    allowedOperations: OP_FARMING,
    requiredFeature: ['ORGANIC_CERTIFICATION'],

    // This will need to change later if we're introducing "period" table of contents page selection
    hasPhysicalToolbar: 'ALWAYS',
    hasAsideNav: 'ALWAYS',
  },

  // Arable; Food Safety

  '/app/hygiene': {
    to: '/app/hygiene',
    text: 'log.hygiene',
    iconName: COMMON_ICON_NAMES.HYGIENE,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  '/app/sanitation': {
    to: '/app/sanitation',
    text: 'log.sanitation',
    iconName: COMMON_ICON_NAMES.SANITATION,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  '/app/materials': {
    to: '/app/materials',
    text: 'log.materials',
    iconName: COMMON_ICON_NAMES.MATERIALS,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  '/app/biosecurity': {
    to: '/app/biosecurity',
    text: 'log.biosecurity',
    iconName: COMMON_ICON_NAMES.BIOSECURITY,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },
  '/app/employees': {
    to: '/app/employees',
    text: 'log.employees',
    iconName: COMMON_ICON_NAMES.EMPLOYEES,

    allowedOperations: OP_FARMING,
    requiredFeature: F.food_safety,
  },

  // Farmers Market
  '/app/vendors': {
    to: '/app/vendors',
    text: 'form.vendors',
    iconName: COMMON_ICON_NAMES.shop_vendor,

    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: F.normal_logging
  },
  '/app/markets': {
    to: '/app/markets',
    text: 'form.markets',
    iconName: COMMON_ICON_NAMES.shop_market,

    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: ['CAL_EVENTS'],
  },
  '/app/receipts': {
    to: ('/app/receipts?s=1') as ValidRoutePath,
    text: 'form.market_receipts',
    iconName: COMMON_ICON_NAMES.market_receipt,

    allowedOperations: ['FARMERS_MARKET'],
    requiredFeature: F.normal_logging
  },

  // Livestock
  '/app/livestock': {
    to: '/app/livestock',
    text: 'form.livestock',
    iconName: COMMON_ICON_NAMES.livestock,

    allowedOperations: ['LIVESTOCK'],
    requiredFeature: F.normal_logging
  },

  // Grower Network
  '/app/growers': {
    to: '/app/growers',
    text: 'form.domestic_growers',
    iconName: COMMON_ICON_NAMES.growers,

    allowedOperations: ['GROWER_NETWORK'],
  },
  '/app/foreign-growers': {
    to: '/app/foreign-growers',
    text: 'form.foreign_growers',
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

export function makePathname(routePath: ValidRoutePath, pathSegment?: string | null): ValidRoutePath {
  const pathExists = !!ROUTES_DICT[routePath];
  if (pathExists && routePath.endsWith('/')) {
    return (pathSegment ? `${routePath}${pathSegment}` : routePath.substring(0, routePath.length - 1)) as ValidRoutePath;
  }
  return pathExists ? routePath : '/app';
}

/**
 * Check if route is valid.
 * @param routeName - The name of the route.
 * @param pathSegment - Optional additional path segment to append.
 * @returns The full pathname for the route.
 */

export function isRouteValid(routePath: ValidRoutePath, pathSegment?: string | null): boolean {
  const routeDict = !!ROUTES_DICT[routePath];
  return (
    !!routeDict &&
    (!routePath.endsWith('/') || !!pathSegment)
  );
}

/**
 * Get route config from pathname.
 * NOTE: This is the best way to prevent page flickers due to breadcrumbs/TOC calculations/resets/etc.
 * @param pathname - The pathname to check.
 * @returns The route name if found.
 */

const ROUTES_DICT_ORDERED = Object.keys(ROUTES_DICT).sort((a, b) => b.length - a.length);

interface RouteConfigObj extends Omit<RouteDictObj, 'hasPhysicalToolbar' | 'hasAsideNav'> {
  routeName: ValidRoutePath;
  scrollResetKey: string;
  allowed: boolean;
  hasPhysicalToolbar: boolean;
  hasAsideNav: boolean;
}

export function getRouteConfigs(
  pathname: ValidRoutePath | string,
  operation?: OrganizationOperationEnum | null,
  orgFeatures?: OrganizationFeatureEnum[] | null,
): RouteConfigObj {

  for (const routeName of ROUTES_DICT_ORDERED) {
    if (pathname.startsWith(routeName)) {

      // Scroll position fix + breadcrumb / TOC cleanup on unmount
      // This will retain scroll position for deeper links,
      // ie. "/app/globalgap/2023/.." will be retained

      const routeDict = ROUTES_DICT[routeName as ValidRoutePath];
      const pathParts = pathname.split('/');

      let scrollResetKey: string;
      if (pathParts.length >= 3) {
        // scroll reset key here is full path minus last part
        scrollResetKey = pathParts.slice(0, pathParts.length - 1).join('/');
      } else {
        scrollResetKey = pathParts.slice(0, 3).join('/');
      }

      const hasAsideNav = !!routeDict.hasAsideNav && routeDict.hasAsideNav !== 'NEVER' && (
        routeDict.hasAsideNav === 'ALWAYS' ||
        (typeof routeDict.hasAsideNav === 'function' && routeDict.hasAsideNav(pathParts))
      );

      const hasPhysicalToolbar = !!routeDict.hasPhysicalToolbar && routeDict.hasPhysicalToolbar !== 'NEVER' && (
        routeDict.hasPhysicalToolbar === 'ALWAYS' ||
        (typeof routeDict.hasPhysicalToolbar === 'function' && routeDict.hasPhysicalToolbar(pathParts))
      );

      return {
        ...routeDict,
        text: i18n.has(routeDict.text) ? i18n.t(routeDict.text) : routeDict.text,
        routeName: routeName as ValidRoutePath,
        scrollResetKey,
        allowed: isRouteAllowed(pathname, operation, orgFeatures),
        hasPhysicalToolbar,
        hasAsideNav,
      };
    }
  }

  return {
    routeName: '/__unknown',
    scrollResetKey: '',
    allowed: false,
    hasPhysicalToolbar: false,
    hasAsideNav: false,
  } as any;
}

/**
 * Check if this organization's operation allows access to this route path
 * @param pathname - pathname to check.
 * @param operation - Organization operation.
 * @param orgFeatures - Enabled features for organization.
 */

export function isRouteAllowed(
  pathname: ValidRoutePath | string,
  operation?: OrganizationOperationEnum | null,
  orgFeatures?: OrganizationFeatureEnum[] | null,
): boolean {

  let routeDict = ROUTES_DICT[pathname as ValidRoutePath];
  if (!routeDict) {
    const parts = pathname.split('/');
    for (let i = parts.length; i > 0; i--) {
      const subPath = parts.slice(0, i).join('/');

      // @ts-ignore - sub paths may not be valid route paths
      routeDict = ROUTES_DICT[subPath] || ROUTES_DICT[subPath + '/'];
      if (routeDict || i <= 3) {
        break;
      }
    }
  }

  if (!routeDict) {
    // Assume true if there are no rules set
    return true;
  }

  return (
    (!routeDict.allowedOperations || routeDict.allowedOperations.includes(operation || '')) &&
    (!routeDict.notAllowedOperations || !routeDict.notAllowedOperations.includes(operation || '')) &&
    // If {orgFeature} is null, assume data is not finished loading yet, and allow "benefit of doubt" access
    (!orgFeatures || !routeDict.requiredFeature || routeDict.requiredFeature.some((feature) => orgFeatures.includes(feature)))
  );
}

/**
 * Helper; because i18n isn't registered when this file opens, we gotta do this
 */

function routesDictI18n(routeDictObj: RouteDictObj) {
  return {
    ...routeDictObj,
    text: i18n.t(routeDictObj.text),
  };
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

  let navListArr: {
    text: string;
    initialExpanded?: boolean;
    navList: (RouteDictObj | { break: boolean })[];
  }[] = [];

  switch (operation) {
    case 'ARABLE':
      navListArr = [
        {
          text: i18n.t('form.reports'),
          navList: [
            ROUTES_DICT['/app/organic'],
            ROUTES_DICT['/app/globalgap/'],
          ]
        },
        {
          text: i18n.t('log.food_safety'),
          navList: [
            ROUTES_DICT['/app/cleaning'],
            // ROUTES_DICT['/app/hygiene'],
            // ROUTES_DICT['/app/sanitation'],
            // ROUTES_DICT['/app/materials'],
            // ROUTES_DICT['/app/biosecurity'],
            // ROUTES_DICT['/app/employees'],
          ]
        },
        {
          text: i18n.t(`org.type_active.${operation}`),
          navList: [
            ROUTES_DICT['/app/seeding'],
            ROUTES_DICT['/app/transplanting'],
            ROUTES_DICT['/app/field-work'],
            ROUTES_DICT['/app/harvested'],
            ROUTES_DICT['/app/post-harvest'],

            breakItem,

            ROUTES_DICT['/app/purchases'],
            ROUTES_DICT['/app/orders'],
          ]
        },
      ];
      break;
    case 'LIVESTOCK':
      navListArr = [
        {
          text: i18n.t(`org.type_active.${operation}`),
          navList: [
            ROUTES_DICT['/app/livestock'],
            { ...ROUTES_DICT['/app/purchases'], text: i18n.t('log.supply_purchases') },
          ]
        },
      ];
      break;
    case 'FARMERS_MARKET':
      navListArr = [
        {
          text: i18n.t(`org.type_active.${operation}`),
          navList: [
            ROUTES_DICT['/app/vendors'],
            ROUTES_DICT['/app/markets'],
            ROUTES_DICT['/app/receipts'],
          ]
        },
      ];
      break;
    case 'GROWER_NETWORK':
      navListArr = [
        {
          text: i18n.t(`org.type_active.${operation}`),
          navList: [
            ROUTES_DICT['/app/growers'],
            ROUTES_DICT['/app/foreign-growers'],
          ]
        }
      ];
      break;
    default:
      navListArr = [];
  }

  // @ts-ignore
  navListArr = [{
    ...ROUTES_DICT['/app'],
    iconName: COMMON_ICON_NAMES[operation!] || 'home',
  },
    breakItem,
  // @ts-ignore
  ].concat(navListArr).concat([{
    text: i18n.t('form.advanced'),
    initialExpanded: false,
    navList: [
      ROUTES_DICT['/app/ai-workflows'], // Temporary
      // ROUTES_DICT['/app/workflows'],
      ROUTES_DICT['/app/logs']
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
          if (mappedItem.text && i18n.has(mappedItem.text)) {
            mappedItem.text = i18n.t(mappedItem.text);
          }
          acc.push(mappedItem);
        }
        return acc;
      }, []);

      if (!item.navList.length) {
        return null;
      }
    } else if (item?.to && !isRouteAllowed(item.to, operation, orgFeatures)) {
      return null;
    }

    if (item?.text && i18n.has(item.text)) {
      item.text = i18n.t(item.text);
    }

    return item;
  };

  return navListArr.map(mapNavItems).filter(Boolean);
}
