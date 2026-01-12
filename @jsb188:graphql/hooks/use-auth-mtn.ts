import i18n from '@jsb188/app/i18n';
import { deleteAuthToken } from '@jsb188/app/platform';
import type { UseMutationParams } from '@jsb188/graphql/types.d';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import { AppContext, onGuestInit, useOpenModalPopUp } from '@jsb188/react/states';
import React, { useContext, useEffect, useState } from 'react';
import { changeAccountPasswordMtn, checkUsernameOrEmailMtn, confirmPasswordMtn, confirmPhoneVerificationCodeMtn, requestTokenizedEmailMtn, sendPhoneVerificationCodeMtn, signUpWithEmailMtn } from '../gql/mutations/authMutations';
import { signOutMtn } from '../gql/mutations/userAuthMutations';
import { useMutation } from './index';

/**
 * Types
 */

interface AuthHookParams extends UseMutationParams {
  initialError?: any;
  initialFormData?: Record<string, any>;
}

/**
 * Change password (while logged in)
 */

interface UseChangeAccountPasswordParams extends UseMutationParams {
  doNotFinishForm?: boolean;
}

export function useChangeAccountPassword(params: UseChangeAccountPasswordParams = {}, openModalPopUp?: OpenModalPopUpFn) {

  const { dispatchApp, appState: { hasPassword, account } } = useContext(AppContext);
  const { onCompleted, onError, doNotFinishForm } = params;

  const onFinishChangeAccountPassword = () => {
    if (!hasPassword) {
      dispatchApp({
        __type: 'APP_EDIT_AUTH',
        data: {
          id: account?.id,
          hasPassword: true,
        }
      });
    }
  };

  const onCompleted_ = (data: any, err: any, variables: any) => {
    const success = !!data?.changeAccountPassword;
    if (success) {
      openModalPopUp?.({
        name: 'password_changed',
        props: {
          title: i18n.t('form.success'),
          message: i18n.t('auth.password_changed_msg'),
          iconName: 'lock-password-filled'
        }
      });

      if (!doNotFinishForm) {
        onFinishChangeAccountPassword();
      }

      if (onCompleted) {
        onCompleted(success, err, variables);
      }
    }
  };

  const [changeAccountPassword, mtnValues, mtnHandlers] = useMutation(
    changeAccountPasswordMtn,
    {
      openModalPopUp,
      onCompleted: onCompleted_,
      onError,
    },
  );

  return {
    openModalPopUp,
    changeAccountPassword,
    onFinishChangeAccountPassword,
    account,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Reset password (from 30m email link)
 */

export function useChangeAccountPasswordForm(params: UseMutationParams = {}) {

  const { dispatchApp, appState: { hasPassword, account } } = useContext(AppContext);
  const { onCompleted, onError } = params;

  const onCompleted_ = (data: any, err: any, variables: any) => {
    if (onCompleted) {
      onCompleted(data, err, variables);
    }

    const success = !!data?.changeAccountPassword;
    if (success) {
      // It's possible for user to use this hook without being logged in
      // So we have to check for ID first
      if (account?.id && !hasPassword) {
        dispatchApp({
          __type: 'APP_EDIT_AUTH',
          data: {
            id: account?.id,
            hasPassword: true,
          }
        });
      }
    }
  };

  const [changeAccountPassword, mtnValues, mtnHandlers] = useMutation(
    changeAccountPasswordMtn,
    {
      checkMountedBeforeCallback: true,
      onCompleted: onCompleted_,
      onError,
    },
  );

  return {
    changeAccountPassword,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Request password reset (email with link)
 */

export function useRequestTokenizedEmail(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onCompleted, onError } = params;
  const [requestTokenizedEmail, mtnValues] = useMutation(
    requestTokenizedEmailMtn,
    {
      checkMountedBeforeCallback: true,
      openModalPopUp,
      onCompleted,
      onError
    },
  );

  return {
    requestTokenizedEmail,
    ...mtnValues,
  };
}

/**
 * Send verification code to phone number
 */

export function useSendPhoneVerificationCode(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onCompleted, onError } = params;
  const [sendPhoneVerificationCode, mtnValues, mtnHandlers] = useMutation(
    sendPhoneVerificationCodeMtn,
    {
      checkMountedBeforeCallback: true,
      openModalPopUp,
      onCompleted,
      onError
    },
  );

  return {
    sendPhoneVerificationCode,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Confirm verification code
 */

export function useConfirmPhoneVerificationCode(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onCompleted, onError } = params;

  const [confirmPhoneVerificationCode, mtnValues, mtnHandlers] = useMutation(
    confirmPhoneVerificationCodeMtn,
    {
      checkMountedBeforeCallback: true,
      openModalPopUp,
      onCompleted,
      onError
    },
  );

  return {
    confirmPhoneVerificationCode,
    ...mtnValues,
    ...mtnHandlers,
  };
}

/**
 * Sign in
 */

export function useCheckUsernameOrEmail(params: AuthHookParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onError, onCompleted, initialError, initialFormData } = params;

  const [dataForSchema, setDataForSchema] = useState({
    hasInput: !!initialFormData?.usernameOrEmail,
    lastIdentifier: initialFormData?.usernameOrEmail || '',
    hidePassword: !initialFormData?.usernameOrEmail,
  });

  const [checkUsernameOrEmail, mtnValues, mtnHandlers] = useMutation(
    checkUsernameOrEmailMtn,
    {
      openModalPopUp,
      initialError,
      onError,
      onCompleted,
    },
  );

  return {
    ...mtnValues,
    ...mtnHandlers,
    checkUsernameOrEmail,
    dataForSchema,
    setDataForSchema,
  };
}

/**
 * Sign up with email
 */

export function useSignUpWithEmail(params: AuthHookParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const { onError, onCompleted, initialError } = params;

  const [signUpWithEmail, mtnValues, mtnHandlers] = useMutation(
    signUpWithEmailMtn,
    {
      openModalPopUp,
      initialError,
      onError,
      onCompleted,
    },
  );

  return {
    ...mtnValues,
    ...mtnHandlers,
    signUpWithEmail,
  };
}

/**
 * Confirm password
 * NOTE: *must* be signed in already
 */

export function useConfirmPassword(params: UseMutationParams = {}, openModalPopUp?: OpenModalPopUpFn) {
  const [confirmPassword, mtnValues, mtnHandlers] = useMutation(
    confirmPasswordMtn,
    {
      checkMountedBeforeCallback: true,
      openModalPopUp,
      ...params,
    },
  );

  return {
    confirmPassword,
    ...mtnValues,
    ...mtnHandlers,
  };
}

// Before are deprecated HOC that needs to be migrated to hooks
// Before are deprecated HOC that needs to be migrated to hooks
// Before are deprecated HOC that needs to be migrated to hooks
// Before are deprecated HOC that needs to be migrated to hooks
// Before are deprecated HOC that needs to be migrated to hooks

/**
 * Sign out
 */

export function composeSignOut(Cmp: React.FC<any>) {
  const SignOutCnt = (p) => {
    const { doNotAlertErrors, onError, onCompleted } = p;
    const openModalPopUp = useOpenModalPopUp();
    const { dispatchApp } = useContext<any>(AppContext);

    const [signOut, mtnValues, mtnHandlers] = useMutation(
      signOutMtn,
      {
        openModalPopUp: doNotAlertErrors ? null : openModalPopUp,
        onError,
        onCompleted: (data) => {
          if (data?.signOut) {
            deleteAuthToken();
            onGuestInit(null, dispatchApp);
          }
          if (onCompleted) {
            onCompleted(data);
          }
        },
      },
    );

    useEffect(() => {
      const timer = setTimeout(() => {
        signOut();
      }, 1000);
      return () => clearTimeout(timer);
    }, []);

    // return (
    //   <Cmp
    //     {...p}
    //     {...mtnValues}
    //     {...mtnHandlers}
    //     signOut={signOut}
    //   />
    // );
    return null;
  };

  return SignOutCnt;
}
