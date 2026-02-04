import type { WSDataUpdateObj } from '@jsb188/app/types/app.d.ts';
import { atom, useAtomValue, useSetAtom } from 'jotai';

/**
 * Types; Fragment/observer hooks
 */

export type ToastObj = Omit<WSDataUpdateObj, 'resetQueryKeys' | 'resetQueryRule' | 'fragment'>;

/**
 * Toast; state
 */

const toastState = atom<ToastObj | null>(null);

/**
 * Export; get toast value
 */

export function useToastValue() {
  return useAtomValue(toastState);
}

/**
 * Export; set toast state
 */

export function useSetToast() {
  return useSetAtom(toastState);
}
