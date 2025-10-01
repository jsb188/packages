import { useQuery, useReactiveFragment } from '../client';
import { productsListQry } from '../gql/queries/productQueries';
import type { PaginationArgs, UseQueryParams } from '../types';

/**
 * Constants
 */

const PRODUCTS_LIST_LIMIT = 200;

/**
 * Helper; use this to get/use same filter for productsList() query everywhere
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

export function useProductsList(
  variables: PaginationArgs & {
    organizationId?: string | null;
    // filter: FilterProductsListArgs;
  },
  params: UseQueryParams = {}
) {
  const { data, ...rest } = useQuery(productsListQry, {
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: PRODUCTS_LIST_LIMIT
    },
    // If this query is used for virtualized list pagination, set {params.skip=true}
    skip: !variables.organizationId,
    ...params,
  });

  return {
    productsList: data?.productsList,
    ...rest
  };
}

/**
 * Get reactive log fragment
 */

export function useReactiveProductFragment(productId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$productFragment:${productId}`,
    ],
    queryCount,
    // Using the otherCheck() function is the only way I could keep sticker updates reactive
    // (_, updatedKeys) => updatedKeys.find((k) => typeof k === 'string' && k.startsWith('$chatStickerFragment:')),
  );
}
