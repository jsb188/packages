import { areObjectsEqual } from '@jsb188/app/utils/object';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Check if database document needs an update, insert, or do nothing based on the user API arguments
 * NOTE: There is a copy paste of this function in @jsb188/app/utils/logic.ts
 * NOTE: Do *NOT* export this function.
 */

function getDatabaseAction(
  currentData: any,
  data: any,
  allowNull?: boolean,
  mergeCurrentData?: boolean,
): any {
  if (!currentData) {
    return {
      action: 'INSERT',
      documentData: data,
    };
  }

  const documentData: Record<string, any> = {};

  let hasChanges = false;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
      // trim() on all string databse fields should be OK;
      // But if not, add an extra param.
      const value = typeof data[key] === 'string' ? data[key].trim() : data[key];

      const isNotNull = value !== null || allowNull;
      if (isNotNull) {
        documentData[key] = value;
      }

      if (
        // Doing loose != check instead of !== type check
        currentData[key] != value &&
        isNotNull
      ) {
        if (value && typeof value === 'object') {
          hasChanges = !areObjectsEqual(currentData[key], value);
        } else {
          hasChanges = true;
        }
      }
    }
  }

  if (mergeCurrentData) {
    for (const key in currentData) {
      if (Object.prototype.hasOwnProperty.call(currentData, key) && documentData[key] === undefined) {
        documentData[key] = currentData[key];
      }
    }
  }

  const action = hasChanges ? 'UPDATE' : 'NONE';

  return {
    action,
    documentData,
  };
}

/**
 * Basic diff check
 */

export function formValuesAreDiff(currentValues: any, formValues: any): boolean {
  if (!formValues && formValues !== 0) {
    // If formValues are null, it's not set yet
    return false;
  }

  if (typeof formValues === 'object') {
    // for (const key in currentValues) {
    //   if (
    //     currentValues[key] !== formValues[key] &&
    //     // This would not work for values with number 0, but I don't think that's an issue for any mutations right now
    //     (currentValues[key] !== null || formValues[key] !== undefined)
    //   ) {
    //     console.log('DIFF!:', key, currentValues[key], formValues[key]);
    //     return true;
    //   }
    // }

    const result = getDatabaseAction(currentValues, formValues);
    return result.action !== 'NONE';
  }

  return currentValues !== formValues;
}

/**
 * Use mounted state
 */

export function useMounted() {
  const mounted = useRef(true);

  useEffect(() => {
    // This is necessary, I don't know why, this hook unmounteds itself and remounts even though the dependencies are empty
    // NOTE: This behavior was seen in [gqlClient.ts]
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return mounted;
}

/**
 * Watch form value change and run action when the ouput is different
 */

export function useWatchChange(
  currentValues: any,
  formValues: any,
  saving: boolean,
  onChangeDiff: (hasChanges: boolean, saving: boolean) => void,
  onDataUpdated: () => void,
) {
  const isDiff = useMemo(() => {
    return formValuesAreDiff(currentValues, formValues);
  }, [currentValues, formValues]);

  useEffect(() => {
    onChangeDiff(isDiff, saving);
  }, [isDiff, saving]);

  useEffect(() => {
    if (!saving) {
      // Always update, because isDiff memo() only listens to formValues (and not currentValues)
      onDataUpdated();
    }
  }, [saving]);
}

/**
 * Check props diff (logging for dev)
 */

export function checkPropsDiff(pp: any, np: any) {
  let isSame = true;
  for (const k in pp) {
    if (Object.prototype.hasOwnProperty.call(pp, k) && pp[k] !== np[k]) {
      console.log('Diff:', k);
      isSame = false;
    }
  }

  for (const k in np) {
    if (
      Object.prototype.hasOwnProperty.call(np, k) &&
      !Object.prototype.hasOwnProperty.call(pp, k) &&
      np[k] !== pp[k]
    ) {
      console.log('New Prop:', k);
      isSame = false;
    }
  }

  return isSame;
}

if (globalThis && globalThis.location?.origin?.indexOf('localhost') >= 0) {
  // @ts-ignore - Dev only shim
  globalThis.checkPropsDiff = checkPropsDiff;
}

/**
 * Check if props are same; except for children
 */

export function arePropsEqualExceptChildren(pp: any, np: any) {
  for (const k in np) {
    if (
      Object.prototype.hasOwnProperty.call(np, k) &&
      k !== 'children' &&
      (
        !Object.prototype.hasOwnProperty.call(pp, k) ||
        np[k] !== pp[k]
      )
    ) {
      // console.log('DIFF:', k, pp[k], np[k]);
      return false;
    }
  }
  return true;
}

/**
 * Keep track of visibility state change and copy props;
 * To be used in animation components
 */

type VisibilityValue = 0 | .5 | 1 | 2;

export function useAnimationVisibility<T>(
  props: T,
  onHasProps?: (hasProps: boolean) => void,
): [
    any,
    VisibilityValue,
    (VisibilityValue: VisibilityValue) => void,
  ] {
  const [visibility, setVisibility] = useState(0 as VisibilityValue);
  const [persistedProps, setPersistedProps] = useState<T>(props as T);
  const hasData = !!props;

  useEffect(() => {
    if (props) {
      setPersistedProps(props);
    }
    onHasProps?.(hasData);
  }, [props]);

  useEffect(() => {
    if (visibility === 1) {
      if (hasData) {
        const timer = setTimeout(() => {
          setVisibility(2);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setVisibility(0);
        }, 300);
        return () => clearTimeout(timer);
      }
    } else if (visibility === .5) {
      const timer = setTimeout(() => {
        setVisibility(0);
      }, 300);
      return () => clearTimeout(timer);
    }

    const shouldBeValue = hasData ? 2 : 0;
    if (shouldBeValue !== visibility) {
      setVisibility(hasData ? 1 : .5);
    }
  }, [visibility, hasData]);

  return [persistedProps, visibility, setVisibility];
}

/**
 * Check if image are loaded
 * NOTE: This only checks on mount
 */

export function useImagesLoadStatus(
  imageUrls: string[],
  timeoutMS = 10000 // default timeout miliseconds
): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) {
      setLoaded(true);
      return;
    }

    let isCancelled = false;
    let loadedCount = 0;
    const timeout = setTimeout(() => {
      if (!isCancelled) {
        setLoaded(true);
      }
    }, timeoutMS);

    const handleLoad = () => {
      loadedCount += 1;
      if (loadedCount === imageUrls.length && !isCancelled) {
        clearTimeout(timeout);
        setLoaded(true);
      }
    };

    const handleError = () => {
      loadedCount += 1; // count errors too, so they don’t block loading
      if (loadedCount === imageUrls.length && !isCancelled) {
        clearTimeout(timeout);
        setLoaded(true);
      }
    };

    const imageElements = imageUrls.map((url) => {
      const img = new Image();
      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = url;
      return img;
    });

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
      // Optional: clear handlers to prevent leaks
      imageElements.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

  return loaded;
}
