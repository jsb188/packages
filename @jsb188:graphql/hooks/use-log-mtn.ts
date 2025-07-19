import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { editLogEntryMtn } from '../gql/mutations/logMutations';
import { useMutation, useReactiveFragment } from './index';
import { useOrganizationRelationship } from './use-organization-qry';
import { checkACLPermission } from '@jsb188/app/utils/organization';
import { useMemo } from 'react';

/**
 * Fetch a single log entry,
 * from cache first; only check server if cache is not found.
 */

export function useEditLogEntry(
  viewerAccountId: string,
  logEntryId: string,
  organizationId: string,
  params: UseMutationParams = {},
  openModalPopUp?: OpenModalPopUpFn
) {


  const { organizationRelationship } = useOrganizationRelationship(organizationId);
  const notReady = !organizationRelationship;

  const [editLogEntry, mtnValues] = useMutation(
    editLogEntryMtn,
    {
      // checkMountedBeforeCallback: true,
      openModalPopUp,
      ...params,
    },
  );

  const logEntry = useReactiveFragment(
    null,
    [`$logEntryFragment:${logEntryId}`, [`$logEntryArableFragment:${logEntryId}`, 'details']],
    // qryUpdatedCount,
    // Using the otherCheck() function is the only way I could keep sticker updates reactive
    // (_, updatedKeys) => updatedKeys.find((k) => typeof k === 'string' && k.startsWith('$chatStickerFragment:')),
  );

  const isMyDocument = !!viewerAccountId && logEntry?.accountId === viewerAccountId;
  const allowEdit = useMemo(() => {
    return checkACLPermission(organizationRelationship, 'logs', isMyDocument ? 'WRITE' : 'MANAGE');
  }, [organizationRelationship?.acl, organizationRelationship?.role]);

  return {
    logEntry,
    editLogEntry,
    notReady,
    allowEdit,
    ...mtnValues,
  };
}
