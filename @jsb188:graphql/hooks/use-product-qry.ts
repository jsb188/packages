import { checkACLPermission } from '@jsb188/app/utils/organization';
import type { ProductsFilterArgs } from '@jsb188/mday/types/product.d';
import { useMemo } from 'react';
import { useQuery, useReactiveFragment } from '../client';
import { productAttendanceListQry, productsListQry } from '../gql/queries/productQueries';
import type { PaginationArgs, UseQueryParams } from '../types';
import { useOrgRelFromMyOrganizations } from './use-organization-qry';

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
    filter: ProductsFilterArgs;
  },
  params: UseQueryParams = {}
) {
  const { data, ...rest } = useQuery(productsListQry, {
    variables: {
      ...variables,
      cursor: null,
      after: false,
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
  );
}

/**
 * Fetch Org Event attendance, ACL, and Org Event fragment from cache
 */

export function useProductAttendance(
  viewerAccountId: string,
  variables: {
    organizationId: string;
    productId: string;
    calDate: string;
  },
  params: UseQueryParams = {},
) {

  const { organizationId, productId, calDate } = variables;
  const { organizationRelationship } = useOrgRelFromMyOrganizations(organizationId);

  const { data, ...rest } = useQuery(productAttendanceListQry, {
    variables,
    skip: !productId || !calDate || !organizationId,
    ...params,
  });

  const eventProduct = useReactiveProductFragment(productId);
  const productAttendanceList = data?.productAttendanceList;
  const isMyDocument = !!viewerAccountId && eventProduct?.accountId === viewerAccountId;
  const notReady = !organizationRelationship || !productAttendanceList || !eventProduct;

  const allowEdit = useMemo(() => {
    return checkACLPermission(organizationRelationship, 'events', isMyDocument ? 'WRITE' : 'MANAGE');
  }, [organizationRelationship?.acl, organizationRelationship?.role]);

  // console.log('viewerAccountId', viewerAccountId, organizationEvent?.accountId, isMyDocument, allowEdit);

  return {
    eventProduct,
    productAttendanceList,
    notReady,
    allowEdit,
    ...rest
  };
}
