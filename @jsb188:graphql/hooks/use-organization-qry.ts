import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import { childOrganizationsQry, myOrganizationsQry, organizationEventAttendanceListQry, organizationEventsQry, organizationRelationshipQry } from '../gql/queries/organizationQueries';
import type { PaginationArgs, UseQueryParams } from '../types.d';
import { useMemo } from 'react';
import { checkACLPermission } from '@jsb188/app/utils/organization';

const ORG_CHILDREN_LIMIT = 200;
const ORG_EVENTS_LIMIT = 200;

/**
 * Fetch organization relationship
 */

export function useOrganizationRelationship(organizationId?: string | null, params: UseQueryParams = {}) {
  const { data, ...rest } = useQuery(organizationRelationshipQry, {
    variables: {
      organizationId
    },
    skip: !organizationId,
    ...params,
  });

  return {
    organizationRelationship: data?.organizationRelationship,
    ...rest
  };
}

/**
 * Fetch my organizations
 */

export function useMyOrganizations(params: UseQueryParams = {}) {
  const { data, ...rest } = useQuery(myOrganizationsQry, {
    ...params,
  });

  return {
    myOrganizations: data?.myOrganizations,
    ...rest
  };
}

/**
 * Fetch child organizations
 */

export function useChildOrganizations(variables: PaginationArgs & {
  organizationId: string | null;
  // filters: ? not ready yet
}, params: UseQueryParams = {}) {
  const { data, ...rest } = useQuery(childOrganizationsQry, {
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
    ...rest
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

export function useReactiveOrganizationEventFragment(
  orgEventId: string,
  addressId?: string | null,
  currentData?: any,
  queryCount?: number
) {
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
  const { data, ...rest } = useQuery(organizationEventsQry, {
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
    ...rest
  };
}

/**
 * Fetch Org Event attendance, ACL, and Org Event fragment from cache
 */

export function useOrgEventAttendance(
  viewerAccountId: string,
  variables: {
    organizationId: string;
    orgEventId: string;
    calDate: string;
  },
  params: UseQueryParams = {},
) {

  const { organizationId, orgEventId, calDate } = variables;
  const { organizationRelationship } = useOrganizationRelationship(organizationId);
  const notReady = !organizationRelationship;

  const { data, ...rest } = useQuery(organizationEventAttendanceListQry, {
    variables,
    skip: !orgEventId || !calDate || !organizationId,
    ...params,
  });

  const organizationEvent = useReactiveOrganizationEventFragment(orgEventId);
  const isMyDocument = !!viewerAccountId && organizationEvent?.accountId === viewerAccountId;

  const allowEdit = useMemo(() => {
    return checkACLPermission(organizationRelationship, 'events', isMyDocument ? 'WRITE' : 'MANAGE');
  }, [organizationRelationship?.acl, organizationRelationship?.role]);

  // console.log('viewerAccountId', viewerAccountId, organizationEvent?.accountId, isMyDocument, allowEdit);

  return {
    organizationEvent,
    organizationEventAttendanceList: data?.organizationEventAttendanceList,
    notReady,
    allowEdit,
    ...rest
  };
}
