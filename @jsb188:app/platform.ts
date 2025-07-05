
const PLATFORM_HANDLERS: Record<string, any> = {};

/**
 * Get current platform
 */

export function getPlatform(): 'WEB' | 'MOBILE' | 'UNKNOWN' {
  return PLATFORM_HANDLERS?.getPlatform?.() || 'UNKNOWN';
}

/**
 * Fetch last used login token
 */

export const fetchAuthToken = (cb: (token: string | null) => void): void => {
  return PLATFORM_HANDLERS?.fetchAuthToken?.(cb) || cb(null);
};

/**
 * Delete auth token
 */

export const deleteAuthToken = (): void => {
  return PLATFORM_HANDLERS?.deleteAuthToken?.();
};

/**
 * Save token after login
 */

export function saveAuthTokenToPlatform(token: string, cb: () => void) {
  return PLATFORM_HANDLERS?.saveAuthTokenToPlatform?.(token, cb) || cb();
}

/**
 * Clear platform and app specific (local API) cache
 * Change this based on what the app uses
 */

export function clearAppCache() {
  return PLATFORM_HANDLERS?.clearAppCache?.();
}

/**
 * Fetch last used light mode setting
 */

export const fetchLightModeSetting = (
  accountId: number | null,
  cb: (lightMode: string) => void,
): void => {
  return PLATFORM_HANDLERS?.fetchLightModeSetting?.(accountId, cb) || cb('SYSTEM');
};

/**
 * Get correct platform
 */

export function getOS() {
  return PLATFORM_HANDLERS?.getOS?.();
}

/**
 * Update theme
 */

export function updateAppTheme(lightMode: string, theme: string) {
  return PLATFORM_HANDLERS?.updateAppTheme?.(lightMode, theme);
}

/**
 * Get the last version of app
 */

export function getLocalLastVersion(accountId: string) {
  return PLATFORM_HANDLERS?.getLocalLastVersion?.(accountId);
}

/**
 * Save the last version of app
 */

export function saveLocalLastVersion(accountId: string, version: string) {
  return PLATFORM_HANDLERS?.saveLocalLastVersion?.(accountId, version);
}

/**
 * Get the necessary Object data for file input
 */

export function getFileInputObject(fileInput: File) {
  return PLATFORM_HANDLERS?.getFileInputObject?.(fileInput) || fileInput;
}

/**
 * Get buffer data from file
 */

export function getBufferDataFromFile(file: any) {
  return PLATFORM_HANDLERS?.getBufferDataFromFile?.(file) || file;
}

/**
 * Check if system is dark mode
 */

export function isSystemDarkMode() {
  return PLATFORM_HANDLERS?.isSystemDarkMode?.();
}

/**
 * Register platform specific handlers
 */

export function registerPlatformHandlers(handlers: Record<string, any>) {
  for (const key in handlers) {
    if (
      Object.prototype.hasOwnProperty.call(handlers, key) &&
      typeof handlers[key] === 'function'
    ) {
      PLATFORM_HANDLERS[key] = handlers[key];
    }
  }
}
