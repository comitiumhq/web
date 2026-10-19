import type { IdentityUser } from './auth-client';
import type { LinkedAuthAccount, LinkedPasskey } from './schemas/identity';

export interface LinkedSignInMethods {
  email: { address: string } | null;
  google: { accountId: string } | null;
  passkeys: LinkedPasskey[];
}

export function getLinkedSignInMethods(
  user: IdentityUser,
  accounts: LinkedAuthAccount[],
  passkeys: LinkedPasskey[],
): LinkedSignInMethods {
  const google = accounts.find((account) => account.providerId === 'google');

  return {
    email: user.emailVerified ? { address: user.email } : null,
    google: google ? { accountId: google.id } : null,
    passkeys,
  };
}

export function canUnlinkGoogle(methods: LinkedSignInMethods): boolean {
  return methods.google !== null && methods.email !== null;
}
