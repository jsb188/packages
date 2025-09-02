import { getENVVariable } from '@jsb188/app';
import { getTimeBasedUnique } from '@jsb188/app/utils/string';
import { useMutation } from '@jsb188/graphql/client';
import { continueWithGoogleMtn } from '@jsb188/graphql/mutations';
import type { OnErrorGQLFn } from '@jsb188/graphql/types.d';
import { AppContext, onAccountLogin, useOpenModalPopUp } from '@jsb188/react/states';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Types
 */

interface ContinueWithGoogleParams {
  doNotAlertErrors?: boolean;
  onFinishSignIn: (token: string) => void;
}

interface GoogleLoginHookParams extends ContinueWithGoogleParams {
  scriptLoaded: boolean;
  scope?: string;
  onError?: OnErrorGQLFn;
  onNonOAuthError?: (err: any) => void;
  overrideScope?: boolean;
  state?: string;
}

/**
 * Google OAuth login
 */

function useGoogleLogin(p: GoogleLoginHookParams) {
  const {
    scriptLoaded,
    scope = '',
    onError,
    onNonOAuthError,
    onFinishSignIn,
    overrideScope,
    state,
    doNotAlertErrors,
    ...props
  } = p;

  const { dispatchApp } = useContext(AppContext);
  const openModalPopUp = useOpenModalPopUp();
  const [continueWithGoogle, { saving }] = useMutation(
    continueWithGoogleMtn,
    {
      openModalPopUp: doNotAlertErrors ? null : openModalPopUp,
      // NOTE: If you replace onError function, it will disable the popup when there's an error
      onError,
      onCompleted: (data) => {
        const result = data?.continueWithGoogle;

        if (result?.token && result.account?.id) {
          onAccountLogin(result, dispatchApp);
          onFinishSignIn(result?.token);
        }
      },
    },
  );

  const clientRef = useRef<any>(null);
  const onErrorRef = useRef(onError);

  onErrorRef.current = onError;

  const onNonOAuthErrorRef = useRef(onNonOAuthError);
  onNonOAuthErrorRef.current = onNonOAuthError;

  useEffect(() => {
    if (scriptLoaded) {
      // If using this package, it is expected that you install your own Google OAuth script
      const client = globalThis.google?.accounts?.oauth2.initTokenClient({
        client_id: getENVVariable('GOOGLE_OAUTH'),
        scope: overrideScope ? scope : `openid profile email ${scope}`,
        callback: (response: any) => {
          if (response.error) {
            return onErrorRef.current?.(response, null);
          }

          const { access_token: oauthToken } = response;
          continueWithGoogle({
            variables: {
              oauthToken,
            },
          });
        },
        error_callback: (nonOAuthError: any) => {
          onNonOAuthErrorRef.current?.(nonOAuthError);
        },
        state,
        ...props,
      });

      clientRef.current = client;
    }
  }, [scriptLoaded, scope, state]);

  const onInitiateGoogleSignIn = useCallback((overrideConfig?: object) => {
    clientRef.current?.requestAccessToken(overrideConfig);
  }, []);

  return {
    onInitiateGoogleSignIn,
    waitingForOAuth: saving,
  };
}

/**
 * Web sign in with Google
 */

export function useContinueWithGoogle(params: ContinueWithGoogleParams) {
  const { doNotAlertErrors, onFinishSignIn } = params;
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://accounts.google.com/gsi/client';
    scriptTag.async = true;
    scriptTag.defer = true;
    // scriptTag.nonce = nonce;

    scriptTag.onload = () => {
      setScriptLoaded(true);
    };
    scriptTag.onerror = () => {
      setScriptLoaded(false);
    };

    document.body.appendChild(scriptTag);
    return () => {
      document.body.removeChild(scriptTag);
    };
  }, []);

  const { onInitiateGoogleSignIn, waitingForOAuth } = useGoogleLogin({
    doNotAlertErrors,
    onFinishSignIn,
    scriptLoaded,
  });

  return {
    waitingForOAuth,
    onInitiateGoogleSignIn,
    scriptLoaded
  };
}

/**
 * Web sign in with Apple
 */

export function useContinueWithApple() {

  const onInitiateAppleSignIn = () => {
    globalThis.location.href = (
      'https://appleid.apple.com/auth/authorize' +
      '?client_id=' + getENVVariable('APPLE_APP_ID') +
      '&redirect_uri=' + encodeURIComponent(getENVVariable('APP_URL') + 'auth/apple') +
      '&response_type=' + encodeURIComponent('code id_token') +
      '&state=' + getTimeBasedUnique() +
      '&scope=' + encodeURIComponent('email name') +
      '&response_mode=form_post'
      // '&frame_id'=36394414-f7d7-4021-8f98-64e7be74e283&m=11&v=1.5.5'
    );
  };

  return {
    onInitiateAppleSignIn
  };
}
