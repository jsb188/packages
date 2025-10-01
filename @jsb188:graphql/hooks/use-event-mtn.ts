import { checkACLPermission } from '@jsb188/app/utils/organization';
import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { useMemo } from 'react';
// import { updateFragment } from '../cache/index';
import { editEventMtn } from '../gql/mutations/eventMutations';
import { useMutation } from './index';
import { useReactiveEventFragment } from './use-event-qry';
import { useOrganizationRelationship } from './use-organization-qry';

/**
 * Edit Org Event, get ACL, and fetch Org Event fragment from cache
 */

export function useEditEvent(
  viewerAccountId: string,
  organizationId: string,
  eventId: string,
  addressId: string,
  params: UseMutationParams = {},
  openModalPopUp?: OpenModalPopUpFn
) {

  const { organizationRelationship } = useOrganizationRelationship(organizationId);
  const notReady = !organizationRelationship;

  const [editEvent, mtnValues, mtnHandlers] = useMutation(
    editEventMtn,
    {
      // checkMountedBeforeCallback: true,
      openModalPopUp,
      ...params,
    },
  );

  const organizationEvent = useReactiveEventFragment(eventId, addressId, null, mtnValues.mutationCount);
  const isMyDocument = !!viewerAccountId && organizationEvent?.accountId === viewerAccountId;
  const allowEdit = useMemo(() => {
    return checkACLPermission(organizationRelationship, 'events', isMyDocument ? 'WRITE' : 'MANAGE');
  }, [organizationRelationship?.acl, organizationRelationship?.role]);

  // console.log('viewerAccountId', viewerAccountId, organizationEvent?.accountId, isMyDocument, allowEdit);

  return {
    organizationEvent,
    editEvent,
    notReady,
    allowEdit,
    ...mtnValues,
    ...mtnHandlers,
  };
}
