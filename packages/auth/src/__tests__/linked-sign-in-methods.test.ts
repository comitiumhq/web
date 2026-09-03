import type { LinkedAccountWithMetadata, User } from '@privy-io/react-auth';
import { describe, expect, it } from 'vitest';

import {
  canUnlinkGoogle,
  getLinkedSignInMethods,
  hasLinkedEmailSignIn,
  hasLinkedPasskey,
  isRampAccountReady,
} from '../linked-sign-in-methods';

function account(value: Partial<LinkedAccountWithMetadata> & Pick<LinkedAccountWithMetadata, 'type'>) {
  return value as LinkedAccountWithMetadata;
}

function user(...linkedAccounts: LinkedAccountWithMetadata[]) {
  return { linkedAccounts } as User;
}

const email = account({ type: 'email', address: 'person@example.com' });
const google = account({ type: 'google_oauth', email: 'person@gmail.com', subject: 'google-subject' });
const passkey = account({ type: 'passkey', credentialId: 'credential', enrolledInMfa: false });
const wallet = account({ type: 'wallet', address: '0x1234' });

describe('getLinkedSignInMethods', () => {
  it('selects only supported sign-in methods and preserves multiple passkeys', () => {
    const secondPasskey = account({ type: 'passkey', credentialId: 'second', enrolledInMfa: false });
    const methods = getLinkedSignInMethods(user(wallet, email, passkey, google, secondPasskey));

    expect(methods.email).toBe(email);
    expect(methods.google).toBe(google);
    expect(methods.passkeys).toEqual([passkey, secondPasskey]);
  });

  it('returns an empty method set without a user', () => {
    expect(getLinkedSignInMethods(null)).toEqual({ email: null, google: null, passkeys: [] });
  });
});

describe('sign-in readiness policies', () => {
  it('counts email OTP or Google as an email-based sign-in method', () => {
    expect(hasLinkedEmailSignIn(user(email))).toBe(true);
    expect(hasLinkedEmailSignIn(user(google))).toBe(true);
    expect(hasLinkedEmailSignIn(user(wallet))).toBe(false);
  });

  it('derives passkey presence from linked accounts rather than MFA enrollment', () => {
    const mfaPasskey = account({ type: 'passkey', credentialId: 'mfa-passkey', enrolledInMfa: true });

    expect(hasLinkedPasskey(user(passkey))).toBe(true);
    expect(hasLinkedPasskey(user(mfaPasskey))).toBe(true);
    expect(hasLinkedPasskey(user(wallet))).toBe(false);
  });

  it('requires a passkey and an email-based method for a future ramp action', () => {
    expect(isRampAccountReady(user(passkey, email))).toBe(true);
    expect(isRampAccountReady(user(passkey, google))).toBe(true);
    expect(isRampAccountReady(user(passkey))).toBe(false);
    expect(isRampAccountReady(user(email))).toBe(false);
    expect(isRampAccountReady(user(wallet))).toBe(false);
  });

  it('allows Google removal only when email OTP remains', () => {
    expect(canUnlinkGoogle(getLinkedSignInMethods(user(google, email)))).toBe(true);
    expect(canUnlinkGoogle(getLinkedSignInMethods(user(google, passkey)))).toBe(false);
    expect(canUnlinkGoogle(getLinkedSignInMethods(user(google, wallet)))).toBe(false);
    expect(canUnlinkGoogle(getLinkedSignInMethods(user(email, passkey)))).toBe(false);
  });
});
