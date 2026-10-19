import type { IdentityClient } from './auth-client';
import { unwrapAuthResult } from './auth-result';

export async function sendSignInCode(client: IdentityClient, email: string) {
  return unwrapAuthResult(await client.emailOtp.sendVerificationOtp({ email, type: 'sign-in' }));
}

export async function verifySignInCode(client: IdentityClient, email: string, otp: string) {
  return unwrapAuthResult(await client.signIn.emailOtp({ email, otp }));
}

export async function signInWithGoogle(client: IdentityClient, callbackURL: string, errorCallbackURL: string) {
  return unwrapAuthResult(
    await client.signIn.social({
      provider: 'google',
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL,
    }),
  );
}
