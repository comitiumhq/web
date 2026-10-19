import type { AuthMode } from '@comitium/ui/auth-login-page';
import type { IdentityClient } from './auth-client';
import { unwrapAuthResult } from './auth-result';

export async function sendSignInCode(client: IdentityClient, email: string, mode: AuthMode) {
  return unwrapAuthResult(
    await client.emailOtp.sendVerificationOtp(
      { email, type: 'sign-in' },
      { query: mode === 'sign-up' ? { mode: 'signup' } : undefined },
    ),
  );
}

export async function verifySignInCode(client: IdentityClient, email: string, otp: string, mode: AuthMode) {
  return unwrapAuthResult(
    await client.signIn.emailOtp({ email, otp }, { query: mode === 'sign-up' ? { mode: 'signup' } : undefined }),
  );
}

export async function signInWithGoogle(
  client: IdentityClient,
  mode: AuthMode,
  callbackURL: string,
  errorCallbackURL: string,
) {
  return unwrapAuthResult(
    await client.signIn.social({
      provider: 'google',
      requestSignUp: mode === 'sign-up',
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL,
    }),
  );
}
