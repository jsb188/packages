import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'

/**
 * connectedToState; Track network connection state;
 * Developer should use either WebSockets, or SSE to track this,
 * or just keep the value set to {true} on app mount.
 */

const connectedToServerState = atom(false);

/**
 * screenIsFocused; whether or not app is open & focused
 */

const screenIsFocusedState = atom(true);

/**
 * Export; set connectedToServerState
 */

export function useSetConnectedToServer() {
  return useSetAtom(connectedToServerState);
}

/**
 * Export; get connectedToServerState value
 */

export function useConnectedToServerValue() {
  return useAtomValue(connectedToServerState);
}

/**
 * Export; get & set connectedToServerState
 */

export function useConnectedToServer() {
  return useAtom(connectedToServerState);
}

/**
 * Export; set screenIsFocusedState
 */

export function useSetScreenIsFocused() {
  return useSetAtom(screenIsFocusedState);
}

/**
 * Export; get screenIsFocusedState value
 */

export function useScreenIsFocusedValue() {
  return useAtomValue(screenIsFocusedState);
}

/**
 * Export; get & set screenIsFocusedState
 */

export function useScreenIsFocused() {
  return useAtom(screenIsFocusedState);
}
