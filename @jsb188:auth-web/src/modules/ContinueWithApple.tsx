import { useCallback, useEffect, useRef } from 'react';
import { getTimeBasedUnique } from '@jsb188/app/utils/string.ts';
import { getENVVariable } from '@jsb188/app';

/**
 * Types
 */

interface AppleLoginProps {
  scriptLoaded: boolean;
  scope?: string;
  onSuccess?: (res: any) => void;
  onError?: (err: any) => void;
  onNonOAuthError?: (err: any) => void;
  overrideScope?: boolean;
  state?: string;
}

/**
 * Apple OAuth login
 */

function useAppleLogin(p: AppleLoginProps) {
  const {
    scriptLoaded,
    scope = '',
    onSuccess,
    onError,
    onNonOAuthError,
    overrideScope,
    state,
    ...props
  } = p;

  const clientRef = useRef<any>();

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onNonOAuthErrorRef = useRef(onNonOAuthError);
  onNonOAuthErrorRef.current = onNonOAuthError;

  useEffect(() => {
    if (scriptLoaded) {
      const client = globalThis.google?.accounts?.oauth2.initTokenClient({
        client_id: getENVVariable('GOOGLE_OAUTH'),
        scope: overrideScope ? scope : `openid profile email ${scope}`,
        callback: (response) => {
          if (response.error) {
            return onErrorRef.current?.(response);
          }
          onSuccessRef.current?.(response as any);
        },
        error_callback: (nonOAuthError) => {
          onNonOAuthErrorRef.current?.(nonOAuthError);
        },
        state,
        ...props,
      });

      clientRef.current = client;
    }
  }, [scriptLoaded, scope, state]);

  return useCallback((overrideConfig?: object) => {
    clientRef.current?.requestAccessToken(overrideConfig);
  }, []);
}

/**
 * Web sign in with Apple
 */

function useContinueWithApple(Cmp) {
  function WebSignInWithApple(p) {

    const onInitiateAppleSignIn = () => {
      globalThis.location.href = (
        'https://appleid.apple.com/auth/authorize' +
        '?client_id=' + getENVVariable('APPLE_APP_ID') +
        '&redirect_uri=' + encodeURIComponent('https://bigplanet.ai/auth/apple') +
        '&response_type=' + encodeURIComponent('code id_token') +
        '&state=' + getTimeBasedUnique() +
        '&scope=' + encodeURIComponent('email name') +
        '&response_mode=form_post'
        // '&frame_id'=36394414-f7d7-4021-8f98-64e7be74e283&m=11&v=1.5.5'
      );
    };

    return (
      <Cmp
        {...p}
        onInitiateAppleSignIn={onInitiateAppleSignIn}
      />
    );
  }

  // return composeSignInWithApple(WebSignInWithApple);
  return WebSignInWithApple;
}

export default useContinueWithApple = useContinueWithApple;
