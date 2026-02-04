import { getENVVariable } from '@jsb188/app';
import type { ServerErrorObj } from '@jsb188/app/types/app.d.ts';

const TIME_TRACKER = new Map();

/**
 * Check if data should be refetched based on time
 */

export function checkIfNeedsRefetch(qryName: string, id: string, threshold: number = 3.6e+6): boolean {
  const lastFetched = TIME_TRACKER.get(`${qryName}_${id}`);
  if (!lastFetched) {
    return true;
  }

  const now = Date.now();
  const diff = now - lastFetched;

  return diff > threshold;
}

/**
 * Set fetched time
 */

export function setFetchedTime(qryName: string, id: string, setOnlyIfUndefined: boolean = false) {
  const key = `${qryName}_${id}`;
  if (
    !setOnlyIfUndefined ||
    !TIME_TRACKER.get(key)
  ) {
    TIME_TRACKER.set(key, Date.now());
  }
}

/**
 * Helper; check if normalized error is an error from the server (such as network error)
 */

export function isServerError(error: ServerErrorObj): boolean {
  return !!error && (
    error.statusCode === 500 ||
    error.errorCode === '30000' ||
    error.errorCode === 'network_error'
  );
}

/**
 * Helper; check if error is network or developer error
 */

export function isServerErrorGQL(apiResult: any): boolean {
  return (
    apiResult?.errors?.find((e: ServerErrorObj) => e.errorCode === '30000') ||
    apiResult?.error?.errorCode === 'network_error'
  );
}

/**
 * Headers for all network requests
 */

export function apiRequestHeaders(authorization?: string | null, ipAddress?: string | null): Headers {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    api_key: String(getENVVariable('GQL_API_KEY') || ''),
    origin: String(getENVVariable('APP_URL') || ''),
    'Access-Control-Allow-Origin': String(getENVVariable('APP_URL') || ''),
    // recaptcha: ? // Not sure if we're going to do this later any more
  };

  if (!getENVVariable('IS_BROWSER')) {
    headers.ssr = '1';

    if (ipAddress) {
      // Do not allow undefined or null, it becomes a String type
      headers['x-ssr-ip'] = ipAddress;
    }
  }

  if (authorization) {
    // Do not send undefined or null, it becomes a String type
    headers.authorization = authorization;
  }

  return new Headers(headers);
}
