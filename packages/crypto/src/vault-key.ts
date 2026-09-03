import type { WrappedKey } from './envelope-key';
import { unwrapKeyMaterial, wrapKeyMaterial } from './key-wrapping';
import type { PublicEncryptionKey } from './schemas';
import { assertSupportedAlgorithmSuiteVersion } from './version';
import { deserializePrivateEncryptionKey, generateXWingKeyPair, serializePrivateEncryptionKey } from './xwing';

export interface VaultKeyPair {
  privateKey: Uint8Array;
  publicKey: PublicEncryptionKey;
}

export function generateVaultKeyPair(): VaultKeyPair {
  return generateXWingKeyPair();
}

/**
 * Wrap an org vault private key to a member's public key (versioned bundle, never a raw scalar).
 */
export async function wrapVaultKey(
  vaultPrivateKey: Uint8Array,
  recipientPublicKey: PublicEncryptionKey,
): Promise<WrappedKey> {
  if (vaultPrivateKey.length !== 32) {
    throw new Error('VaultPrivateKey must be 32 bytes');
  }

  const serializedPrivateKey = serializePrivateEncryptionKey(vaultPrivateKey);

  try {
    return await wrapKeyMaterial(serializedPrivateKey, recipientPublicKey);
  } finally {
    serializedPrivateKey.fill(0);
  }
}

/**
 * Unwrap an org vault private key with the member's personal private key; fails closed on unsupported suite.
 */
export async function unwrapVaultKey(wrappedKey: WrappedKey, personalPrivateKey: Uint8Array): Promise<Uint8Array> {
  assertSupportedAlgorithmSuiteVersion(wrappedKey.v);

  const serializedPrivateKey = await unwrapKeyMaterial(wrappedKey, personalPrivateKey);

  try {
    return deserializePrivateEncryptionKey(serializedPrivateKey);
  } finally {
    serializedPrivateKey.fill(0);
  }
}

/**
 * Re-wrap the org vault private key for a new member: unwrap with granter's key, wrap to new member's key.
 */
export async function grantVaultAccess(
  ownWrappedVaultKey: WrappedKey,
  personalPrivateKey: Uint8Array,
  newMemberPublicKey: PublicEncryptionKey,
): Promise<WrappedKey> {
  const vaultPrivateKey = await unwrapVaultKey(ownWrappedVaultKey, personalPrivateKey);

  try {
    return await wrapVaultKey(vaultPrivateKey, newMemberPublicKey);
  } finally {
    vaultPrivateKey.fill(0);
  }
}
