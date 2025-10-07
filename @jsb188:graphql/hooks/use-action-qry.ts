import { useQuery } from '../client';
import { actionsListQry } from '../gql/queries/actionQueries';
import type { PaginationArgs, UseQueryParams } from '../types';

/**
 * Constants
 */

const ACTIONS_LIST_LIMIT = 200;

/**
 * Helper; use this to get/use same filter for actionsList() query everywhere
 */

// export function getDefaultProductsListFilter(operation: FilterProductsListArgs['operation']): FilterProductsListArgs {
//   return {
//     operation,
//     types: null,
//     startDate: null,
//     endDate: null,
//     query: ''
//   };
// }

/**
 * Fetch log entries
 */

export function useActionsList(
  variables: PaginationArgs & {
    organizationId?: string | null;
  },
  params: UseQueryParams = {}
) {
  const { data, ...rest } = useQuery(actionsListQry, {
    variables: {
      ...variables,
      cursor: null,
      after: false,
      limit: ACTIONS_LIST_LIMIT
    },
    // If this query is used for virtualized list pagination, set {params.skip=true}
    skip: !variables.organizationId,
    ...params,
  });

  return {
    actionsList: data?.actionsList,
    ...rest
  };
}
