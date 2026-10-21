import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base64 } from '@scure/base';
import { decryptBinaryData, encryptPayloadBytes } from './data-encryption';
import { keyContextBytes } from './key-context';
import { unwrapKeyMaterial, wrapKeyMaterial } from './key-wrapping';
import type { PublicEncryptionKey, WrappedKey } from './schemas/keys';
import {
  type SearchKeyContext,
  searchKeyContextSchema,
  type VaultKeyAccess,
  type VaultKeyContext,
  type VaultKeyPair,
  vaultKeyAccessSchema,
  vaultKeyContextSchema,
  type WrappedSearchKey,
  wrappedSearchKeySchema,
} from './schemas/vault-key';
import {
  assertEncryptionKeyPair,
  deserializePrivateEncryptionKey,
  generateXWingKeyPair,
  serializePrivateEncryptionKey,
} from './xwing';

export {
  type VaultKeyAccess,
  type VaultKeyContext,
  type VaultKeyPair,
  vaultKeyAccessSchema,
  type WrappedSearchKey,
  wrappedSearchKeySchema,
} from './schemas/vault-key';

export function generateVaultKeyPair(): VaultKeyPair {
  return generateXWingKeyPair();
}

export async function wrapVaultKey(
  vaultPrivateKey: Uint8Array,
  recipientPublicKey: PublicEncryptionKey,
  context: VaultKeyContext,
): Promise<WrappedKey> {
  const serialized = serializePrivateEncryptionKey(vaultPrivateKey);

  try {
    return await wrapKeyMaterial(serialized, recipientPublicKey, vaultKeyAad(context));
  } finally {
    serialized.fill(0);
  }
}

/**
 * Authenticate both recipient context and the expected public key before caching private material.
 */
export async function unwrapVaultKey(access: VaultKeyAccess, userPrivateKey: Uint8Array): Promise<Uint8Array> {
  const parsed = vaultKeyAccessSchema.parse(access);
  const serialized = await unwrapKeyMaterial(parsed.wrappedVaultKey, userPrivateKey, vaultKeyAad(parsed));
  let privateKey: Uint8Array | undefined;

  try {
    privateKey = deserializePrivateEncryptionKey(serialized);

    assertEncryptionKeyPair(privateKey, parsed.vaultPublicKey);

    return privateKey;
  } catch (error) {
    privateKey?.fill(0);

    throw error;
  } finally {
    serialized.fill(0);
  }
}

export async function grantVaultAccess(
  ownAccess: VaultKeyAccess,
  userPrivateKey: Uint8Array,
  newMemberPublicKey: PublicEncryptionKey,
  recipient: Pick<VaultKeyContext, 'recipientUserId' | 'recipientKeyVersion'>,
): Promise<WrappedKey> {
  const vaultPrivateKey = await unwrapVaultKey(ownAccess, userPrivateKey);

  try {
    return await wrapVaultKey(vaultPrivateKey, newMemberPublicKey, {
      orgId: ownAccess.orgId,
      vaultKeyVersion: ownAccess.vaultKeyVersion,
      ...recipient,
    });
  } finally {
    vaultPrivateKey.fill(0);
  }
}

/**
 * Symmetric wrapping prevents a public-key holder from substituting a chosen search root.
 */
export async function wrapSearchKey(
  searchKey: Uint8Array,
  vaultPrivateKey: Uint8Array,
  context: SearchKeyContext,
): Promise<WrappedSearchKey> {
  if (searchKey.length !== 32) {
    throw new Error('Search key must be 32 bytes');
  }

  const key = deriveSearchWrapKey(vaultPrivateKey, context);

  try {
    const encrypted = await encryptPayloadBytes(searchKey, key, searchKeyAad(context));

    return { ...context, encryptedSearchKey: { v: 1, ek: encrypted.ct, iv: encrypted.iv } };
  } finally {
    key.fill(0);
  }
}

export async function unwrapSearchKey(value: WrappedSearchKey, vaultPrivateKey: Uint8Array): Promise<Uint8Array> {
  const descriptor = wrappedSearchKeySchema.parse(value);
  const key = deriveSearchWrapKey(vaultPrivateKey, descriptor);

  try {
    return await decryptBinaryData(
      base64.decode(descriptor.encryptedSearchKey.ek),
      descriptor.encryptedSearchKey.iv,
      key,
      searchKeyAad(descriptor),
    );
  } finally {
    key.fill(0);
  }
}

function vaultKeyAad(context: VaultKeyContext): Uint8Array {
  const { orgId, vaultKeyVersion, recipientUserId, recipientKeyVersion } = context;

  vaultKeyContextSchema.parse({ orgId, vaultKeyVersion, recipientUserId, recipientKeyVersion });

  return keyContextBytes({
    purpose: 'comitium.org-vault-key',
    v: 1,
    orgId,
    vaultKeyVersion,
    recipientUserId,
    recipientKeyVersion,
  });
}

function searchKeyAad(context: SearchKeyContext): Uint8Array {
  return keyContextBytes({
    purpose: 'comitium.org-search-key',
    v: 1,
    orgId: context.orgId,
    vaultKeyVersion: context.vaultKeyVersion,
    searchKeyVersion: context.searchKeyVersion,
  });
}

function deriveSearchWrapKey(vaultPrivateKey: Uint8Array, context: SearchKeyContext): Uint8Array {
  searchKeyContextSchema.parse(context);

  if (vaultPrivateKey.length !== 32) {
    throw new Error('Vault private key must be 32 bytes');
  }

  return hkdf(
    sha256,
    vaultPrivateKey,
    new TextEncoder().encode(context.orgId),
    new TextEncoder().encode(`comitium.org-search-key-wrap.v1:${context.vaultKeyVersion}`),
    32,
  );
}
