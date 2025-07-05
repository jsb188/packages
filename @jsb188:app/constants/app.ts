
// Big planet constants

export const NOTIF_EXPIRE_DAYS = 30;

// DOM element names (ids)

export const DOM_IDS = {
  sidebarInput: 'sidebar_input',
  mainFocusTextarea: 'main_tx',
  mainBodyScrollArea: 'main_scr',
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
  marketday: 'hello@marketday.ai'
} as Record<string, string>;

// Social media

export const SOCIAL_URLS = {
  big_planet: {
    x: 'https://x.com/bigplanetai',
    x_username: 'BigPlanetAI',
  },
  cosmic: {
    x: 'https://x.com/bigplanetai',
    x_username: 'BigPlanetAI',
  }
} as Record<string, {
  x: string;
  x_username: string;
}>;
