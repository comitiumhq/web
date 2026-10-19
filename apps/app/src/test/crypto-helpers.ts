import type { VaultKeyAccess } from '@comitium/crypto';
import type { PublicEncryptionKey } from '@comitium/crypto/schemas';
import type { WrappedKey } from '@comitium/schemas/common';
import { ALGORITHM_SUITE_VERSION } from '@comitium/schemas/common';
import { hexToBytes } from '@noble/hashes/utils.js';
import { ml_kem768_x25519 } from '@noble/post-quantum/hybrid.js';
import { base64 } from '@scure/base';

function makeKeyPair(privHex: string) {
  const privateKey = hexToBytes(privHex);
  const publicKey = publicEncryptionKeyFromPrivateKey(privateKey);

  return { privateKey, publicKey };
}

export const TEST_KEYS = {
  alice: makeKeyPair('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  bob: makeKeyPair('abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'),
  charlie: makeKeyPair('1111111111111111111111111111111111111111111111111111111111111111'),
};

export function mockPublicEncryptionKey(seedHex = '22'.repeat(32)): PublicEncryptionKey {
  return publicEncryptionKeyFromPrivateKey(hexToBytes(seedHex));
}

/** Mock WrappedKey structure for tests that don't need real crypto. */
export function mockWrappedKey(overrides?: Partial<WrappedKey>): WrappedKey {
  return {
    v: 1,
    ek: base64.encode(new Uint8Array(48)),
    epk: 'aa'.repeat(32),
    kemCt: base64.encode(new Uint8Array(1088)),
    iv: base64.encode(new Uint8Array(12)),
    ...overrides,
  };
}

export function mockVaultAccess(overrides: Partial<VaultKeyAccess> = {}): VaultKeyAccess {
  const orgId = overrides.orgId ?? '0199a000-0000-7000-8000-000000000001';
  const vaultKeyVersion = overrides.vaultKeyVersion ?? 1;

  return {
    orgId,
    vaultKeyVersion,
    recipientUserId: '0199a000-0000-7000-8000-000000000002',
    recipientKeyVersion: 1,
    vaultPublicKey: TEST_KEYS.alice.publicKey,
    wrappedVaultKey: mockWrappedKey(),
    searchKey: {
      orgId,
      vaultKeyVersion,
      searchKeyVersion: 1,
      encryptedSearchKey: { v: 1, ek: base64.encode(new Uint8Array(48)), iv: base64.encode(new Uint8Array(12)) },
    },
    ...overrides,
  };
}

function publicEncryptionKeyFromPrivateKey(privateKey: Uint8Array): PublicEncryptionKey {
  return {
    v: ALGORITHM_SUITE_VERSION,
    xwing: base64.encode(new Uint8Array(ml_kem768_x25519.getPublicKey(privateKey))),
  };
}
