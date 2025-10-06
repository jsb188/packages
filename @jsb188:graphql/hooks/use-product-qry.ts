import { useQuery, useReactiveFragment } from '../client';
import { productsListQry, productAttendanceListQry } from '../gql/queries/productQueries';
import { useOrgRelFromMyOrganizations } from './use-organization-qry';
import type { PaginationArgs, UseQueryParams } from '../types';
import type { ProductTypeEnum } from '@jsb188/mday/types/product.d';
import { useMemo } from 'react';
import { checkACLPermission } from '@jsb188/app/utils/organization';

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
    productType: ProductTypeEnum;
    organizationId?: string | null;
    // filter: FilterProductsListArgs;
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
    // Using the otherCheck() function is the only way I could keep sticker updates reactive
    // (_, updatedKeys) => updatedKeys.find((k) => typeof k === 'string' && k.startsWith('$chatStickerFragment:')),
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
