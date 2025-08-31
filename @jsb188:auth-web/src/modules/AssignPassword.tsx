import i18n from '@jsb188/app/i18n';
import { useChangeAccountPassword } from '@jsb188/graphql/hooks/use-auth-mtn';
import SchemaForm from '@jsb188/react-web/modules/SchemaForm';
import { FullWidthButton } from '@jsb188/react-web/ui/Button';
import { FullPageLayout } from '@jsb188/react-web/ui/Layout';
import { TextWithLinks } from '@jsb188/react-web/ui/Markdown';
import { ModalErrorMessage, ModalSimpleContent } from '@jsb188/react-web/ui/ModalUI';
import { useMemo, useState } from 'react';
import { AuthFormContainer } from './AuthFormUI';
import { makeAssignPasswordSchema } from './schemas';

/**
 * Loading or Error interface
 */

export function AssignPasswordPage() {
  const assignPasswordSchema = useMemo(makeAssignPasswordSchema, []);
  const [success, setSuccess] = useState(false);

  const { account, changeAccountPassword, onFinishChangeAccountPassword, saving, error, setError, resetErrors } = useChangeAccountPassword({
    doNotFinishForm: true,
    onCompleted: (passwordChanged: boolean) => {
      if (passwordChanged) {
        setSuccess(true);
      }
    }
  });

  const identifier = account?.email?.address || account?.phone?.number || account?.id;
  const onSubmit = (fv: any) => {
    changeAccountPassword({
      variables: {
        currentPassword: '',
        password: fv.password,
      }
    });
  };

  return <FullPageLayout className='pattern_dots active_bf bg_alt'>
    <AuthFormContainer
      title={i18n.t('auth.one_last_step_')}
      className='bd_5 bd_main'
    >
      {success
      ? <ModalSimpleContent
        title={i18n.t('auth.account_secured_')}
        iconName='password-user'
        className='px_df pt_md'
      >
        <TextWithLinks as='p'>
          {i18n.t('auth.add_password_fin_msg')}
        </TextWithLinks>

        <FullWidthButton
          preset='bg_primary'
          className='mt_lg shadow'
          onClick={onFinishChangeAccountPassword}
        >
          {i18n.t('auth.continue_to_app')}
        </FullWidthButton>
      </ModalSimpleContent>
      : <>
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
      </>}
    </AuthFormContainer>
  </FullPageLayout>;
}
