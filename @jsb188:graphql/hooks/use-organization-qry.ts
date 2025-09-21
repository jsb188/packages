import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import { childOrganizationsQry, myOrganizationsQry, organizationEventsQry, organizationLoadListsQry, organizationRelationshipQry } from '../gql/queries/organizationQueries';
import type { PaginationArgs, UseQueryParams } from '../types.d';

const ORG_CHILDREN_LIMIT = 200;
const ORG_EVENTS_LIMIT = 200;
const ORG_LOAD_LISTS_LIMIT = 200;

/**
 * Fetch organization relationship
 */

export function useOrganizationRelationship(organizationId?: string | null, params: UseQueryParams = {}) {
  const { data, ...other } = useQuery(organizationRelationshipQry, {
    variables: {
      organizationId
    },
    skip: !organizationId,
    ...params,
  });

  return {
    organizationRelationship: data?.organizationRelationship,
    ...other
  };
}

/**
 * Fetch my organizations
 */

export function useMyOrganizations(params: UseQueryParams = {}) {
  const { data, ...other } = useQuery(myOrganizationsQry, {
    ...params,
  });

  return {
    myOrganizations: data?.myOrganizations,
    ...other
  };
}

/**
 * Fetch child organizations
 */

export function useChildOrganizations(variables: PaginationArgs & {
  organizationId: string | null;
  // filters: ? not ready yet
}, params: UseQueryParams = {}) {
  const { data, ...other } = useQuery(childOrganizationsQry, {
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: ORG_CHILDREN_LIMIT
    },
    skip: !variables.organizationId,
    ...params,
  });

  return {
    childOrganizations: data?.childOrganizations,
    ...other
  };
}

/**
 * Get reactive organization fragment
 */

export function useReactiveOrganizationChildFragment(organizationId: string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$organizationChildFragment:${organizationId}`,
      // [`$organizationChildArableFragment:${organizationId}`, null],
      // By having the second paramter as null, we only observe the reactive changes without setting the data
      // [`$logEntryArableFragment:${logEntryId}`, null],
    ],
    queryCount,
  );
}

/**
 * Get reactive org event fragment
 */

export function useReactiveOrganizationEventFragment(orgEventId: string, addressId?:string, currentData?: any, queryCount?: number) {
  return useReactiveFragment(
    currentData,
    [
      `$organizationEventFragment:${orgEventId}`,
      // @ts-expect-error spread types
      ...(
        addressId
          ? [
              // By having the second paramter as null, we only observe the reactive changes without setting the data
              [`$addressFragment:${addressId}`, null],
            ]
          : []
      )
    ],
    queryCount,
    // Using the otherCheck() function is the only way I could keep sticker updates reactive
    // (_, updatedKeys) => updatedKeys.find((k) => typeof k === 'string' && k.startsWith('$chatStickerFragment:')),
  );
}

/**
 * Fetch org events
 */

export function useOrganizationEvents(variables: PaginationArgs & {
  organizationId: string;
  timeZone: string | null;
}, params: UseQueryParams = {}) {
  const { data, ...other } = useQuery(organizationEventsQry, {
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: ORG_EVENTS_LIMIT
    },
    skip: !variables.organizationId,
    ...params,
  });

  return {
    organizationEvents: data?.organizationEvents,
    ...other
  };
}

/**
 * Fetch load lists for an org event
 */

export function useOrganizationLoadLists(
  variables: PaginationArgs & {
    orgEventId: string;
    organizationId: string;
  },
  params: UseQueryParams = {}
) {
  const { data, ...other } = useQuery(organizationLoadListsQry, {
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: ORG_LOAD_LISTS_LIMIT
    },
    skip: !variables.orgEventId || !variables.organizationId,
    ...params,
  });

  return {
    organizationLoadLists: data?.organizationLoadLists,
    ...other
  };

}
