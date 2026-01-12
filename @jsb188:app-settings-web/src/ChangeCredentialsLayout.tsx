import i18n from '@jsb188/app/i18n';
import { useConfirmPassword } from '@jsb188/graphql/hooks/use-auth-mtn';
import { Input } from '@jsb188/react-web/modules/Form';
import { AlertPopUp, ModalErrorMessage } from '@jsb188/react-web/ui/ModalUI';
import type { ModalPopUpComponentProps } from '@jsb188/react/states';
import { useState } from 'react';

/**
 * Types
 */

export interface ConfirmPasswordProps extends ModalPopUpComponentProps {
	confirmPasswordTitle?: string;
	confirmPasswordMessage?: string;
}

export interface ChangeCredentialsFinishedProps extends ModalPopUpComponentProps {
  finishedIconName?: string;
  finishedTitle?: string;
  finishedMessage?: string;
}

export interface ChangeCredentialsProps extends ConfirmPasswordProps {
	iconName: string;
	skipPassword?: boolean;
  title: string;
  message: string;

  finishedIconName?: string;
  finishedTitle?: string;
  finishedMessage?: string;

  verifyIconName?: string;
  verifyTitle?: string;
  verifyMessage?: string;

  confirmText?: string;
  status: 'WAITING_FOR_INPUT' | 'WAITING_FOR_VERIFICATION' | 'WAITING_FOR_CODE' | 'FINISHED';
  onSubmit: (values: string[]) => void;

  loading?: boolean;
  error: any;
  resetErrors: () => void;
  inputs: {
    label: string;
    placeholder?: string;
  }[];
}

/**
 * Confirm password before changinge sensitive account settings
 */

function ConfirmPasswordForm(p: ConfirmPasswordProps & {
  setPasswordVerified: (verified: boolean) => void;
}) {
	const { setPasswordVerified, onCloseModal, confirmPasswordTitle, confirmPasswordMessage } = p;
  const [password, setPassword] = useState('');

  const { confirmPassword, error, resetErrors, saving } = useConfirmPassword({
    onCompleted: (data: any) => {
      if (data.confirmPassword) {
        setPasswordVerified(true);
      }
    },
    onError: () => {
      setPassword('');
    }
  });

  const onConfirmPassword = () => {
    confirmPassword({
      variables: {
        password,
      }
    });
  };

  const onPressEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password) {
      onConfirmPassword();
    }
  }

	return <AlertPopUp
    loading={saving}
		iconName='password-lock-1'
		confirmText={i18n.t('form.authenticate')}
    cancelText={i18n.t('form.cancel')}
    onConfirm={onConfirmPassword}
		onCancel={onCloseModal}
    disabledConfirm={!password}
		title={confirmPasswordTitle ?? i18n.t('account.enter_password')}
		message={confirmPasswordMessage ?? i18n.t('account.enter_password_msg')}
	>
		{error && (
			<div className='px_md mt_md -mb_df'>
				<ModalErrorMessage
					error={error}
					resetErrors={resetErrors}
				/>
			</div>
		)}

    <div className='mt_df mx_md'>
      <Input
        type='password'
        label={i18n.t('account.password')}
        placeholder='••••'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={onPressEnter}
        autoFocus
      />
    </div>
  </AlertPopUp>;
}

/**
 * Change account settings that require confirmations (such as credentials)
 */

export function ChangeCredentialsLayout(p: ChangeCredentialsProps) {
	const {
    iconName, skipPassword, title, message, confirmText, loading, error, resetErrors, inputs, onSubmit, status,
    finishedIconName, finishedTitle, finishedMessage,
    verifyIconName, verifyTitle, verifyMessage,
    ...rest
  } = p;
  const { onCloseModal } = rest;
	const [passwordVerified, setPasswordVerified] = useState(false);
  const [values, setValues] = useState(['', '']);

  switch (status) {
    case 'FINISHED':
      return <AlertPopUp
        onCloseModal={onCloseModal}
        iconName={finishedIconName || 'circle-check'}
        onCancel={onCloseModal}
        title={finishedTitle || i18n.t('form.success_')}
        message={finishedMessage || i18n.t('form.your_request_is_completed_msg')}
      />;
    case 'WAITING_FOR_CODE':
      return 'waiting for code';
    case 'WAITING_FOR_VERIFICATION':
      return <AlertPopUp
        onCloseModal={onCloseModal}
        iconName={verifyIconName || iconName}
        onCancel={onCloseModal}
        title={verifyTitle || i18n.t('form.please_verify')}
        message={verifyMessage || i18n.t('form.request_will_complete_once_verified_msg')}
      />;
    case 'WAITING_FOR_INPUT':
    default:
  }

	if (!passwordVerified && !skipPassword) {
		return <ConfirmPasswordForm
			{...rest}
      setPasswordVerified={setPasswordVerified}
		/>;
	}

  const hasTwoInputs = inputs.length >= 2;
  const hasValidInputs = !!(hasTwoInputs ? values[0]?.trim() && values[1]?.trim() : values[0]?.trim());

  const onPressEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasValidInputs) {
      onSubmit(values);
    }
  };

	return <AlertPopUp
		iconName={iconName}
		doNotExitOnConfirm
    loading={loading}
		onCloseModal={onCloseModal}
    onConfirm={() => onSubmit(values)}
    title={title}
    message={message}
    confirmText={confirmText}
    cancelText={i18n.t('form.cancel')}
    disabledConfirm={!hasValidInputs}
	>
    {error && (
      <div className='px_md mt_md -mb_df'>
        <ModalErrorMessage
          error={error}
          resetErrors={resetErrors}
        />
      </div>
    )}

    <div className='mt_df mx_md'>
      {inputs.map((obj, i) => {
        return <Input
          key={i}
          type='text'
          {...obj}
          value={values[i]}
          onChange={(e) => {
            const newValues = [...values];
            newValues[i] = e.target.value;
            setValues(newValues);
          }}
          onKeyDown={onPressEnter}
          autoFocus={!i}
        />
      })}
    </div>
	</AlertPopUp>;
};
