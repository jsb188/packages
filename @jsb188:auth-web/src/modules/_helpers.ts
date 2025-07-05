
/**
 * Types
 */

export type AuthPageName = 'signin' | 'signin_success' | 'signup' | 'signup_success' | 'reset_password' | 'welcome';

/**
 * Helper; get route path
 */

export function getAuthRoute(
  pageName: AuthPageName,
  authRoutesMap?: Record<AuthPageName, string>,
  queryStr?: string
) {
  const defaultAuthRoutesMap: Record<AuthPageName, string> = {
    signin: '/auth/login',
    signin_success: '/auth/success',
    signup: '/auth/signup',
    signup_success: '/auth/signup-finished',
    reset_password: '/auth/reset-password',
    welcome: '/auth/welcome',
  };

  const pathname = authRoutesMap?.[pageName] || defaultAuthRoutesMap[pageName] || 'auth';
  return queryStr ? `${pathname}?${queryStr}` : pathname;
}
