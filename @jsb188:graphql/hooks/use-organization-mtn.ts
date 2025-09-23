import { checkACLPermission } from '@jsb188/app/utils/organization';
import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { useMemo } from 'react';
// import { updateFragment } from '../cache/index';
import { editOrganizationEventMtn } from '../gql/mutations/organizationMutations';
import { useMutation } from './index';
import { useOrganizationRelationship, useReactiveOrganizationEventFragment } from './use-organization-qry';

/**
 * Edit Org Event, get ACL, and fetch Org Event fragment from cache
 */

export function useEditOrganizationEvent(
  viewerAccountId: string,
  organizationId: string,
  orgEventId: string,
  addressId: string,
  params: UseMutationParams = {},
  openModalPopUp?: OpenModalPopUpFn
) {

  const { organizationRelationship } = useOrganizationRelationship(organizationId);
  const notReady = !organizationRelationship;

  const [editOrganizationEvent, mtnValues, mtnHandlers] = useMutation(
    editOrganizationEventMtn,
    {
      // checkMountedBeforeCallback: true,
      openModalPopUp,
      ...params,
    },
  );

  const organizationEvent = useReactiveOrganizationEventFragment(orgEventId, addressId, null, mtnValues.mutationCount);
  const isMyDocument = !!viewerAccountId && organizationEvent?.accountId === viewerAccountId;
  const allowEdit = useMemo(() => {
    return checkACLPermission(organizationRelationship, 'events', isMyDocument ? 'WRITE' : 'MANAGE');
  }, [organizationRelationship?.acl, organizationRelationship?.role]);

  // console.log('viewerAccountId', viewerAccountId, organizationEvent?.accountId, isMyDocument, allowEdit);

  return {
    organizationEvent,
    editOrganizationEvent,
    notReady,
    allowEdit,
    ...mtnValues,
    ...mtnHandlers,
  };
}
