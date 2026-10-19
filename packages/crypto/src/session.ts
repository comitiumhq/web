import { keyMetadataFingerprint } from './key-context';
import { type WrappedUserKey, wrappedUserKeySchema } from './schemas/user-key';

export interface CryptoSessionIdentity {
  userId: string;
  keyVersion: number;
  encryptedKeyFingerprint: string;
}

export function createCryptoSessionIdentity(wrapped: WrappedUserKey, userId: string): CryptoSessionIdentity {
  const { v, keyVersion, pk } = wrappedUserKeySchema.parse(wrapped);

  return { userId, keyVersion, encryptedKeyFingerprint: keyMetadataFingerprint({ v, keyVersion, pk }) };
}

export function isSameCryptoSession(left: CryptoSessionIdentity | null, right: CryptoSessionIdentity): boolean {
  return (
    left !== null &&
    left.userId === right.userId &&
    left.keyVersion === right.keyVersion &&
    left.encryptedKeyFingerprint === right.encryptedKeyFingerprint
  );
}

export function formatCryptoSessionIdentity(identity: CryptoSessionIdentity): string {
  return `${identity.userId}:${identity.keyVersion}`;
}
