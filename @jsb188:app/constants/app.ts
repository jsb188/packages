
// DOM element names (ids)

export const DOM_IDS = {
  sidebarInput: 'sidebar_input',
  mainFocusTextarea: 'main_tx',
  mainBodyScrollArea: 'main_scr',
  popOverScrollArea: 'pop_over_scr',
};

// Common, repeatable classnames

export const COMMON_CLASSNAMES = {
  listContainer: 'cw lg responsive px_lg pt_md pb_lg',
  modalScreenSplitForm: 'h_top px_md pb_md gap_md',
  modalScreenSplitContent: 'h_top px_md pb_md gap_lg',
  modalScreenHeading: 'pt_md pb_df ft_normal ft_xs cl_darker_2 ls_2',
};

// Local storage

export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: 'AT', // There's no ":", so this is used as-is
  LAST_VERSION: 'LV:', // ":" at end means it's a prefix
  CURRENT_ACCOUNT_ID: 'CU:',

  // Settings
  LIGHT_MODE: 'LM:',
} as Record<string, string>;

// Support e-mails

export const SUPPORT_EMAILS = {
  MARKETDAY: 'hello@marketday.ai'
} as Record<string, string>;

// Social media

export const SOCIAL_URLS = {
  MARKETDAY: {
    x: 'https://x.com/?',
    x_username: '?',
  }
} as Record<string, {
  x: string;
  x_username: string;
}>;

// Languages

export const SUPPORTED_LANGUAGES = [
  'en',
  'es',
];

// Colors

export const COLORS = [
  'red',
  'orange',
  'brown',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
  'zinc',
  'stone'
];
