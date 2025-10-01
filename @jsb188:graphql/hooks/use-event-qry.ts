import { checkACLPermission } from '@jsb188/app/utils/organization';
import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import { useMemo } from 'react';
import { eventAttendanceListQry, eventsListQry } from '../gql/queries/eventQueries';
import type { PaginationArgs, UseQueryParams } from '../types.d';
import { useOrganizationRelationship } from './use-organization-qry';

const EVENTS_LIMIT = 200;

/**
 * Get reactive org event fragment
 */

export function useReactiveEventFragment(
  eventId: string,
  addressId?: string | null,
  currentData?: any,
  queryCount?: number
) {
  return useReactiveFragment(
    currentData,
    [
      `$eventFragment:${eventId}`,
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

export function useEventsList(variables: PaginationArgs & {
  organizationId: string;
  timeZone: string | null;
}, params: UseQueryParams = {}) {
  const { data, ...rest } = useQuery(eventsListQry, {
    variables: {
      ...variables,
      cursor: null,
      after: true,
      limit: EVENTS_LIMIT
    },
    skip: !variables.organizationId,
    ...params,
  });

  return {
    eventsList: data?.eventsList,
    ...rest
  };
}

/**
 * Fetch Org Event attendance, ACL, and Org Event fragment from cache
 */

export function useEventAttendance(
  viewerAccountId: string,
  variables: {
    organizationId: string;
    eventId: string;
    calDate: string;
  },
  params: UseQueryParams = {},
) {

  const { organizationId, eventId, calDate } = variables;
  const { organizationRelationship } = useOrganizationRelationship(organizationId);

  const { data, ...rest } = useQuery(eventAttendanceListQry, {
    variables,
    skip: !eventId || !calDate || !organizationId,
    ...params,
  });

  const organizationEvent = useReactiveEventFragment(eventId);
  const eventAttendanceList = data?.eventAttendanceList;
  const isMyDocument = !!viewerAccountId && organizationEvent?.accountId === viewerAccountId;
  const notReady = !organizationRelationship || !eventAttendanceList || !organizationEvent;

  const allowEdit = useMemo(() => {
    return checkACLPermission(organizationRelationship, 'events', isMyDocument ? 'WRITE' : 'MANAGE');
  }, [organizationRelationship?.acl, organizationRelationship?.role]);

  // console.log('viewerAccountId', viewerAccountId, organizationEvent?.accountId, isMyDocument, allowEdit);

  return {
    organizationEvent,
    eventAttendanceList,
    notReady,
    allowEdit,
    ...rest
  };
}
