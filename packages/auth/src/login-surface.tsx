import { type AuthActionResult, AuthLoginPage, type AuthMode } from '@comitium/ui/auth-login-page';
import { PageLoader } from '@comitium/ui/page-loader';
import { useEffect, useRef, useState } from 'react';

import { sendSignInCode, signInWithGoogle, verifySignInCode } from './auth-actions';
import { useAuthClient } from './auth-context';
import { unwrapAuthResult } from './auth-result';
import { buildAuthRoute, resolveNonAuthReturnTo } from './navigation';
import { type RecoverSession, SessionRecovery } from './session-recovery';

interface AuthSessionState {
  isSessionLoading: boolean;
  isSignedIn: boolean;
  needsSessionRecovery: boolean;
}

interface AuthLoginSurfaceProps {
  defaultReturnTo: string;
  homeHref: string;
  homeLabel: string;
  mode: AuthMode;
  navigate: (destination: string) => void;
  privacyHref: string;
  recoverSession: RecoverSession;
  returnTo?: string;
  session: AuthSessionState;
  termsHref: string;
}

export function AuthLoginSurface({
  defaultReturnTo,
  homeHref,
  homeLabel,
  mode,
  navigate,
  privacyHref,
  recoverSession,
  returnTo,
  session,
  termsHref,
}: AuthLoginSurfaceProps) {
  const client = useAuthClient();
  const emailAddress = useRef('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const destination = resolveNonAuthReturnTo(returnTo, defaultReturnTo);
  const oauthErrorMessage =
    mode === 'sign-in'
      ? 'We could not sign you in with Google. Try again or create an account.'
      : 'We could not create your account with Google. Try again or sign in instead.';

  const authPath = mode === 'sign-in' ? '/login' : '/signup';
  const alternateAuthPath = mode === 'sign-in' ? '/signup' : '/login';
  const alternateAuthHref = buildAuthRoute(alternateAuthPath, destination);

  useEffect(() => {
    if (!session.isSessionLoading && session.isSignedIn) {
      navigate(destination);

      return;
    }

    if (returnTo && returnTo !== destination) {
      navigate(authPath);
    }
  }, [authPath, destination, navigate, returnTo, session.isSessionLoading, session.isSignedIn]);

  async function handleSendCode(email: string): Promise<AuthActionResult> {
    try {
      await sendSignInCode(client, email, mode);

      emailAddress.current = email;

      return { ok: true };
    } catch {
      return authError(
        mode === 'sign-in'
          ? 'We could not sign you in. Try again or create an account.'
          : 'We could not create your account. Try again or sign in instead.',
      );
    }
  }

  async function handleVerifyCode(code: string): Promise<AuthActionResult> {
    try {
      await verifySignInCode(client, emailAddress.current, code, mode);

      return { ok: true };
    } catch {
      return authError(
        mode === 'sign-in'
          ? 'We could not sign you in. Try again or create an account.'
          : 'The code is invalid or has expired.',
      );
    }
  }

  async function handleGoogleLogin(): Promise<AuthActionResult> {
    try {
      await signInWithGoogle(
        client,
        mode,
        new URL(destination, window.location.origin).href,
        new URL(buildAuthRoute(authPath, destination), window.location.origin).href,
      );

      setIsRedirecting(true);

      return { ok: true };
    } catch {
      return authError(oauthErrorMessage);
    }
  }

  async function handlePasskeyLogin(): Promise<AuthActionResult> {
    try {
      unwrapAuthResult(await client.signIn.passkey());

      return { ok: true };
    } catch {
      return authError('We could not sign you in with a passkey. Try again or create an account.');
    }
  }

  const oauthError =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('error')
      ? oauthErrorMessage
      : null;

  if (isRedirecting || session.isSessionLoading || session.isSignedIn) {
    return <PageLoader />;
  }

  if (session.needsSessionRecovery) {
    return <SessionRecovery recoverSession={recoverSession} returnTo={buildAuthRoute(authPath, destination)} />;
  }

  return (
    <AuthLoginPage
      alternateAuthHref={alternateAuthHref}
      authError={oauthError}
      homeHref={homeHref}
      homeLabel={homeLabel}
      mode={mode}
      privacyHref={privacyHref}
      termsHref={termsHref}
      onSendCode={handleSendCode}
      onVerifyCode={handleVerifyCode}
      onGoogleLogin={handleGoogleLogin}
      onPasskeyLogin={handlePasskeyLogin}
    />
  );
}

function authError(message: string): AuthActionResult {
  return { ok: false, error: message };
}
