import { createCookieSessionStorage, redirect } from 'react-router';

/**
 * Types
 */

interface ASData {
  auth_token?: string;
}

interface ASFlashData {
  error: string;
  form_data: string;
}

/**
 * Cookie session for Authb
 */

export const AuthSession = createCookieSessionStorage<ASData, ASFlashData>({
  // a Cookie from `createCookie` or the CookieOptions to create one
  cookie: {
    name: '__session',

    // all of these are optional
    // domain: 'remix.run',
    // expires: new Date(Date.now() + 60_000), // Set via {maxAge}
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.APP_SECRET || '?!?!?!?!?!?!?!?!?!?!?!'],
    secure: true,
  },
});

/**
 * Login required loader for Remix applications.
 */

export async function loaderRequiresLogin(request: Request) {
  const session = await AuthSession.getSession(request.headers.get('Cookie'));
  const authToken = session.get('auth_token');

  if (!authToken) {
    return redirect('/auth/login');
  }

  return null;
}
