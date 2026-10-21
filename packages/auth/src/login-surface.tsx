import { ApiError } from '@comitium/schemas/api-errors';
import { type AuthActionResult, AuthLoginPage } from '@comitium/ui/auth-login-page';
import { PageLoader } from '@comitium/ui/page-loader';
import { useEffect, useRef, useState } from 'react';

import { getAuthActionError } from './auth-action-error';
import { sendSignInCode, signInWithGoogle, verifySignInCode } from './auth-actions';
import { useAuthClient } from './auth-context';
import { unwrapAuthResult } from './auth-result';
import { getSessionUser } from './fresh-auth-session';
import { buildAuthRoute, resolveNonAuthReturnTo } from './navigation';

interface AuthSessionState {
  isSessionLoading: boolean;
  isSignedIn: boolean;
}

interface AuthLoginSurfaceProps {
  defaultReturnTo: string;
  homeHref: string;
  homeLabel: string;
  navigate: (destination: string) => void;
  privacyHref: string;
  returnTo?: string;
  session: AuthSessionState;
  termsHref: string;
}

export function AuthLoginSurface({
  defaultReturnTo,
  homeHref,
  homeLabel,
  navigate,
  privacyHref,
  returnTo,
  session,
  termsHref,
}: AuthLoginSurfaceProps) {
  const client = useAuthClient();
  const nativeSession = client.useSession();
  const emailAddress = useRef('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const destination = resolveNonAuthReturnTo(returnTo, defaultReturnTo);
  const callbackError = new URLSearchParams(window.location.search).get('error');
  const passkeyUnavailableReason =
    typeof PublicKeyCredential === 'undefined' ? getAuthActionError('PASSKEY_NOT_SUPPORTED', 'passkey') : null;

  useEffect(() => {
    if (!session.isSessionLoading && session.isSignedIn) {
      navigate(destination);

      return;
    }

    if (returnTo && returnTo !== destination) {
      navigate('/login');
    }
  }, [destination, navigate, returnTo, session.isSessionLoading, session.isSignedIn]);

  async function recoverSignIn(expectedEmail?: string): Promise<boolean> {
    await nativeSession.refetch();

    const user = getSessionUser(client);

    return Boolean(user && (!expectedEmail || user.email.toLowerCase() === expectedEmail.toLowerCase()));
  }

  async function handleSendCode(email: string): Promise<AuthActionResult> {
    try {
      await sendSignInCode(client, email);

      emailAddress.current = email;

      return { ok: true };
    } catch (error) {
      return { ok: false, error: getAuthActionError(error, 'send-code') };
    }
  }

  async function handleVerifyCode(code: string): Promise<AuthActionResult> {
    try {
      await verifySignInCode(client, emailAddress.current, code);

      return { ok: true };
    } catch (error) {
      const signInMayHaveSucceeded = !(error instanceof ApiError) || error.status >= 500;

      if (signInMayHaveSucceeded && (await recoverSignIn(emailAddress.current))) {
        return { ok: true };
      }

      return { ok: false, error: getAuthActionError(error, 'verify-code') };
    }
  }

  async function handleGoogleLogin(): Promise<AuthActionResult> {
    try {
      await signInWithGoogle(
        client,
        new URL(destination, window.location.origin).href,
        new URL(buildAuthRoute(destination), window.location.origin).href,
      );

      setIsRedirecting(true);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: getAuthActionError(error, 'google') };
    }
  }

  async function handlePasskeyLogin(): Promise<AuthActionResult> {
    try {
      unwrapAuthResult(await client.signIn.passkey());

      return { ok: true };
    } catch (error) {
      const uncertain = !(error instanceof ApiError) || error.status >= 500 || error.code === 'AUTH_CANCELLED';

      if (uncertain && (await recoverSignIn())) {
        return { ok: true };
      }

      return { ok: false, error: getAuthActionError(error, 'passkey') };
    }
  }

  if (isRedirecting || session.isSessionLoading || session.isSignedIn) {
    return <PageLoader />;
  }

  return (
    <AuthLoginPage
      authError={callbackError ? getAuthActionError(callbackError, 'google') : null}
      homeHref={homeHref}
      homeLabel={homeLabel}
      passkeyUnavailableReason={passkeyUnavailableReason}
      privacyHref={privacyHref}
      termsHref={termsHref}
      onSendCode={handleSendCode}
      onVerifyCode={handleVerifyCode}
      onGoogleLogin={handleGoogleLogin}
      onPasskeyLogin={handlePasskeyLogin}
    />
  );
}
