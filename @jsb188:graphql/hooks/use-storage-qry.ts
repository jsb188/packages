import { useReactiveFragment } from '../client';

/**
 * Get reactive log fragment
 */

export function useReactiveStorageFragment(storageId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$storageFileFragment:${storageId}`,

      // By having the second paramter as null, we only observe the reactive changes without setting the data
      // [`$logArableFragment:${storageId}`, null],

      // This is not needed because $logEntryFragment has spread data
      // [`$accountFragment:${storageId}`, 'account']
    ],
    queryCount,
  );
}
