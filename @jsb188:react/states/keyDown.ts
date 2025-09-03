import { atom, useAtom, useSetAtom } from 'jotai';
import { useCallback } from 'react';

/**
 * Types
 */

type KeyDownObserverObj = {
  metaKey: boolean;
  pressed: null | string;
  alert: boolean;
  modal: boolean;
};

/**
 * Observe reactivity for key down events
 */

const keyDownState = atom<KeyDownObserverObj>({
  metaKey: false,
  pressed: null,
  alert: false,
  modal: false,
});

/**
 * Compose set key down function
 */

function composeSetKeyDown(setter: (data: KeyDownObserverObj | ((prev: KeyDownObserverObj) => KeyDownObserverObj)) => void) {
  return (data: Partial<KeyDownObserverObj>) => {
    if (typeof data.pressed !== 'string' && data.pressed !== null) {
      return;
    }

    setter((prev: KeyDownObserverObj) => {
      return {
        ...prev,
        ...data,
      };
    });
  };
}

/**
 * Export; get key down setter
 */

export function useSetKeyDown() {
  const setValue = useSetAtom(keyDownState);
  const setKeyDown = useCallback( composeSetKeyDown(setValue), []);

  return setKeyDown;
}

/**
 * Export; use key down
 */


export function useKeyDown() {
  const [value, setValue] = useAtom(keyDownState);
  const setKeyDown = useCallback( composeSetKeyDown(setValue), []);

  return [value, setKeyDown] as const;
}
