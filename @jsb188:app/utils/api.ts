import i18n from '../i18n/';
import { getENVVariable } from '../main';
import type { ServerErrorObj } from '../types/app.d';

let AUTH_TOKEN: string | null = null;

/**
 * Global; save auth token to memory
 */

export function setAuthToken(token: string | null) {
  if (getENVVariable('IS_BROWSER')) {
    // Only set auth token if it's browser; we don't want to share it across users
    AUTH_TOKEN = token || null;
  }
}

/**
 * Global; get auth token for all API middleware use
 */

export function getAuthToken(): string | null {
  return getENVVariable('IS_BROWSER') ? AUTH_TOKEN : null;
}

/**
 * Helper; check if i18n exists for this error
 */

function i18nErrCodeExists(errorCode: string): boolean {
  return !!(i18n.has(`error.${errorCode}`) ||
    i18n.has(`error.${errorCode}_other`));
}

/**
 * Helper; normalize all errors from server
 */

export function normalizeServerError(error?: any): ServerErrorObj {
  let statusCode = 500;
  let errorCode;
  let errorValue;
  let iconName;
  let message;

  if (!error || error instanceof Error) {
    if (error?.message === 'Failed to fetch') {
      errorCode = 'network_error';
      iconName = 'wifi-off';
      message = i18n.t('error.network_error');
    }
  }

  if (!errorCode) {
    if (error?.errors?.length) {
      const loggedError = error.errors.find((gErr: ServerErrorObj) =>
        gErr.errorCode &&
        i18nErrCodeExists(gErr.errorCode)
      );

      if (loggedError) {
        statusCode = loggedError.statusCode;
        errorCode = loggedError.errorCode;
        errorValue = loggedError.variableWord;
      } else {
        statusCode = error.errors[0].statusCode;
        errorCode = error.errors[0].errorCode;
        errorValue = error.errors[0].variableWord;
      }
    }
  }

  if (!message) {
    if (i18nErrCodeExists(errorCode)) {
      message = i18n.t(`error.${errorCode}`, { value: errorValue, smart_count: Number(errorValue) });
    } else {
      message = i18n.t('error.unknown_error');
    }
  }

  if (
    getENVVariable('NODE_ENV') === 'development' &&
    message === i18n.t('error.unknown_error')
  ) {
    // Log for development so I can see what went wrong
    console.warn(error);
  }

  const title = i18n.has(`error.${errorCode}_title`) ? i18n.t(`error.${errorCode}_title`) : i18n.t('error.error');
  return {
    statusCode,
    errorCode,
    errorValue,
    iconName,
    title,
    message,
  };
}