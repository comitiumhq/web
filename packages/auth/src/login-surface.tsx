import { type AuthActionResult, AuthLoginPage, type AuthMode } from '@comitium/ui/auth-login-page';
import { PageLoader } from '@comitium/ui/page-loader';
import { useLoginWithEmail, useLoginWithOAuth, useLoginWithPasskey } from '@privy-io/react-auth';
import { useCallback, useEffect, useMemo } from 'react';

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
  const destination = useMemo(() => resolveNonAuthReturnTo(returnTo, defaultReturnTo), [defaultReturnTo, returnTo]);

  const oauthErrorMessage =
    mode === 'sign-in'
      ? 'We could not sign you in with Google. Try again or create an account.'
      : 'We could not create your account with Google. Try again or sign in instead.';

  const { sendCode, loginWithCode, state: emailLoginState } = useLoginWithEmail();
  const { initOAuth, state: oauthLoginState } = useLoginWithOAuth();

  const { loginWithPasskey, state: passkeyLoginState } = useLoginWithPasskey();
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

  const handleSendCode = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      try {
        await sendCode({ email, disableSignup: mode === 'sign-in' });
        return { ok: true };
      } catch {
        return authError(
          mode === 'sign-in'
            ? 'We could not sign you in. Try again or create an account.'
            : 'We could not create your account. Try again or sign in instead.',
        );
      }
    },
    [mode, sendCode],
  );

  const handleVerifyCode = useCallback(
    async (code: string): Promise<AuthActionResult> => {
      try {
        await loginWithCode({ code });
        return { ok: true };
      } catch {
        return authError(
          mode === 'sign-in'
            ? 'We could not sign you in. Try again or create an account.'
            : 'The code is invalid or has expired.',
        );
      }
    },
    [loginWithCode, mode],
  );

  const handleGoogleLogin = useCallback(async (): Promise<AuthActionResult> => {
    try {
      await initOAuth({ provider: 'google', disableSignup: mode === 'sign-in' });
      return { ok: true };
    } catch {
      return authError(oauthErrorMessage);
    }
  }, [initOAuth, mode, oauthErrorMessage]);

  const handlePasskeyLogin = useCallback(async (): Promise<AuthActionResult> => {
    try {
      await loginWithPasskey();

      return { ok: true };
    } catch {
      return authError('We could not sign you in with a passkey. Try again or create an account.');
    }
  }, [loginWithPasskey]);

  const isCompletingLogin =
    emailLoginState.status === 'done' ||
    oauthLoginState.status === 'loading' ||
    oauthLoginState.status === 'done' ||
    passkeyLoginState.status === 'done';
  const oauthError = oauthLoginState.status === 'error' ? oauthErrorMessage : null;

  if (isCompletingLogin || session.isSessionLoading || session.isSignedIn) {
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
