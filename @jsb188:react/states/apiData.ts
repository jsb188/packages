import { atom, useAtomValue, useSetAtom } from 'jotai';

/**
 * Types; Fragment/observer hooks
 */

type QueryObserverObj = {
  count: number;
  name: string;
  forceRefetch: boolean;
};

type FragmentObserverObj = {
  count: number;
  list: string[];
};

/**
 * queryObserver; state - Observe reactivity for queries
 */

const queryObserverState = atom<QueryObserverObj>({
  count: 0,
  name: '',
  forceRefetch: false
});

/**
 * fragmentObserver; state - Observe reactivity for data fragments
 */

const fragmentObserverState = atom<FragmentObserverObj>({
  count: 0,
  list: [],
});

/**
 * Export; get query observer state
 */

export function useQueryObserverValue() {
  return useAtomValue(queryObserverState);
}

/**
 * Export; set query observer state
 */

export function useSetQueryObserver() {
  return useSetAtom(queryObserverState);
}

/**
 * Export; set fragment observer state
 */

export function useSetFragmentObserver() {
  return useSetAtom(fragmentObserverState);
}

/**
 * Export; get fragment observer state
 */

export function useFragmentObserverValue() {
  return useAtomValue(fragmentObserverState);
}
