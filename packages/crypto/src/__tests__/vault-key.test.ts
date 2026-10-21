import { base64 } from '@scure/base';
import { describe, expect, it } from 'vitest';
import { vaultKeyAccessSchema } from '../schemas/vault-key';
import { grantVaultAccess, unwrapSearchKey, unwrapVaultKey, wrapSearchKey } from '../vault-key';
import { TEST_KEYS, tamperBase64 } from './crypto-helpers';
import vector from './fixtures/key-protocol-v1.json';
import { ORG_ID, OTHER_USER_ID, SEARCH_KEY, vaultFixture } from './unlock-fixtures';

describe('context-bound vault and search keys', () => {
  it('opens fixed v1 vault and search wrappers without changing their authenticated contexts', async () => {
    const access = vaultKeyAccessSchema.parse(vector.vault);
    const privateKey = await unwrapVaultKey(access, base64.decode(vector.userPrivateKey));

    expect(base64.encode(privateKey)).toBe(vector.vaultPrivateKey);
    expect(base64.encode(await unwrapSearchKey(access.searchKey, privateKey))).toBe(vector.searchKey);
  });

  it('decrypts a grant and the independently generated search root', async () => {
    const access = await vaultFixture();
    const privateKey = await unwrapVaultKey(access, TEST_KEYS.alice.privateKey);

    expect(privateKey).toEqual(TEST_KEYS.bob.privateKey);
    expect(await unwrapSearchKey(access.searchKey, privateKey)).toEqual(SEARCH_KEY);
    expect(SEARCH_KEY).not.toEqual(privateKey);
  });

  it('rejects a grant moved to a different recipient, generation or organization', async () => {
    const access = await vaultFixture();

    await expect(
      unwrapVaultKey({ ...access, recipientUserId: OTHER_USER_ID }, TEST_KEYS.alice.privateKey),
    ).rejects.toThrow();
    await expect(unwrapVaultKey({ ...access, recipientKeyVersion: 2 }, TEST_KEYS.alice.privateKey)).rejects.toThrow();
    await expect(
      unwrapVaultKey(
        { ...access, orgId: OTHER_USER_ID, searchKey: { ...access.searchKey, orgId: OTHER_USER_ID } },
        TEST_KEYS.alice.privateKey,
      ),
    ).rejects.toThrow();
    await expect(
      unwrapVaultKey({ ...access, vaultPublicKey: TEST_KEYS.charlie.publicKey }, TEST_KEYS.alice.privateKey),
    ).rejects.toThrow('does not match');
  });

  it('grants the same vault to a different user generation with a new AAD', async () => {
    const access = await vaultFixture();
    const recipient = { recipientUserId: OTHER_USER_ID, recipientKeyVersion: 2 };
    const wrappedVaultKey = await grantVaultAccess(
      access,
      TEST_KEYS.alice.privateKey,
      TEST_KEYS.charlie.publicKey,
      recipient,
    );

    expect(await unwrapVaultKey({ ...access, ...recipient, wrappedVaultKey }, TEST_KEYS.charlie.privateKey)).toEqual(
      TEST_KEYS.bob.privateKey,
    );
    await expect(unwrapVaultKey({ ...access, wrappedVaultKey }, TEST_KEYS.charlie.privateKey)).rejects.toThrow();
  });

  it('authenticates search descriptors, ciphertext and the secret-derived wrapping key', async () => {
    const { searchKey } = await vaultFixture();

    await expect(unwrapSearchKey(searchKey, TEST_KEYS.charlie.privateKey)).rejects.toThrow();
    await expect(unwrapSearchKey({ ...searchKey, searchKeyVersion: 2 }, TEST_KEYS.bob.privateKey)).rejects.toThrow();
    await expect(unwrapSearchKey({ ...searchKey, orgId: OTHER_USER_ID }, TEST_KEYS.bob.privateKey)).rejects.toThrow();
    await expect(
      unwrapSearchKey(
        {
          ...searchKey,
          encryptedSearchKey: { ...searchKey.encryptedSearchKey, ek: tamperBase64(searchKey.encryptedSearchKey.ek) },
        },
        TEST_KEYS.bob.privateKey,
      ),
    ).rejects.toThrow();
  });

  it('rewraps an unchanged search root for a new vault without changing any digest input', async () => {
    const descriptor = await wrapSearchKey(SEARCH_KEY, TEST_KEYS.charlie.privateKey, {
      orgId: ORG_ID,
      vaultKeyVersion: 2,
      searchKeyVersion: 1,
    });

    expect(await unwrapSearchKey(descriptor, TEST_KEYS.charlie.privateKey)).toEqual(SEARCH_KEY);
    await expect(unwrapSearchKey(descriptor, TEST_KEYS.bob.privateKey)).rejects.toThrow();
  });
});
