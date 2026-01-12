import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn, useCurrentAccount } from '@jsb188/react/states';
import { requestChangeEmailMtn, editAccountMtn } from '../gql/mutations/accountMutations';
import { useMutation } from './index';

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

        const updatedData = data.editAccount;
        if (updatedData) {
          dispatchApp({
            __type: 'APP_EDIT_ACCOUNT',
            data: updatedData,
          });
        }
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

/**
 * Change logged in user's e-mail address
 */

export function useRequestChangeEmail(
  params?: UseMutationParams | null,
  openModalPopUp?: OpenModalPopUpFn
) {

  const [requestChangeEmail, mtnValues, mtnHandlers] = useMutation(
    requestChangeEmailMtn,
    {
      // checkMountedBeforeCallback: true,
      openModalPopUp,
      ...params,
    },
  );

  return {
    requestChangeEmail,
    ...mtnValues,
    ...mtnHandlers,
  };
}