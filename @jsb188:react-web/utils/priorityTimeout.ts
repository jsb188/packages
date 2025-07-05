import { useEffect, useState } from 'react';

let BROWSER_HIDDEN_TIME = 0;

/**
 * Check if browser (or app) is hidden
 * NOTE: Change this function for Mobile
 */

export function isAppHidden() {
  return globalThis.document?.hidden;
}

/**
 * Keep track of browser hidden time
 */

export function setAppVisibilityTime() {
  BROWSER_HIDDEN_TIME = globalThis.document?.hidden ? Date.now() : 0;
}

/**
 * When browser is un-focused for a while, all timeouts/intervals are paused.
 * When the user resumes focus on the browser, all the paused timeouts/intervals are executed at once.
 * This will cause a huge spike in CPU, causing the browser to freeze for a few seconds.
 * To avoid this, we can use the Page Visibility API to detect when the browser is not visible.
 */

export function setTimeoutPriority(fn: () => void, ms: number, ignoreIfLowPriority: boolean = false) {

  // NOTE: You can check if browser is visible or hidden with:
  // document.visibilityState === 'visible' or document.hidden === false
  // document.hidden has more browser support than document.visibilityState

  if (!globalThis.document?.hidden || !requestIdleCallback) {
    // Browser is not tabbed out, so continue with normal timer
    return setTimeout(fn, ms);
  }

  // Browser is tabbed out, so there *might* be a reason for low priority execution mode check

  const now = Date.now();
  const isLowPriorityMode = (now - BROWSER_HIDDEN_TIME) > 900000; // 15 minutes

  // console.log('isLowPriorityMode', isLowPriorityMode, (now - BROWSER_HIDDEN_TIME));

  if (isLowPriorityMode && ignoreIfLowPriority) {
    // Exit without executing the function
    return 0;
  }

  // During low priority mode, use requestIdleCallback() instead,
  // which will execute the function in order when it's possible.
  return requestIdleCallback(fn, { timeout: ms });
}

// More tips:
// Use requestIdleCallback() for heavy compute scripts that may get in the way of user experience or create JS lag

/**
 * Create an infinite loop timer
 */

export function useTimer(
  refreshInterval: number = 60000
): null | number {

  const [timestamp, setTimestamp] = useState<null | number>(null);
  const appIsHidden = isAppHidden();

  useEffect(() => {
    const timeout = setTimeoutPriority(() => {
      setTimestamp(Date.now());
    }, refreshInterval);

    return () => {
      clearTimeout(timeout);
    };
  }, [appIsHidden, timestamp]);

  return timestamp;
}
