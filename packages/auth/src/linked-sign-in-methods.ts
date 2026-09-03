import type { LinkedAccountWithMetadata, User } from '@privy-io/react-auth';

type EmailAccount = Extract<LinkedAccountWithMetadata, { type: 'email' }>;
type GoogleAccount = Extract<LinkedAccountWithMetadata, { type: 'google_oauth' }>;
type PasskeyAccount = Extract<LinkedAccountWithMetadata, { type: 'passkey' }>;

export interface LinkedSignInMethods {
  email: EmailAccount | null;
  google: GoogleAccount | null;
  passkeys: PasskeyAccount[];
}

export function getLinkedSignInMethods(user: User | null | undefined): LinkedSignInMethods {
  const methods: LinkedSignInMethods = {
    email: null,
    google: null,
    passkeys: [],
  };

  for (const account of user?.linkedAccounts ?? []) {
    if (account.type === 'email') {
      methods.email = account;
    } else if (account.type === 'google_oauth') {
      methods.google = account;
    } else if (account.type === 'passkey') {
      methods.passkeys.push(account);
    }
  }

  return methods;
}

export function hasLinkedPasskey(user: User | null | undefined): boolean {
  return getLinkedSignInMethods(user).passkeys.length > 0;
}

export function hasLinkedEmailSignIn(user: User | null | undefined): boolean {
  const methods = getLinkedSignInMethods(user);

  return methods.email !== null || methods.google !== null;
}

export function isRampAccountReady(user: User | null | undefined): boolean {
  return hasLinkedPasskey(user) && hasLinkedEmailSignIn(user);
}

export function canUnlinkGoogle(methods: LinkedSignInMethods): boolean {
  return methods.google !== null && methods.email !== null;
}
