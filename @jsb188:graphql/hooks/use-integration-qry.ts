import { useReactiveFragment } from '../client/index.ts';

/**
 * Get reactive integration connection fragment.
 */
export function useReactiveIntegrationConnection(integrationConnectionId?: string | null, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    integrationConnectionId ? [`$integrationConnectionFragment:${integrationConnectionId}`] : [],
    queryCount,
    undefined,
    undefined,
    true,
  );
}
