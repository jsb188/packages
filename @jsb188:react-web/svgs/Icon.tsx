import { memo } from 'react';
// import type { ReactSpanElement } from '../types/dom';
import * as IconSVGs from './IconSVGs';

/**
 * Convert cameCalsed string to dash-separated
 */

function camelCaseToDash(str: string) {
  if (/^[A-Z0-9]+$/.test(str)) {
    return str.toLowerCase();
  }

  // let lastOffset = -1;
  return str
    .replace(/([A-Z]|\d+)/g, (match, _, offset) => {
      return (offset <= 0 ? '' : '-') + match.toLowerCase();

      // let skipDash = false;
      // if (offset <= 0) {
      // // Add a dash only if it's not at the start
      //   skipDash = true;
      // } else if ((offset - lastOffset) > 1) {
      //   skipDash = false;
      // }

      // lastOffset = offset;

      // return (skipDash ? '' : '-') + match.toLowerCase();
    });
}

/**
 * Icon map
 */

const ICON_MAP = Object.entries(IconSVGs).reduce((acc, [key, IconComponent]) => {
  acc[camelCaseToDash(key)] = IconComponent;
  return acc;
}, {} as Record<string, React.ReactNode>);

/**
 * Types
 */

interface IconProps {
  name: string;
}

interface SpecialIconProps extends IconProps {
  name: string;
  cornerIconName?: string;
}

/**
 * Commonly used icon names
 */

export const COMMON_ICON_NAMES: Record<string, string> = {
  ai_magic: 'sparkles',
  ai_workflow: 'document-ai',
  address_book: 'address-book',
  alert_warning_filled: 'alert-circle-filled',
  billing: 'credit-card',
  broken_file: 'file-broken',
  chat: 'message',
  click: 'click',
  close: 'x',
  close_small: 'x-filled',
  colors: 'color-swatch',
  copied: 'copy-check',
  daily: 'clock-share',
  description: 'notes',
  delete: 'trash-x',
  delete_filled: 'trash-x-filled',
  edit: 'edit',
  edit_off: 'edit-off',
  email: 'mail', // Tabler version
  empty: 'square-forbid-2',
  favorites: 'stars',
  field_work: 'farming-field-sun',
  file: 'file-description',
  group: 'users-group',
  harvest: 'vegetable-corn',
  image: 'photo',
  images: 'library-photo',
  info: 'info-circle',
  invoice: 'accounting-invoice-dollar',
  link_chevron: 'chevron-right',
  livestock: 'livestock-cow-body',
  livestock_life_cycle: 'monitor-heart-beat',
  livestock_tracking: 'tags',
  livestock_pasture: 'outdoors-landscape-meadow',
  livestock_healthcare: 'pets-hospital',
  lock: 'lock',
  lock_filled: 'lock-filled',
  logs: 'notes-book',
  market_receipt: 'farming-sell-vegetable',
  mobile: 'device-mobile',
  moderator: 'gavel',
  network_error: 'wifi-off',
  not_pinned: 'pinned-off',
  owner: 'crown',
  pensive: 'mood-sad-filled',
  pinned: 'pinned',
  phone: 'phone', // Tabler version
  plans: 'map',
  plus: 'plus',
  plus_circle: 'circle-plus-filled',
  post_harvest: 'farming-barn-silo',
  progress: 'progress',
  progress_check: 'progress-check',
  progress_error: 'progress-x',
  read: 'checklist',
  receipt: 'receipt-dollar',
  report: 'exclamation-circle',
  seeding: 'organic-seedling-grow',
  smile: 'confetti',
  settings: 'settings',
  shop_market: 'farmers-market-kiosk',
  shop_vendor: 'farmers-market-vendor',
  sms: 'device-mobile-message',
  snooze: 'zzz',
  success: 'circle-check',
  switch_organization_title: 'face-id-10',
  switch_organization: 'switch-account-1',
  timeout: 'clock-cancel',
  timeout_unban: 'clock-check',
  transplanting: 'organic-plant-grow',
  unread: 'mailbox',
  user: 'user',
  user_add: 'user-plus',
  user_blocked: 'user-x',
  user_deleted: 'user-off',
  your_account: 'user-circle',

  // AI Task types
  AI_TASK: 'task-list-check-2',

  // Arable types
  SEED: '',
  PLANTING: '',
  FIELD: '',
  HARVEST: '',
  POST_HARVEST: '',
  SALES: '',
  WATER: '',

  // Farmers Market types
  MARKET_RECEIPTS: 'farming-sell-vegetable',
  MARKET_OPERATIONS: '',

  // Livestock types
  SUPPLY_PURCHASE: '',
  LIVESTOCK_LIFE_CYCLE: '',
  LIVESTOCK_TRACKING: '',
  PASTURE_LAND_MANAGEMENT: '',
  LIVESTOCK_HEALTHCARE: '',
  LIVESTOCK_SALE: 'task-list-check-2',

  // AI_TASK - Icon Names for each AI task activity
  AI_SEND_MESSAGE: 'task-list-check-2',
	AI_REMINDER: 'task-list-check-2',
	AI_CHECK_IN: 'task-list-check-2',

  // ARABLE - Icon Names for each log activity
  OTHER_SUPPLY_PURCHASE_ACTIVITY: 'task-list-check-2',
  SEEDING: 'task-list-check-2',
  DIRECT_SEEDING: 'task-list-check-2',
  TRANSPLANTING: 'task-list-check-2',
  SEED_COMPLIANCE_NOTE: 'task-list-check-2',
  OTHER_TRANSPLANT_ACTIVITY: 'task-list-check-2',
  PREPARE_SOIL: 'task-list-check-2',
  IRRIGATION: 'task-list-check-2',
  FERTILIZATION_COMPOST: 'task-list-check-2',
  PROTECT_CROP: 'task-list-check-2',
  MONITOR_CROP: 'task-list-check-2',
  PRUNING: 'task-list-check-2',
  STRUCTURE_MAINTENANCE: 'task-list-check-2',
  PREPARE_HARVEST: 'task-list-check-2',
  OTHER_FIELD_ACTIVITY: 'task-list-check-2',
  HARVEST_CROP: 'task-list-check-2',
  HARVEST_COUNT: 'task-list-check-2',
  SORT_GRADE: 'task-list-check-2',
  YIELD_LOSS_ESTIMATE: 'task-list-check-2',
  OTHER_HARVEST_ACTIVITY: 'task-list-check-2',
  POST_HARVEST_HANDLING: 'task-list-check-2',
  POST_HARVEST_PACKAGING: 'task-list-check-2',
  COLD_STORAGE_TEMPERATURE: 'task-list-check-2',
  OTHER_POST_HARVEST_ACTIVITY: 'task-list-check-2',
  SALE_PRODUCE_ORDER: 'task-list-check-2',
  OTHER_SALE_ORDER: 'task-list-check-2',
  WATER_TESTING: 'task-list-check-2',
  OTHER_WATER_TESTING_ACTIVITY: 'task-list-check-2',

  // FARMERS MARKET - Icon Names for each log activity
  MARKET_CREDIT_RECEIPT: 'task-list-check-2',
  VENDOR_NOTES: 'task-list-check-2',
  EMPLOYEE_NOTES: 'task-list-check-2',
  FARMERS_MARKET_NOTES: 'task-list-check-2',

  // LIVESTOCK - Icon Names for each log activity
  FEED_PURCHASE: 'task-list-check-2',
  LIVESTOCK_PURCHASE: 'task-list-check-2',
  LIVESTOCK_BIRTH: 'task-list-check-2',
  LIVESTOCK_REPRODUCTION: 'task-list-check-2',
  LIVESTOCK_DEATH: 'task-list-check-2',
  OTHER_LIVESTOCK_LIFE_CYCLE_ACTIVITY: 'task-list-check-2',
  LIVESTOCK_GROUP_TRACKING: 'task-list-check-2',
  LIVESTOCK_PASTURE_TRACKING: 'task-list-check-2',
  LIVESTOCK_ROTATIONAL_GRAZING: 'task-list-check-2',
  OTHER_LIVESTOCK_TRACKING_ACTIVITY: 'task-list-check-2',
  PASTURE_SEEDING: 'task-list-check-2',
  FENCE_MAINTENANCE: 'task-list-check-2',
  WATER_SOURCE_MAINTENANCE: 'task-list-check-2',
  OTHER_PASTURE_LAND_MANAGEMENT_ACTIVITY: 'task-list-check-2',
  LIVESTOCK_VACCINATION: 'task-list-check-2',
  LIVESTOCK_SICK: 'task-list-check-2',
  LIVESTOCK_INJURY: 'task-list-check-2',
  LIVESTOCK_CULL: 'task-list-check-2',
  LIVESTOCK_TREATMENT: 'task-list-check-2',
  OTHER_LIVESTOCK_HEALTHCARE_ACTIVITY: 'task-list-check-2',
  OTHER_LIVESTOCK_SALE_ACTIVITY: 'task-list-check-2',
};

/**
 * Simple icon with a very basic fix
 */

export const Icon = memo((p: IconProps & {
  tryColor?: boolean;
}) => {
  const { name: iconName, tryColor } = p;
  const IconComponent = (
    (tryColor && ICON_MAP[iconName + '-color']) ||
    ICON_MAP[iconName]
  );

  if (!IconComponent) {
    console.warn('Icon: Unknown icon name:', iconName);
  }

  return IconComponent || null;
});

Icon.displayName = 'Icon';

/**
 * Special icons that aren't included in FA
 */

export const SpecialIcon = memo((p: SpecialIconProps) => {
  const { name } = p;
  const className = 'ic_special';

  switch (name) {
    case 'google':
      return (
        <img
          alt='Google logo'
          src='/img/google-icon.png'
          className={className}
        />
      );
    default:
      console.warn('SpecialIcon: Unknown icon name:', name);
  }

  return null;
});

SpecialIcon.displayName = 'SpecialIcon';
