import type { UseMutationParams } from '@jsb188/graphql/types.d';
import { OpenModalPopUpFn, useCurrentAccount } from '@jsb188/react/states';
import { changePhoneMtn, requestChangeEmailMtn, requestChangePhoneMtn, editAccountMtn } from '../gql/mutations/accountMutations';
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
 * Change logged in user's email address
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

/**
 * Change logged in user's phone number
 */

export function useRequestChangePhone(
  params?: UseMutationParams | null,
  openModalPopUp?: OpenModalPopUpFn
) {

  const [requestChangePhone, mtnValues, mtnHandlers] = useMutation(
    requestChangePhoneMtn,
    {
      openModalPopUp,
      ...params,
    },
  );

  return {
    requestChangePhone,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Confirm logged in user's phone number change
 */

export function useChangePhone(
  params?: UseMutationParams | null,
  openModalPopUp?: OpenModalPopUpFn
) {

  const [changePhone, mtnValues, mtnHandlers] = useMutation(
    changePhoneMtn,
    {
      openModalPopUp,
      ...params,
    },
  );

  return {
    changePhone,
    ...mtnValues,
    ...mtnHandlers,
  };
}
