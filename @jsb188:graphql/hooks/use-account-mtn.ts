import { checkACLPermission } from '@jsb188/app/utils/organization';
import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn, useCurrentAccount } from '@jsb188/react/states';
import { useMemo } from 'react';
import { editAccountMtn } from '../gql/mutations/accountMutations';
import { useMutation } from './index';
import { useReactiveLogFragment } from './use-log-qry';
import { useOrganizationRelationship } from './use-organization-qry';

/**
 * Edit logged in user's account
 */

export function useEditAccount(
  params?: UseMutationParams | null,
  openModalPopUp?: OpenModalPopUpFn
) {

  const { account, settings, dispatchApp } = useCurrentAccount();
  const [editAccount, mtnValues, mtnHandlers] = useMutation(
    editAccountMtn,
    {
      // checkMountedBeforeCallback: true,
      openModalPopUp,
      ...params,
      onCompleted: (data, error) => {
        params?.onCompleted?.(data, error);
        // dispatchApp({
        //   __type: 'APP_EDIT_ACCOUNT',
        //   data: {
        //     id: account?.id,
        //     ...data,
        //   },
        // });
      }
    },
  );

  return {
    account,
    settings,
    editAccount,
    ...mtnValues,
    ...mtnHandlers,
  };
}