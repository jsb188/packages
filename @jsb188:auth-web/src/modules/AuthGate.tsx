import type { ServerErrorObj, SimpleErrorType } from '@jsb188/app/types/app.d';
import type { ErrorMessageProps } from '@jsb188/react-web/modules/Layout';
import { FullPageLayout, ErrorMessage } from '@jsb188/react-web/modules/Layout';
import { BigLoading } from '@jsb188/react-web/ui/Loading';
import { useIsLoggedIn } from '@jsb188/react/states';
import i18n from '@jsb188/app/i18n';

/**
 * Auth gate; loading
 */

function AuthGateLoading({ message }: { message?: string }) {
  return <>
    <BigLoading color='active' />
    {message && (
      <p className='mt_df cl_md'>
        {message}
      </p>
    )}
  </>
}

/**
 * Loading or Error interface
 */

interface AuthGateProps extends ErrorMessageProps {
  children: React.ReactNode;
  notLayout?: boolean;
  connectedToServer?: boolean;
  notReady?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  defaultErrorMessage?: string;
  error?: ServerErrorObj | SimpleErrorType | null;
}

export function AuthGate(p: AuthGateProps) {
  const { notReady, loading, loadingMessage, defaultErrorMessage, error, children, notLayout, connectedToServer, ...other } = p;
  const isLoggedIn = useIsLoggedIn();
  const isNetworkError = (error as ServerErrorObj)?.errorCode === 'network_error';

  if (isLoggedIn && !notReady && !error) {
    return children;
  }

  if (notReady || (loading && !isLoggedIn)) {
    if (notLayout) {
      return <AuthGateLoading message={loadingMessage} />;
    }

    return <FullPageLayout>
      <AuthGateLoading message={loadingMessage} />
    </FullPageLayout>;
  }

  if (!isLoggedIn && !isNetworkError) {
    // Gota do log in form here
    // Gota do log in form here
    // Gota do log in form here
    // Gota do log in form here
  }

  // IMPORTANT NOTE:
  // {connectedToServer} is currently always true, passed down from graphql hooks.
  // This is a placeholder logic, and must properly return a real network state in the future.

  let errorCode, errorMessage;
  if (error?.message) {
    errorMessage = error.message;
  } else if (isNetworkError || (!connectedToServer && isLoggedIn)) {
    errorCode = 'network_error';
    errorMessage = i18n.t('error.network_error');
  } else if (!isLoggedIn) {
    errorCode = '20019';
    errorMessage = i18n.t('error.20019');
  } else {
    errorMessage = defaultErrorMessage;
  }

  const errorProps = {
    ...error,
    ...other,
    errorCode,
    message: errorMessage
  };

  if (notLayout) {
    return <ErrorMessage {...errorProps} />;
  }

  return <FullPageLayout>
    <ErrorMessage {...errorProps} />
  </FullPageLayout>;
}
