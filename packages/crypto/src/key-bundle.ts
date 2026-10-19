import type { PublicEncryptionKey } from './schemas';
import type { WrappedUserKey } from './schemas/user-key';

export interface EncryptionKeyBundleUser {
  publicKey: PublicEncryptionKey | null;
  encryptedUserKey: WrappedUserKey | null;
  userKeyVersion: number | null;
}

export type EncryptionReadyUser<T extends EncryptionKeyBundleUser = EncryptionKeyBundleUser> = T & {
  publicKey: PublicEncryptionKey;
  encryptedUserKey: WrappedUserKey;
  userKeyVersion: number;
};

export function hasEncryptionKeyBundle<T extends EncryptionKeyBundleUser>(
  user?: T | null,
): user is EncryptionReadyUser<T> {
  /**
   * API enforces all four DB fields, including its private key_auth_hash verifier.
   */
  return (
    !!user?.publicKey &&
    !!user.encryptedUserKey &&
    user.userKeyVersion !== null &&
    user.userKeyVersion === user.encryptedUserKey.keyVersion
  );
}

export function assertEncryptionKeyBundle<T extends EncryptionKeyBundleUser>(
  user?: T | null,
): asserts user is EncryptionReadyUser<T> {
  if (!hasEncryptionKeyBundle(user)) {
    throw new Error('Encryption key bundle is not initialized');
  }
}
