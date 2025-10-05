import { checkACLPermission } from '@jsb188/app/utils/organization';
import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn } from '@jsb188/react/states';
import { useMemo } from 'react';
import { updateFragment } from '../cache/index';
import { deleteLogEntryMtn, editLogEntryMtn } from '../gql/mutations/logMutations';
import { useMutation } from './index';
import { useReactiveLogFragment } from './use-log-qry';
import { useOrgRelFromMyOrganizations } from './use-organization-qry';

/**
 * Fetch a single log entry,
 * from cache first; only check server if cache is not found.
 */

export function useSwitchOrganization(
  viewerAccountId: string,
  logEntryId: string,
  organizationId: string,
  params: UseMutationParams = {},
  openModalPopUp?: OpenModalPopUpFn
) {

  console.log('do this part');
  console.log('do this part');
  console.log('do this part');
  console.log('do this part');
  console.log('do this part');
  console.log('do this part');
  console.log('do this part');
  console.log('do this part');


  return {
    logEntry,
    editLogEntry,
    notReady,
    allowEdit,
    ...mtnValues,
    ...mtnHandlers,
  };
}
