import { SUPPORT_EMAILS } from '@jsb188/app/constants/app';
import i18n from '@jsb188/app/i18n';
import { useCheckUsernameOrEmail, useConfirmPhoneVerificationCode, useRequestTokenizedEmail, useSendPhoneVerificationCode, useSignUpWithEmail } from '@jsb188/graphql/hooks/use-auth-mtn';
import { FormBreak } from '@jsb188/react-web/modules/Form';
import SchemaForm from '@jsb188/react-web/modules/SchemaForm';
import { FullWidthButton } from '@jsb188/react-web/ui/Button';
import { TextWithLinks } from '@jsb188/react-web/ui/Markdown';
import { ModalErrorMessage, ModalSimpleContent } from '@jsb188/react-web/ui/ModalUI';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { AuthPageName } from './_helpers';
import { getAuthRoute } from './_helpers';
import { VerificationCodeInput } from './AuthFormUI';
import { ContinueWithApple, ContinueWithGoogle, ContinueWithPhone } from './OtherAuthButtons';
import { makeRequestTokenizedEmailSchema, makeSendPhoneVerificationSchema, makeSignInSchema, makeSignUpSchema } from './schemas';

/**
 * Page meta tags
 */

export const meta = [{
  title: i18n.t('app.route_', { text: i18n.t('app.route_auth') })
}];

/**
 * Sign in form (main screen)
 */

interface AuthFormProps {
  appNamespace: string;
  initialError?: any;
  initialFormData?: any;
  authRoutesMap?: Record<AuthPageName, string>;
  setSignInIface: (iface: SignInIface | null) => void;

  // Check if needed still
  onError?: (error: any) => void;
}

function SignInMain(p: AuthFormProps) {
  const { authRoutesMap, initialError, initialFormData, setSignInIface } = p;
  const navigate = useNavigate();
  const [waitingForPostRequest, setWaitingForPostRequest] = useState(false);
  const signInSchema = useMemo(makeSignInSchema, []);
  const { saving, checkUsernameOrEmail, dataForSchema, setDataForSchema, error, setError, resetErrors } = useCheckUsernameOrEmail({
    initialError,
    initialFormData
  });

  const hidePassword = dataForSchema.hidePassword;
  const onFormValuesChange = (formValues: any, _currentValues: any, setFormValues: (val: any) => void) => {
    const hasInput = !!formValues.identifier?.trim();
    if (
      !hidePassword &&
      formValues.identifier !== dataForSchema.lastIdentifier
    ) {
      setDataForSchema({
        ...dataForSchema,
        hasInput,
        lastIdentifier: '',
        hidePassword: true,
      });

      setFormValues({
        ...formValues,
        password: '',
      });
    } else if (hasInput !== dataForSchema.hasInput) {
      setDataForSchema({
        ...dataForSchema,
        hasInput,
      });
    }
  };

  async function onSubmit(formValues: any, _currentValues: any, setFormValues: any) {
    const identifier = formValues.identifier?.trim();
    if (hidePassword) {
      const { checkUsernameOrEmail: result } = await checkUsernameOrEmail({
        variables: {
          usernameOrEmail: identifier,
          authCheck: true,
        },
      });

      switch (result?.type) {
        case 'PHONE': {
          if (!result.taken) {
            setError({
              message: i18n.t('auth.no_account_with_phone'),
            });
            return false;
          } else if (result?.hasPassword === false) {
            setSignInIface('VERIFY_PHONE');
            return false;
          }
          // Do this if you want to redirect to sign up
          // setScreen({
          //   name: 'sign_up',
          //   email: result.value,
          // });
          // return false;
        } break;
        case 'EMAIL': {
          if (!result.taken) {
            setError({
              message: i18n.t('auth.no_account_with_email'),
            });
            // Do this if you want to redirect to sign up
            // setScreen({
            //   name: 'sign_up',
            //   email: result.value,
            // });
            return false;
          }
        } break;
        default:
          // This auth type is not supported
          console.dev('Unknown auth type:', result);

          if (result?.type) {
            setError({
              message: i18n.t('auth.not_valid_email_or_phone'),
            });
          }
          return false;
      }

      setDataForSchema({
        ...dataForSchema,
        lastIdentifier: identifier || '',
        hidePassword: !result?.taken,
      });

      setFormValues({
        ...formValues,
        identifier: identifier || '',
      });
    } else if (formValues.password && identifier) {
      setWaitingForPostRequest(true);
      return true; // "Do" post form
    }

    return false; // Do not post form
  }

  const showSignUpLink = hidePassword && !error;

  const onFinishSignIn = (token: string) => {
    navigate(getAuthRoute('signin_success', authRoutesMap, `token=${token}`));
  };

  return (
    <>
      {/* <ContinueWithGoogle onFinishSignIn={onFinishSignIn} /> */}
      {/* <ContinueWithApple onFinishSignIn={onFinishSignIn} /> */}
      <ContinueWithPhone onClickButton={() => setSignInIface('VERIFY_PHONE')} />

      <FormBreak className='mt_md'>
        {i18n.t('form.or')}
      </FormBreak>

      <SchemaForm
        doNotPostForm={fv => !fv.identifier || !fv.password}
        httpMethod='post'
        actionUrl={getAuthRoute('signin', authRoutesMap)}
        className='py_df'
        currentData={{ identifier: initialFormData?.identifier || '' }}
        saving={saving || waitingForPostRequest}
        schema={signInSchema}
        dataForSchema={dataForSchema}
        onSubmit={onSubmit}
        onFormValuesChange={onFormValuesChange}
      >
        {error && (
          <ModalErrorMessage
            error={error}
            resetErrors={resetErrors}
            // className='mt_sm'
          />
        )}
      </SchemaForm>

      <div className='a_c'>
        <Link
          className='text ft_sm cl_md link'
          to={getAuthRoute(hidePassword ? 'signup' : 'reset_password', authRoutesMap)}
          replace
        >
          {i18n.t(showSignUpLink ? 'auth.signup_email' : 'auth.forgot_password_')}
        </Link>
      </div>
    </>
  );
}

/**
 * Forgot password form
 */

interface RequestTokenizedEmailProps extends AuthFormProps {
  requestType: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
}

function RequestTokenizedEmail(p: RequestTokenizedEmailProps) {
  const { requestType, initialFormData, setSignInIface } = p;
  const [error, setError] = useState<any>(null);
  const initialEmailAddress = initialFormData?.identifier || '';
  const onSuccess = (_emailAddress: string) => setSignInIface('EMAIL_SENT');

  const tokenizedEmailSchema = useMemo(() => {
    const schema = makeRequestTokenizedEmailSchema();
    if (!initialEmailAddress) {
      return schema;
    }

    return {
      ...schema,
      listData: schema.listData.map((obj) => {
        if (obj.item.name === 'email') {
          return {
            ...obj,
            item: {
              ...obj.item,
              placeholder: initialEmailAddress
            }
          };
        }

        return obj;
      }),
    };
  }, []);

  // Data hook

  const { requestTokenizedEmail, saving } = useRequestTokenizedEmail({
    onCompleted: (data: any, _: any, variables: any) => {
      const success = data?.requestTokenizedEmail;
      if (success) {
        onSuccess(variables.email);
      }
    },
    onError: (err: any) => {
      setError(err);
    }
  });

  const onSubmit = (fv: any) => {
    requestTokenizedEmail({
      variables: {
        ...fv,
        requestType
      }
    });
  };

  let instructionText;
  switch (requestType) {
    case 'PASSWORD_RESET':
      instructionText = i18n.t('auth.request_reset_password_instr');
      break;
    case 'EMAIL_VERIFICATION':
      instructionText = i18n.t('auth.resend_verification_instr');
      break;
    default:
  }

  return (
    <SchemaForm
      saving={saving}
      schema={tokenizedEmailSchema}
      currentData={{ email: initialEmailAddress || '' }}
      onError={setError}
      onSubmit={onSubmit}
      buttonText={i18n.t('auth.resend_verification')}
    >
      {!error ? null : (
        <ModalErrorMessage
          error={error}
          resetErrors={() => setError(null)}
        />
      )}

      <p className={error ? 'py_xs a_c' : '-mt_1 pb_xs a_c'}>
        {instructionText}
      </p>
    </SchemaForm>
  );
}

/**
 * Request for password reset is completed
 */

function ResetPasswordCompleted(p: AuthFormProps) {
  const { appNamespace, initialFormData } = p;
  const emailAddress = initialFormData?.identifier;
  const supportEmail = SUPPORT_EMAILS[appNamespace];

  return <ModalSimpleContent
    title={i18n.t('auth.email_sent')}
    iconName='circle-check-filled'
  >
    <TextWithLinks as='p'>
      {i18n.t('auth.reset_password_requested_msg', { emailAddress: emailAddress || '?' })}
    </TextWithLinks>
    <TextWithLinks as='p'>
      {i18n.t('auth.if_need_more_help_email', { emailAddress: supportEmail })}
    </TextWithLinks>
  </ModalSimpleContent>;
}

/**
 * Request phone verification
 */

function SendPhoneVerification(p: AuthFormProps) {
  const { setSignInIface } = p;
  const sendPhoneVerificationSchema = useMemo(() => makeSendPhoneVerificationSchema(), []);

  // Data hook

  const { sendPhoneVerificationCode, saving, error, setError, resetErrors } = useSendPhoneVerificationCode({
    onCompleted: (data: any, _: any, variables: any) => {
      const success = data?.sendPhoneVerificationCode;
      if (success) {
        setSignInIface(['VERIFY_PHONE_SENT', variables.phone]);
      } else {
        setError({
          message: i18n.t('error.unknown_error'),
        });
      }
    },
    onError: (err: any) => {
      setError(err);
    }
  });

  const onSubmit = (fv: any) => {
    sendPhoneVerificationCode({
      variables: {
        phone: fv.phone,
      }
    });
  };

  return <>
    <SchemaForm
      className='mb_df'
      saving={saving}
      schema={sendPhoneVerificationSchema}
      onError={setError}
      onSubmit={onSubmit}
      buttonText={i18n.t('auth.send_verification_code')}
    >
      {!error ? null : (
        <ModalErrorMessage
          error={error}
          resetErrors={resetErrors}
        />
      )}

      <p className={error ? 'py_xs a_c' : '-mt_1 pb_xs a_c'}>
        {i18n.t('auth.send_verification_code_msg')}
      </p>
    </SchemaForm>

    <div className='a_c h_center'>
      <button
        disabled={saving}
        onClick={() => setSignInIface(null)}
        className='text ft_sm cl_md link'
      >
        {i18n.t('auth.log_in_other_methods')}
      </button>
    </div>
  </>;
}

/**
 * Confirm phone verification code (after it was sent)
 */

interface ConfirmPhoneVerificationCodeProps extends AuthFormProps {
  phoneNumber: string;
}

function ConfirmPhoneVerificationCode(p: ConfirmPhoneVerificationCodeProps) {
  const { setSignInIface, phoneNumber, authRoutesMap } = p;
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  // Data hook

  const { confirmPhoneVerificationCode, saving, error, setError, resetErrors } = useConfirmPhoneVerificationCode({
    onCompleted: (data: any, _: any) => {
      const { success, token } = data?.confirmPhoneVerificationCode || {};

      if (success && token) {
        navigate(getAuthRoute('signin_success', authRoutesMap, `token=${token}`));
      } else {
        setRetryCount(retryCount + 1);
        setError({
          message: i18n.t('auth.verification_code_wrong')
        })
      }
    }
  });

  const onSubmit = (code: string) => {
    confirmPhoneVerificationCode({
      variables: {
        phone: phoneNumber,
        code
      }
    });
  }

  return <>
    {!error ? null : (
      <ModalErrorMessage
        error={error}
        resetErrors={resetErrors}
      />
    )}
    <VerificationCodeInput
      key={retryCount}
      saving={saving}
      onSubmit={onSubmit}
    />
    <p className='a_c p_n mt_md mb_df rel'>
      {i18n.t('auth.confirm_verification_code_instr')}
    </p>
    <div className='a_c h_center'>
      <button
        disabled={saving}
        onClick={() => setSignInIface('VERIFY_PHONE')}
        className='text ft_sm cl_md link'
      >
        {i18n.t('auth.resend_verification_code')}
      </button>
    </div>
  </>;
}

/**
 * Sign in form
 */

type SignInIface = 'VERIFY_PHONE' | 'VERIFY_EMAIL' | 'EMAIL_SENT' | 'VERIFY_PHONE_SENT' | ['VERIFY_PHONE_SENT', string];

export function SignInForm(p: Omit<AuthFormProps, 'setSignInIface'>) {
  const { initialError } = p;
  const errCode = initialError?.errorCode;
  const initialIface = errCode === '20053' ? 'VERIFY_PHONE' : errCode === '20049' ? 'VERIFY_EMAIL' : null;
  const [signInIface_, setSignInIface] = useState<SignInIface | null>(initialIface);
  const ifaceIsArray = Array.isArray(signInIface_);

  switch (ifaceIsArray ? signInIface_[0] : signInIface_) {
    case 'VERIFY_PHONE':
      // Attempted phone login but it was not verified
      return <SendPhoneVerification
        {...p}
        setSignInIface={setSignInIface}
      />;
    case 'VERIFY_PHONE_SENT':
      // User requested phone verification code, and it was sent
      return <ConfirmPhoneVerificationCode
        {...p}
        phoneNumber={ifaceIsArray ? signInIface_[1] : ''}
        setSignInIface={setSignInIface}
      />;
    case 'VERIFY_EMAIL':
      // Attempted email login but it was not verified
      return <RequestTokenizedEmail
        {...p}
        requestType='EMAIL_VERIFICATION'
        setSignInIface={setSignInIface}
      />;
    case 'EMAIL_SENT':
      return <ResetPasswordCompleted
        {...p}
        setSignInIface={setSignInIface}
      />;
    default:
  }

  return <SignInMain
    {...p}
    setSignInIface={setSignInIface}
  />;
}

/**
 * Sign up main form
 */

interface SignUpMainProps extends AuthFormProps {
  setSignUpIface: (iface: SignUpIface) => void;
  setSignUpToken: (token: string | null) => void;
}

function SignUpMain(p: SignUpMainProps) {
  const { authRoutesMap, initialError, setSignUpIface, setSignUpToken } = p;
  const signUpSchema = useMemo(makeSignUpSchema, []);

  const { saving, signUpWithEmail, error, setError, resetErrors } = useSignUpWithEmail({
    initialError,
    onCompleted: (data: any, _: any) => {
      const signUpToken = data?.signUpWithEmail;

      if (signUpToken) {
        setSignUpToken(signUpToken);
      }
    },
    onError: (err: any) => {
      if (err?.errorCode === '20054') {
        setSignUpIface('INVITATION_REQUIRED');
      }
    }
  });

  const onSubmit = async(formValues: any) => {
    signUpWithEmail({
      variables: {
        emailAddress: formValues.email,
        password: formValues.password,
      }
    });
  };

  return (
    <>
      <SchemaForm
        className='pb_df'
        saving={saving}
        schema={signUpSchema}
        // currentData={{}}
        onError={setError}
        onSubmit={onSubmit}
        buttonText={i18n.t('auth.agree_and_continue')}
        FooterComponent={
          <TextWithLinks
            as='div'
            className='ft_xs mt_sm cl_md'
            linkClassName='u link cl_md'
          >
            {i18n.t('auth.sign_up_notice_msg')}
          </TextWithLinks>
        }
      >
        {!error ? null : (
          <ModalErrorMessage
            error={error}
            resetErrors={resetErrors}
            // className='mt_sm'
          />
        )}
      </SchemaForm>

      <div className='a_c h_center'>
        <Link
          to={getAuthRoute('signin', authRoutesMap)}
          replace
          className='text ft_sm cl_md link'
        >
          {i18n.t('auth.log_in_w_existing')}
        </Link>
      </div>
    </>
  );
}

/**
 * Sign up; invitation required
 */

function SignUpInviteRequired(p: AuthFormProps) {
  const { appNamespace } = p;
  const supportEmail = SUPPORT_EMAILS[appNamespace];

  return <ModalSimpleContent
    title={i18n.t('auth.invite_required')}
    iconName='mailbox-filled'
  >
    <TextWithLinks as='p'>
      {i18n.t('auth.invite_required_msg', { emailAddress: supportEmail })}
    </TextWithLinks>
  </ModalSimpleContent>;
}

/**
 * Sign up; success
 */

interface SignUpSuccessProps extends AuthFormProps {
  signUpToken: string;
}

function SignUpSuccess(p: SignUpSuccessProps) {
  const { authRoutesMap, signUpToken } = p;

  return <ModalSimpleContent
    title={i18n.t('auth.account_created')}
    iconName='circle-check-filled'
    className='px_df pt_md'
  >
    <TextWithLinks as='p'>
      {i18n.t('auth.account_created_msg')}
    </TextWithLinks>

    <FullWidthButton
      to={getAuthRoute('signin', authRoutesMap)}
      preset='bg_primary'
      className='mt_lg shadow'
      replace
    >
      {i18n.t('auth.continue_to_login')}
    </FullWidthButton>
  </ModalSimpleContent>;
}

/**
 * Sign up form
 */

type SignUpIface = 'INVITATION_REQUIRED' | null;

export function SignUpForm(p: AuthFormProps) {
  const [signUpToken, setSignUpToken] = useState<string | null>(null);
  const [signUpIface, setSignUpIface] = useState<SignUpIface>(null);

  if (signUpToken) {
    return <SignUpSuccess
      {...p}
      signUpToken={signUpToken}
    />;
  }

  switch (signUpIface) {
    case 'INVITATION_REQUIRED':
      return <SignUpInviteRequired {...p} />;
    default:
  }

  return <SignUpMain
    {...p}
    setSignUpIface={setSignUpIface}
    setSignUpToken={setSignUpToken}
  />;
}
