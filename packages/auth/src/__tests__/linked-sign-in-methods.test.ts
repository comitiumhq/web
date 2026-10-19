import { describe, expect, it } from 'vitest';
import type { IdentityUser } from '../auth-client';
import { canUnlinkGoogle, getLinkedSignInMethods } from '../linked-sign-in-methods';
import { linkedAuthAccountsSchema } from '../schemas/identity';
import { AUTH_USER_ID } from './identity-fixtures';

const user: IdentityUser = {
  id: AUTH_USER_ID,
  email: 'person@example.com',
  emailVerified: true,
  name: '',
  createdAt: new Date('2026-10-19T10:00:00Z'),
  updatedAt: new Date('2026-10-19T10:00:00Z'),
};
const google = { id: 'local-google-account-id', providerId: 'google' };
const passkeys = [{ id: 'first' }, { id: 'second' }];

describe('native linked sign-in methods', () => {
  it('uses the verified login email and preserves multiple passkeys', () => {
    const methods = getLinkedSignInMethods(user, [google], passkeys);

    expect(methods.email).toEqual({ address: user.email });
    expect(methods.google).toEqual({ accountId: google.id });
    expect(methods.passkeys).toEqual(passkeys);
  });

  it('uses the local account row ID for unlink rather than the external Google subject', () => {
    const accounts = linkedAuthAccountsSchema.parse([{ ...google, accountId: 'external-google-subject' }]);

    expect(getLinkedSignInMethods(user, accounts, []).google?.accountId).toBe(google.id);
  });

  it('never offers an unverified email as the remaining OTP sign-in method', () => {
    const methods = getLinkedSignInMethods({ ...user, emailVerified: false }, [google], passkeys);

    expect(methods.email).toBeNull();
    expect(canUnlinkGoogle(methods)).toBe(false);
  });

  it('allows removing Google only while verified email OTP remains', () => {
    expect(canUnlinkGoogle(getLinkedSignInMethods(user, [google], []))).toBe(true);
    expect(canUnlinkGoogle(getLinkedSignInMethods(user, [], passkeys))).toBe(false);
  });
});
