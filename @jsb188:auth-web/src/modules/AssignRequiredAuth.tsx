import i18n from '@jsb188/app/i18n/index.ts';
import { useRequestChangeEmail } from '@jsb188/graphql/hooks/use-account-mtn';
import { useChangeAccountPassword } from '@jsb188/graphql/hooks/use-auth-mtn';
import { FullPageLayout } from '@jsb188/react-web/modules/Layout';
import SchemaForm from '@jsb188/react-web/modules/SchemaForm';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';
import { FullWidthButton } from '@jsb188/react-web/ui/Button';
import Markdown from '@jsb188/react-web/ui/Markdown';
import { ModalErrorMessage, ModalSimpleContent } from '@jsb188/react-web/ui/ModalUI';
import { AppContext } from '@jsb188/react/states';
import { useContext, useMemo, useState } from 'react';
import { AuthFormContainer } from './AuthFormUI';
import { makeAssignPasswordSchema, makeRequestTokenizedEmailSchema } from './schemas';

/**
 * Types
 */

interface FinishedResultObj {
  hasPassword: boolean;
  email: any;
};

interface RequiredAuthSwitchCaseProps {
  identifier: string;
  onFinish: () => void;
  finishedResult: FinishedResultObj;
  setFinishedResult: any;
}

/**
 * Account secured message; after all required auth info has been provided
 */

function AccountSecuredMessage(p: RequiredAuthSwitchCaseProps) {
  const { onFinish } = p;

  return <ModalSimpleContent
    // title='Finished!'
    iconName={COMMON_ICON_NAMES.verified}
    className='px_df pt_md'
  >
    <Markdown as='p'>
      {i18n.t('auth.required_auth_fin_msg')}
    </Markdown>

    <FullWidthButton
      preset='bg_primary'
      className='mt_md shadow'
      onClick={onFinish}
    >
      {i18n.t('auth.continue_to_app')}
    </FullWidthButton>
  </ModalSimpleContent>;
}

/**
 * Set auth password form
 */

function SetPasswordForm(p: RequiredAuthSwitchCaseProps) {

  const { identifier, setFinishedResult } = p;
  const assignPasswordSchema = useMemo(makeAssignPasswordSchema, []);

  const { changeAccountPassword, saving, error, setError, resetErrors } = useChangeAccountPassword({
    doNotFinishForm: true,
    onCompleted: (passwordChanged: boolean) => {
      if (passwordChanged) {
        setFinishedResult((fr: FinishedResultObj) => ({
          ...fr,
          hasPassword: true
        }));
      }
    }
  });

  const onSubmit = (fv: any) => {
    changeAccountPassword({
      variables: {
        currentPassword: '',
        password: fv.password,
      }
    });
  };

  return <>
    <p className='a_c mx_df mb_df -mt_5 pb_xs'>
      {i18n.t('auth.add_password_log_in_msg', { identifier })}
    </p>

    <SchemaForm
      className='pb_df fs'
      saving={saving}
      schema={assignPasswordSchema}
      // currentData={{}}
      onError={setError}
      onSubmit={onSubmit}
      buttonText={i18n.t('auth.add_password')}
    >
      {!error ? null : (
        <ModalErrorMessage
          error={error}
          resetErrors={resetErrors}
        />
      )}
    </SchemaForm>
  </>;
}

/**
 * Set email form
 */

function SetEmailForm(p: RequiredAuthSwitchCaseProps) {

  const { identifier } = p;
  const [waitingForVerification, setWaitingForVerification] = useState(false);
  const assignPasswordSchema = useMemo(makeRequestTokenizedEmailSchema, []);

  const { requestChangeEmail, error, setError, resetErrors, saving } = useRequestChangeEmail({
    onCompleted: (data: any) => {
      if (data.requestChangeEmail) {
        setWaitingForVerification(true);
      }
    }
  });

  const onSubmit = (fv: any) => {
    requestChangeEmail({
      variables: {
        emailAddress: fv.email,
      }
    });
  };

  if (waitingForVerification) {
    return <ModalSimpleContent
      className='px_df pt_md pb_25'
      iconName={COMMON_ICON_NAMES.email_address}
      title={i18n.t('auth.check_email')}
      message={i18n.t('auth.check_email_to_login_msg')}
    />;
  }

  return <>
    <p className='a_c mx_df mb_df -mt_5 pb_xs'>
      {i18n.t('auth.add_email_to_login_msg', { identifier })}
    </p>

    <SchemaForm
      className='pb_df fs'
      saving={saving}
      schema={assignPasswordSchema}
      // currentData={{}}
      onError={setError}
      onSubmit={onSubmit}
      buttonText={i18n.t('auth.add_email')}
    >
      {!error ? null : (
        <ModalErrorMessage
          error={error}
          resetErrors={resetErrors}
        />
      )}
    </SchemaForm>
  </>;
}

/**
 * Switch case for required auth
 */

function RequiredAuthSwitchCase(p: RequiredAuthSwitchCaseProps) {
  const { finishedResult } = p;

  if (!finishedResult.hasPassword) {
    return <SetPasswordForm {...p} />;
  } else if (!finishedResult.email) {
    // Keep email check last, becuase it has a verification step
    return <SetEmailForm {...p} />;
  }

  return <AccountSecuredMessage {...p} />;
}

/**
 * Force users to provide required authentication info
 */

export function AssignRequiredAuth(p: {
  hasPassword: boolean;
  hasEmail: boolean;
}) {
  const { dispatchApp, appState: { hasPassword, account } } = useContext(AppContext);
  const identifier = account?.email?.address || account?.phone?.number || account?.id;

  const [finishedResult, setFinishedResult] = useState({
    hasPassword,
    email: account?.email?.address ? account?.email : null,
  });

  const onFinish = () => {
    if (!hasPassword) {
      dispatchApp({
        __type: 'APP_EDIT_AUTH',
        data: {
          id: account?.id,
          ...finishedResult
        }
      });
    }
  };

  return <FullPageLayout className='pattern_dots_1 active_bf bg_alt'>
    <AuthFormContainer
      title={i18n.t('auth.one_last_step_')}
      className='bd_5 bd_main'
    >
      <RequiredAuthSwitchCase
        identifier={identifier!}
        finishedResult={finishedResult}
        setFinishedResult={setFinishedResult}
        onFinish={onFinish}
      />
    </AuthFormContainer>
  </FullPageLayout>;
}
