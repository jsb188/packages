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
  account_profile: 'workflow-account-circle',
  account_add: 'single-neutral-actions-add',
  account_remove: 'single-neutral-actions-subtract',
  account_switch: 'switch-account-2',
  ai_avatar: 'reward-stars-4',
  ai_magic: 'reward-stars-3',
  ai_workflow: 'document-ai',
  address_book: 'address-book',
  alert_error: 'alert-circle',
  alert_warning_filled: 'alert-circle-filled',
  billing: 'credit-card',
  broken_file: 'database-warning',
  broken_link: 'link-broken-2',
  chat: 'message',
  click: 'click',
  close: 'x',
  close_thick: 'x-filled',
  copy: 'copy-1',
  daily: 'clock-share',
  description: 'notes-paper-text',
  delete: 'bin',
  add_line: 'pencil-write-3',
  remove_line: 'remove-tab',
  edit: 'pencil-write-2',
  edit_note: 'content-paper-edit',
  email_address: 'read-email-at',
  empty: 'square-forbid-2',
  cancel: 'circle-x',
  failed: 'circle-x',
  favorites: 'stars',
  field_work: 'farming-field-sun',
  file: 'file-description',
  generic_report: 'ui-webpage-check',
  team: 'workflow-teammate-circle',
  harvest: 'vegetable-corn',
  image: 'photo',
  images: 'library-photo',
  info: 'info-circle',
  invoice: 'accounting-invoice-dollar',
  link_chevron: 'chevron-right',
  expanded_chevron: 'chevron-down',
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
  server_outage: 'database-warning',
  not_pinned: 'pinned-off',
  org_info: 'office-building-double',
  owner: 'crown',
  pensive: 'mood-sad-filled',
  pinned: 'pinned',
  phone: 'phone', // Tabler version
  plans: 'map',
  plus: 'plus',
  plus_circle: 'circle-plus',
  plus_circle_filled: 'circle-plus-filled',
  post_harvest: 'farming-barn-silo',
  progress: 'progress',
  progress_check: 'progress-check',
  progress_error: 'progress-x',
  read: 'checklist',
  receipt: 'receipt-dollar',
  seeding: 'organic-seedling-grow',
  smile: 'confetti',
  settings: 'settings',
  shop_market: 'farmers-market-kiosk',
  shop_vendor: 'farmers-market-vendor',
  sms: 'device-mobile-message',
  snooze: 'zzz',
  success: 'circle-check',
  login_related: 'face-id-10',
  switch_organizations: 'switch-account-1',
  time_ran_out: 'time-stopwatch-quarter',
  timeout: 'clock-cancel',
  timeout_unban: 'clock-check',
  transplanting: 'organic-plant-grow',
  unread: 'mailbox',
  user: 'user',
  verified: 'check-badge',
  certificate: 'document-license',
  foreign_growers: 'shipment-international',
  growers: 'indoor-plant-house',
  write_log: 'content-paper-edit',
  time_recurring: 'time-daily-2',

  // Org departments
  DIRECTORY_ACCOUNTS_RECEIVABLE: 'receipt-dollar',
	DIRECTORY_PRIMARY_CONTACT: 'single-neutral-id-card-4',
	DIRECTORY_SALES: 'tool-box',
	DIRECTORY_CUSTOMER_SERVICE: 'contact-us-email',
	DIRECTORY_SHIPPING_RECEIVING: 'shipment-in-transit',
	DIRECTORY_OTHER: 'single-neutral-phone-book',

  // Org features
  NORMAL_LOGGING: 'notes-tasks',
  FOOD_SAFETY: 'washing-hand',
  GLOBAL_GAP: 'ui-webpage-check',
  ORGANIC_CERTIFICATION: 'ui-webpage-check',
  CAL_EVENTS: 'calendar-3',
  CAL_EVENTS_ATTENDANCE: 'task-list-check-1',
  CAL_EVENTS_LOAD_LIST: 'farmers-market-kiosk',
  LIVESTOCK_MANAGEMENT: 'outdoors-horse',

  // Operation types
  ARABLE: 'farming-barn-silo',
  FARMERS_MARKET: 'farmers-market-kiosk',
  LIVESTOCK: 'outdoors-horse',
  GROWER_NETWORK: 'wine-grapes',
  RESTAURANT: 'restaurant-dishes',
  VENDOR: 'farmers-market-vendor',

  // AI Task types
  AI_TASK: 'task-list-check-2',

  // Arable types
  SEED: 'accounting-invoice-dollar',
  PLANTING: 'organic-plant-grow',
  FIELD: 'farming-barn-sun',
  HARVEST: 'harvest-product',
  POST_HARVEST: 'warehouse-storage',
  SALES: 'receipt-dollar',
  WATER: 'organic-flask',

  // Arable - Food Safety types
  HYGIENE: 'locker-room-wash-hands-1',
  SANITATION: 'cleanser-scrubbing-1',
  MATERIALS: 'shipment-container',
  BIOSECURITY: 'ecology-leaf-shield',
  EMPLOYEES: 'avatar-farmer-man-4',

  // Farmers Market types
  MARKET_RECEIPTS: 'farming-sell-vegetable',
  MARKET_OPERATIONS: 'notes-tasks',

  // Livestock types
  SUPPLY_PURCHASE: 'accounting-invoice-dollar',
  LIVESTOCK_LIFE_CYCLE: 'love-it',
  LIVESTOCK_TRACKING: 'range-cow-2',
  PASTURE_LAND_MANAGEMENT: 'outdoors-landscape-meadow',
  LIVESTOCK_HEALTHCARE: 'pets-hospital',
  LIVESTOCK_SALE: 'receipt-dollar',

  // AI_TASK - Icon Names for each AI task activity
  AI_SEND_MESSAGE: 'email-action-send-1',
	AI_REMINDER: 'task-list-clock',
  AI_SCHEDULED_TASK: 'calendar-date-mark-circle',

  // ARABLE - Icon Names for each log activity
  SEED_PURCHASE_INFO: 'accounting-invoice-dollar',
  OTHER_SUPPLY_PURCHASE_ACTIVITY: 'accounting-invoice-dollar',
  SEEDING: 'gardening-seed-bag',
  DIRECT_SEEDING: 'agriculture-machine-seeder',
  GREENHOUSE_SEEDING: 'indoor-plant-house',
  TRANSPLANTING: 'organic-plant-grow',
  SEED_COMPLIANCE_NOTE: 'notes-tasks',
  OTHER_TRANSPLANT_ACTIVITY: 'organic-plant-grow',
  PREPARE_SOIL: 'product-growth-tree-box',
  IRRIGATION: 'gardening-sprinkler',
  FERTILIZATION_COMPOST: 'organic-bag-leaf',
  PROTECT_CROP: 'gardening-tools-1',
  MONITOR_CROP: 'farming-barn-sun',
  PRUNING: 'gardening-scissors',
  STRUCTURE_MAINTENANCE: 'barbed-wire-fence',
  PREPARE_HARVEST: 'protein-gluten-wheat',
  OTHER_FIELD_ACTIVITY: 'notes-tasks',
  HARVEST_CROP: 'harvest-product',
  HARVEST_COUNT: 'harvest-product',
  SORT_GRADE: 'harvest-product',
  YIELD_LOSS_ESTIMATE: 'crop-info-biotech-1',
  OTHER_HARVEST_ACTIVITY: 'crop-info-biotech-1',
  POST_HARVEST_HANDLING: 'warehouse-storage',
  POST_HARVEST_PACKAGING: 'warehouse-storage',
  COLD_STORAGE_TEMPERATURE: 'temperature-control-warehouse-1',
  OTHER_POST_HARVEST_ACTIVITY: 'warehouse-storage',
  SALE_PRODUCE_ORDER: 'receipt-dollar',
  OTHER_SALE_ORDER: 'receipt-dollar',
  WATER_TESTING: 'organic-flask',
  OTHER_WATER_TESTING_ACTIVITY: 'organic-flask',
  HYGIENE_PROCEDURE: 'locker-room-wash-hands-1',
  CONTAMINANT_RISK: 'petri-dish-2',
  BODILY_FLUID_CONTAMINATION: 'cleaning-bucket-cloth',
  SMOKING_EATING_DRINKING_CONTROL: 'allowances-no-smoking',
  PPE_USAGE: 'soccer-goalkeeper-glove-1',
  SANITATION_RISK: 'bacteria-toilet',
	SANITATION_CONSTRUCTION_MAINTENANCE: 'home-improvement-14',
  SANITATION_CLEANING: 'cleanser-scrubbing-1',
  SANITATION_PEST_CONTROL: 'pets-tick-free',
  EQUIPMENTS_MATERIALS_RISK: 'shipment-container',
  EQUIPMENTS_MATERIALS_CLEANING: 'anti-bacterial-1',
  ENVIRONMENT_RISK: 'outdoors-tree-valley',
  EMPLOYEE_ORIENTATION: 'recruiting-employee-selection',
  EMPLOYEE_TRAINING: 'single-man-statics-3',
  SICK_EMPLOYEE: 'medical-condition-flu',
  EMPLOYEE_INJURED: 'bandage-shoulder-head',
  EMPLOYEE_NOTES: 'notes-tasks',
  OPERATION_NOTES: 'notes-tasks',

  // FARMERS MARKET - Icon Names for each log activity
  MARKET_CREDIT_RECEIPT: 'farming-sell-vegetable',
  MARKET_ATTENDANCE: 'notes-tasks',
  MARKET_LOAD_LIST: 'notes-tasks',
  VENDOR_NOTES: 'notes-tasks',
  FARMERS_MARKET_NOTES: 'notes-tasks',

  // LIVESTOCK - Icon Names for each log activity
  FEED_PURCHASE: 'accounting-invoice-dollar',
  LIVESTOCK_PURCHASE: 'accounting-invoice-dollar',
  LIVESTOCK_BIRTH: 'love-it',
  LIVESTOCK_REPRODUCTION: 'love-it',
  LIVESTOCK_DEATH: 'love-it-break',
  OTHER_LIVESTOCK_LIFE_CYCLE_ACTIVITY: 'love-it',
  LIVESTOCK_GROUP_TRACKING: 'range-cow-2',
  LIVESTOCK_PASTURE_TRACKING: 'range-cow-2',
  LIVESTOCK_ROTATIONAL_GRAZING: 'range-cow-2',
  OTHER_LIVESTOCK_TRACKING_ACTIVITY: 'range-cow-2',
  PASTURE_SEEDING: 'outdoors-landscape-meadow',
  FENCE_MAINTENANCE: 'barbed-wire-fence',
  WATER_SOURCE_MAINTENANCE: 'water-protection-drop-1',
  OTHER_PASTURE_LAND_MANAGEMENT_ACTIVITY: 'outdoors-landscape-meadow',
  LIVESTOCK_VACCINATION: 'pets-hospital',
  LIVESTOCK_SICK: 'pets-hospital',
  LIVESTOCK_INJURY: 'pets-hospital',
  LIVESTOCK_CULL: 'pets-hospital',
  LIVESTOCK_TREATMENT: 'pets-hospital',
  OTHER_LIVESTOCK_HEALTHCARE_ACTIVITY: 'pets-hospital',
  OTHER_LIVESTOCK_SALE_ACTIVITY: 'receipt-dollar',
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
 * Icon representing each file type
 */

export function getFileTypeIconName(contentType: string, fileName?: string | null): string {
  switch (contentType) {
    case 'text/plain':
    case 'application/pdf':
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'file-document';
    case 'application/vnd.rar':
    case 'application/zip':
    case 'application/x-zip-compressed':
    case 'multipart/x-zip':
      return 'file-zip';
    case 'text/css':
    case 'text/csv':
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'file-sheets';
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/gif':
    case 'image/avif':
    case 'image/tiff':
    case 'image/webp':
    case 'image/png':
      return 'file-image';
    default:
  }

  switch (fileName?.toLowerCase().split('.').pop()) {
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'css':
      return 'file-sheets';
    case 'jpeg':
    case 'jpg':
    case 'gif':
    case 'avif':
    case 'tiff':
    case 'webp':
    case 'png':
      return 'file-image';
    case 'rar':
    case 'zip':
      return 'file-zip';
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    default:
      return 'file-document';
  }
}

export const FileTypeIcon = memo((p: {
  iconName?: string;
  contentType: string;
  fileName?: string | null; // extension may also be used
}) => {
  return <Icon name={p.iconName || getFileTypeIconName(p.contentType, p.fileName)} />;
});

FileTypeIcon.displayName = 'FileTypeIcon';

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
