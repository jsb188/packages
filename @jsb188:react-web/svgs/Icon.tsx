import { Children, isValidElement, memo, type ReactNode } from 'react';
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

const ICON_PATH_DATA_MAP = new Map<string, string[]>();

/**
 * Types
 */

interface IconProps {
  name: string;
  backupName?: string; // This is useful when name is a colroed icon but colroed icon doesn't exist for that icon
}

interface SpecialIconProps extends IconProps {
  name: string;
  cornerIconName?: string;
}

type IconPathProps = {
  children?: ReactNode;
  d?: unknown;
  stroke?: unknown;
};

/**
 * Brand icons
 */

export const BRAND_ICONS = {
  google: '/img/google-icon.png',
  square: '/img/square-icon.svg',
};

/**
 * Commonly used icon names
 */

export const COMMON_ICON_NAMES: Record<string, string> = {
  account_profile: 'workflow-account-circle',
  account_add: 'single-neutral-actions-add',
  account_remove: 'single-neutral-actions-subtract',
  account_switch: 'switch-account-2',
  ai_avatar: 'reward-stars-4',
  ai_inbox: 'read-email-circle',
  ai_workflow: 'document-ai',
  alert_error: 'alert-circle',
  alert_warning_filled: 'alert-circle-filled',
  default_page_error: 'folder-warning',
  billing: 'credit-card',
  broken_file: 'server-warning-1',
  broken_link: 'link-broken-2',
  chat: 'message',
  click: 'click',
  close: 'x',
  close_thick: 'x-filled',
  column_insert: 'column-insert',
  copy: 'copy-1',
  daily: 'clock-share',
  description: 'notes-paper-text',
  delete: 'bin',
  delete_column: 'column-delete',
  delete_row: 'row-delete',
  enter_button: 'keyboard-return',
  upload_button: 'upload-button',
  add_line: 'pencil-write-3',
  remove_line: 'remove-tab',
  app_connections: 'add-widgets',
  view_document: 'common-file-view',
  edit_document: 'common-file-text-edit',
  edit: 'pencil-write-2',
  edit_note: 'content-paper-edit',
  email_address: 'read-email-at',
  empty: 'square-forbid-2',
  remove: 'remove-circle', // This is same as circle-x but bigger
  cancel: 'circle-x',
  failed: 'circle-x',
  favorites: 'stars',
  field_work: 'farming-field-sun',
  file: 'file-description',
  format_selected_cells: 'text-format-1',
  generic_report: 'ui-webpage-check',
  team: 'workflow-teammate-circle',
  harvest: 'vegetable-corn',
  image: 'photo',
  images: 'library-photo',
  inbound_contacts: 'single-neutral-phone-book',
  info: 'info-circle',
  insert_from_data_table: 'calendar-2',
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
  server_outage: 'server-warning-1',
  not_pinned: 'pinned-off',
  org_info: 'office-building-double',
  site_locations: 'map-marks',
  location: 'pin-location-1',
  paste: 'copy-paste',
  pensive: 'mood-sad-filled',
  pinned: 'pinned',
  phone: 'phone', // Tabler version
  phone_change: 'phone-circle',
  phone_type: 'phone-type',
  plus: 'plus',
  plus_circle: 'circle-plus',
  plus_circle_filled: 'circle-plus-filled',
  post_harvest: 'farming-barn-silo',
  progress: 'progress',
  progress_check: 'progress-check',
  progress_error: 'progress-x',
  receipt: 'receipt-dollar',
  row_insert: 'row-insert',
  seeding: 'organic-seedling-grow',
  settings: 'settings',
  shop_market: 'farmers-market-kiosk',
  shop_vendor: 'farmers-market-vendor',
  sms: 'device-mobile-message',
  snooze: 'zzz',
  stylize_selected_cells: 'color-palette-sample',
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
  upload: 'upload-bottom',
  general_workflow: 'workflow-teamwork-cog-hand',
  create_data_table: 'database-add-color',
  create_sheet: 'layers-grid-add-color',
  data_table: 'database-2',
  delete_data_table: 'database-remove-color',
  delete_sheet: 'layers-grid-remove-color',
  workspace: 'calendar-2-color',
  sheet: 'workflow-data-table-2',
  sheet_data_table_populate: 'database-sync',
  not_found_sheet: 'layers-grid-warning',
  not_found_data_table: 'database-warning',

  // Org departments
  DIRECTORY_ACCOUNTS_RECEIVABLE: 'receipt-dollar',
	DIRECTORY_PRIMARY_CONTACT: 'single-neutral-id-card-4',
	DIRECTORY_SALES: 'tool-box',
	DIRECTORY_CUSTOMER_SERVICE: 'contact-us-email',
	DIRECTORY_SHIPPING_RECEIVING: 'shipment-in-transit',
	DIRECTORY_OTHER: 'single-neutral-actions-chat',

  // Org features
  NORMAL_LOGGING: 'notes-tasks',
  SITE_INSPECTION: 'task-list-search',
  FOOD_SAFETY: 'washing-hand',
  GLOBAL_GAP: 'ui-webpage-check',
  LIVESTOCK_MANAGEMENT: 'outdoors-horse',

  // Operation types
  ARABLE: 'farming-barn-silo',
  FARMERS_MARKET: 'farmers-market-kiosk',
  LIVESTOCK: 'outdoors-horse',
  GROWER_NETWORK: 'office-outdoors',
  RESTAURANT: 'restaurant-dishes',
  VENDOR: 'farmers-market-vendor',
  WHOLESALE_FOOD: 'question-circle-color',
  UNKNOWN: 'question-circle-color',

  // Certification types
  COMPLIANCE_ORGANIC: 'organic-plant',
  COMPLIANCE_INSURANCE: 'document-license',
  COMPLIANCE_PRODUCERS_CERTIFICATE: 'locally-grown-2',
  COMPLIANCE_MILK_HANDLER_LICENSE: 'milk-carton',
  COMPLIANCE_EGG_HANDLER_LICENSE: 'animal-products-eggs',
  COMPLIANCE_NURSERY_LICENSE: 'orchid',

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
  EMPLOYEE: 'avatar-farmer-man-4',

  // Farmers Market types
  MARKET_RECEIPT: 'farming-sell-vegetable',
  MARKET_OPERATION: 'notes-tasks',

  // Grower Network types
  WORKER_PRACTICE: 'avatar-farmer-man-4',
  PRODUCTION_INPUT: 'organic-flask',
  OPERATION: 'notes-tasks',

  // Livestock types
  SUPPLY_PURCHASE: 'accounting-invoice-dollar',
  LIVESTOCK_LIFE_CYCLE: 'love-it',
  LIVESTOCK_TRACKING: 'range-cow-2',
  PASTURE_LAND_MANAGEMENT: 'outdoors-landscape-meadow',
  LIVESTOCK_HEALTHCARE: 'pets-hospital',
  LIVESTOCK_SALE: 'receipt-dollar',

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
  OPERATION_NOTE: 'notes-tasks',

  // FARMERS MARKET - Icon Names for each log activity
  MARKET_CREDIT_RECEIPT: 'farming-sell-vegetable',
  MARKET_ATTENDANCE: 'notes-tasks',
  MARKET_LOAD_LIST: 'notes-tasks',

  // GROWER NETWORK - Icon Names for each log activity
  SANITATION_PRACTICE: 'cleanser-scrubbing-1',
  PERSONNEL_PRACTICE: 'single-man-statics-3',
  EQUIPMENT_MATERIAL: 'shipment-container',
  PACKAGING_STORAGE: 'warehouse-storage',
  ENVIRONMENT: 'outdoors-tree-valley',
  FIELD_CONDITION: 'farming-barn-sun',
  ADJACENT_LAND: 'barbed-wire-fence',
  WATER_INPUT: 'water-protection-drop-1',
  CHEMICAL_INPUT: 'anti-bacterial-1',
  FERTILIZER_INPUT: 'organic-bag-leaf',
  RECORDKEEPING: 'notes-tasks',
  FACILITIES: 'warehouse-storage',

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
  const { name: iconName, backupName, tryColor } = p;
  const IconComponent = (
    (tryColor && ICON_MAP[iconName + '-color']) ||
    ICON_MAP[iconName] ||
    (tryColor && ICON_MAP[backupName + '-color']) ||
    ICON_MAP[backupName || '']
  );

  if (!IconComponent) {
    console.warn('Icon: Unknown icon name:', iconName);
  }

  return IconComponent || null;
});

Icon.displayName = 'Icon';

/*
 * Add drawable SVG path data from one React icon node into a flat path list.
 */
function addIconSVGPathDataFromNode(node: ReactNode, pathData: string[]) {
  Children.forEach(node, (child) => {
    if (!isValidElement<IconPathProps>(child)) {
      return;
    }

    if (typeof child.props.d === 'string' && child.props.stroke !== 'none') {
      pathData.push(child.props.d);
    }

    if (child.props.children) {
      addIconSVGPathDataFromNode(child.props.children, pathData);
    }
  });
}

/*
 * Return SVG path data for an icon name using IconSVGs as the source of truth.
 */
export function getIconSVGPathData(name: string, backupName?: string) {
  const iconKey = ICON_MAP[name] ? name : backupName || '';
  const cachedPathData = ICON_PATH_DATA_MAP.get(iconKey);
  if (cachedPathData) {
    return cachedPathData;
  }

  const IconComponent = ICON_MAP[iconKey];
  const pathData: string[] = [];

  if (IconComponent) {
    addIconSVGPathDataFromNode(IconComponent, pathData);
  }

  ICON_PATH_DATA_MAP.set(iconKey, pathData);

  return pathData;
}

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
          src={BRAND_ICONS.google}
          className={className}
        />
      );
    default:
      console.warn('SpecialIcon: Unknown icon name:', name);
  }

  return null;
});

SpecialIcon.displayName = 'SpecialIcon';
