import type { WrappedPersonalKey } from './personal-key';
import type { PublicEncryptionKey } from './schemas';

export interface EncryptionKeyBundleUser {
  publicKey: PublicEncryptionKey | null;
  encryptedPersonalKey: WrappedPersonalKey | null;
}

export type EncryptionReadyUser<T extends EncryptionKeyBundleUser = EncryptionKeyBundleUser> = T & {
  publicKey: PublicEncryptionKey;
  encryptedPersonalKey: WrappedPersonalKey;
};

export function hasEncryptionKeyBundle<T extends EncryptionKeyBundleUser>(
  user?: T | null,
): user is EncryptionReadyUser<T> {
  return !!user?.publicKey && !!user.encryptedPersonalKey;
}

export function assertEncryptionKeyBundle<T extends EncryptionKeyBundleUser>(
  user?: T | null,
): asserts user is EncryptionReadyUser<T> {
  if (!hasEncryptionKeyBundle(user)) {
    throw new Error('Encryption key bundle is not initialized');
  }
}
