import i18n from '@jsb188/app/i18n';
import { SpecialIcon } from '@jsb188/react-web/icons';
import { FullWidthButton } from '@jsb188/react-web/ui/Button';
import { useContinueWithGoogle, useContinueWithApple } from '../hooks/use-oauth';

/**
 * Google OAuth button
 */

export const ContinueWithGoogle = (p: any) => {
  const { onFinishSignIn } = p;
  const { onInitiateGoogleSignIn, waitingForOAuth } = useContinueWithGoogle({
    onFinishSignIn
  });

  return (
    <FullWidthButton
      loading={waitingForOAuth}
      onClick={onInitiateGoogleSignIn}
      preset='em'
      className='mb_sm'
      IconComponent={SpecialIcon}
      iconName='google'
    >
      {i18n.t('auth.continue_with_google')}
    </FullWidthButton>
  );
};

/**
 * Apple OAuth button
 */

export const ContinueWithApple = (p: any) => {
  const { onInitiateAppleSignIn } = useContinueWithApple();

  return (
    <FullWidthButton
      onClick={onInitiateAppleSignIn}
      preset='em'
      className='mb_sm'
      iconName='brand-apple-filled'
    >
      {i18n.t('auth.continue_with_apple')}
    </FullWidthButton>
  );
};

/**
 * Apple OAuth button
 */

export const ContinueWithPhone = (p: any) => {
  const { onClickButton } = p;
  return (
    <FullWidthButton
      onClick={onClickButton}
      preset='em'
      className='mb_sm'
      iconName='phone-filled'
    >
      {i18n.t('auth.continue_with_phone')}
    </FullWidthButton>
  );
};
