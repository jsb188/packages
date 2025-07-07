import { clearAppCache, fetchLightModeSetting, isSystemDarkMode, saveAuthTokenToPlatform } from '@jsb188/app/platform';
import type { AccountData, AccountSettings, AuthenticationData, LightModeEnum } from '@jsb188/app/types/auth.d';
import { setAuthToken } from '@jsb188/app/utils/api';
import { guessFirstName, buildSingleText } from '@jsb188/app/utils/string';
import { createContext, useContext } from 'react';

/**
 * Type; Reducer action for App Context
 */

type AppContextAction = {
  __type: (
    // App initialization
    | 'APP_INIT'
    // Auth setup
    | 'APP_LOGIN'
    | 'APP_GUEST'
    | 'APP_EDIT_AUTH'
    | 'APP_EDIT_ACCOUNT'
    // Account theme
    | 'APP_THEME'
    | 'APP_SYSTEM_LIGHT_MODE'
    | 'APP_LIGHT_MODE'
    // App events
    | 'APP_KEY_DOWN'
  );
  data?: any;
};

export type AppContextDispatch = (action: AppContextAction) => void;

/**
 * Types
 */

export type AppAppearanceType = {
  realLightMode: LightModeEnum;
  lightMode: LightModeEnum;
  previewLightMode: LightModeEnum;
  previewTheme: string | null;
};

export type AppContextData = {
  // Required for app
  init: 0 | 1 | 2; // 0 = not initialized,; 1 = loading; 2 = initialized
  authorization: string; // This is token
  networkError: boolean;

  // Authentication data
  account: AccountData | null;
  primaryOrganizationId: string | null;

  // Account settings & state
  settings: AccountSettings;
  activated: boolean;
  hasPassword: boolean;
  webVersion: string | null;

  // Preview theme overrides active theme
  systemLightMode: 'LIGHT' | 'DARK';
  previewLightMode: LightModeEnum | null;
  previewTheme: string | null;

  // This needs to get migrated to Jotai
  keyDown: {
    metaKey: boolean;
    pressed: string | null;
    alert: boolean;
    modal: boolean;
  };
};

/**
 * Context default values
 */

export const DEFAULT_APP_CONTEXT = {
  init: 0,
  authorization: '',
  networkError: false,

  account: null,
  primaryOrganizationId: null,

  settings: {
    theme: null,
    lightMode: 'LIGHT',
    timeZone: null,
    showSelfAvatar: true,
    isBubbleOther: false,
    showOtherAvatar: false,
  },
  activated: false,
  hasPassword: false,
  webVersion: null,

  systemLightMode: 'LIGHT',
  previewLightMode: null,
  previewTheme: null,

  keyDown: {
    metaKey: false,
    pressed: null,
    alert: false,
    modal: false,
  }
} as AppContextData;

/**
 * Helper for light mode
 */

function ensureLightModeSetting(lightMode?: LightModeEnum): LightModeEnum {
  return lightMode && ['LIGHT', 'DARK', 'SYSTEM'].includes(lightMode || '') ? lightMode : 'LIGHT';
}

/**
 * App log in with Promise
 */

export function onAccountLogin(auth: any, dispatchApp: AppContextDispatch, otherCB?: (auth: any) => void) {
  if (auth && auth?.token && auth.activated && auth.account) {
    console.log('.. 🥝 logged into account ..');

    saveAuthTokenToPlatform(auth.token, () => {
      clearAppCache();
      dispatchApp({
        __type: 'APP_LOGIN',
        data: auth,
      });

      if (otherCB) {
        otherCB(auth);
      }
    });
  } else {
    console.log(auth);
    console.warn('Developer error in onAccountLogin()');
  }
}

/**
 * App guest init
 */

export function onGuestInit(error: any, dispatchApp: AppContextDispatch) {
  fetchLightModeSetting(null, (lightMode) => {
    dispatchApp({
      __type: 'APP_GUEST',
      data: {
        error,
        lightMode,
      },
    });
  });
}

/**
 * Get active/current or preview theme
 */

export function getTheme(
  appState: AppContextData,
  priority: 'PREVIEW' | 'ACCOUNT' | 'ACTIVE'
) {
  let lightMode = appState.previewLightMode || appState.settings.lightMode;
  if (lightMode === 'SYSTEM') {
    lightMode = appState.systemLightMode;
  }

  const theme = (
    (priority === 'PREVIEW' && appState.previewTheme) ||
    appState.settings.theme ||
    ''
  );

  return {
    lightMode,
    theme,
  };
}

/**
 * Get theme; but prioritize preview theme
 */

export function getPreviewAppearance(appState: AppContextData) {
  let realLightMode = appState.previewLightMode || appState.settings.lightMode;
  if (realLightMode === 'SYSTEM') {
    realLightMode = appState.systemLightMode;
  }

  return {
    realLightMode,
    lightMode: appState.settings.lightMode,
    previewLightMode: appState.previewLightMode,
    previewTheme: appState.previewTheme,
  };
}

/**
 * Merge sign in mutation auth values to context
 */

export function mergeAuthToDefaultValues(
  auth?: AuthenticationData | null,
  authToken?: string | null,
) {
  if (auth?.token && auth?.account?.id) {
    let systemLightMode = 'LIGHT';
    if (isSystemDarkMode()) {
      systemLightMode = 'DARK';
    }

    setAuthToken(auth.token);

    const authSettings = {
      ...DEFAULT_APP_CONTEXT.settings,
      ...auth.settings
    };

    authSettings.lightMode = ensureLightModeSetting(authSettings.lightMode);

    return {
      ...DEFAULT_APP_CONTEXT,
      init: 1, // Always 1 because we're always using SSR for authentication
      authorization: auth.token,
      account: auth.account,
      primaryOrganizationId: auth.primaryOrganizationId || null,
      settings: authSettings,
      hasPassword: auth.hasPassword,
      webVersion: auth.webVersion,

      // Theme
      systemLightMode,
      previewLightMode: null,
      previewTheme: null,
    };
  } else if (authToken) {
    setAuthToken(authToken);
    return {
      ...DEFAULT_APP_CONTEXT,
      authorization: authToken || ''
    };
  }

  setAuthToken(null);
  return DEFAULT_APP_CONTEXT;
}

/**
 * App reducer
 */

export const appReducer = (state: AppContextData, action: AppContextAction) => {
  const { __type, data } = action;

  switch (__type) {
    case 'APP_INIT': {
      return {
        ...state,
        init: state.init === 1 ? 2 : 1,
      };
    }
    case 'APP_LOGIN': {
      return mergeAuthToDefaultValues(data);
    }
    case 'APP_GUEST': {
      const networkError = data.error?.errorCode === 'network_error';
      if (networkError) {
        console.log('.. ❌ network error ..');
      } else {
        console.log('.. 🥝 guest entered ..');
      }

      clearAppCache();
      setAuthToken(null);

      return {
        ...DEFAULT_APP_CONTEXT,
        init: 2,
        authorization: '',
        networkError,

        // Theme
        previewLightMode: null,
        previewTheme: null,
      };
    }
    case 'APP_EDIT_AUTH': {
      if (data.id === state.account?.id) {
        return {
          ...state,
          hasPassword: typeof data.hasPassword === 'boolean' ? data.hasPassword : state.hasPassword,
        };
      }
      return state;
    }
    case 'APP_EDIT_ACCOUNT': {
      if (data.id === state.account?.id) {
        return {
          ...state,

          // Account
          account: {
            ...state.account,
            ...data,
            plus: !data.plus ? state.account?.plus : {
              ...state.account?.plus,
              ...data.plus,
            },
          },
          settings: {
            ...DEFAULT_APP_CONTEXT.settings,
            ...data.settings,
          }
        };
      }
      return state;
    }
    case 'APP_THEME': {
      if (!data?.preview) {
        // Active theme
        return {
          ...state,
          previewTheme: null,
        };
      }

      // Is preview theme
      return {
        ...state,
        previewTheme: data.theme,
      };
    }
    case 'APP_LIGHT_MODE': {
      if (!data.lightMode && !data.preview) {
        console.warn('Developer error in setLightMode(): You cannot set active lightMode to null.');
        return state;
      } else if (data.preview) {
        return {
          ...state,
          previewLightMode: data.lightMode,
        };
      }

      return {
        ...state,
        previewLightMode: null,
      };
    }
    case 'APP_SYSTEM_LIGHT_MODE': {
      return {
        ...state,
        systemLightMode: data.lightMode,
      };
    }
    case 'APP_KEY_DOWN': {
      if (typeof data.pressed !=='string' && data.pressed !== null) {
        return state;
      }

      return {
        ...state,
        keyDown: {
          ...state.keyDown,
          ...data,
        }
      };
    }
    default:
      throw new Error('App Reducer Error: [' + __type + ']');
  }
};

export const AppContext = createContext({
  appState: DEFAULT_APP_CONTEXT as AppContextData,
  dispatchApp: (() => {
    console.warn('AppContext has been re-initialized due to hot refresh.');
  }) as AppContextDispatch
});

/**
 * Use current account
 */

export function useCurrentAccount() {
  const { appState: { activated, hasPassword, webVersion, account, settings, primaryOrganizationId, ...other } } = useContext(AppContext);
  const hasName = !!account?.profile?.firstName || !!account?.profile?.lastName;
  const fullName = buildSingleText([account?.profile?.firstName, account?.profile?.lastName], ' ');
  const displayName = guessFirstName(fullName, 8);

  return {
    // App state
    account,
    settings,
    activated,
    hasPassword,
    webVersion,

    // Computed
    isLoggedIn: !!account?.id,
    hasName,
    fullName,
    displayName,
    labelName: displayName || account?.email?.address || '?',
    primaryOrganizationId
  };
}

/**
 * Check if logged in
 */

export function useIsLoggedIn() {
  const { appState: { account } } = useContext(AppContext);
  return !!account?.id;
}
