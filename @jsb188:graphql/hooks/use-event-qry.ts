import { checkACLPermission } from '@jsb188/app/utils/organization';
import { useQuery, useReactiveFragment } from '@jsb188/graphql/client';
import type { EventsFilter } from '@jsb188/mday/types/event.d';
import { useMemo } from 'react';
import { eventAttendanceListQry, eventsListQry } from '../gql/queries/eventQueries';
import type { PaginationArgs, UseQueryParams } from '../types.d';
import { useOrgRelFromMyOrganizations } from './use-organization-qry';

const EVENTS_LIMIT = 200;

/**
 * Helper; use this to get/use same filter for logEntries() query everywhere
 */

export function getDefaultEventsListFilter(type: EventsFilter['type']): EventsFilter {
  return {
    type
  };
}

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
  filter: EventsFilter;
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
  const { organizationRelationship } = useOrgRelFromMyOrganizations(organizationId);

  const { data, ...rest } = useQuery(eventAttendanceListQry, {
    variables,
    skip: !eventId || !calDate || !organizationId,
    ...params,
  });

  const orgEvent = useReactiveEventFragment(eventId);
  const eventAttendanceList = data?.eventAttendanceList;
  const isMyDocument = !!viewerAccountId && orgEvent?.accountId === viewerAccountId;
  const notReady = !organizationRelationship || !eventAttendanceList || !orgEvent;

  const allowEdit = useMemo(() => {
    return checkACLPermission(organizationRelationship, 'events', isMyDocument ? 'WRITE' : 'MANAGE');
  }, [organizationRelationship?.acl, organizationRelationship?.role]);

  // console.log('viewerAccountId', viewerAccountId, organizationEvent?.accountId, isMyDocument, allowEdit);

  return {
    orgEvent,
    eventAttendanceList,
    notReady,
    allowEdit,
    ...rest
  };
}
