import { CryptoProxy } from '@comitium/crypto';
import { publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { generateVaultKeyPair, wrapVaultKey } from '@comitium/crypto/vault-key';
import { shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import { VaultError } from '@comitium/schemas/product-errors';
import { bytesToHex } from '@noble/hashes/utils.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { mockVaultAccess, TEST_KEYS } from '@/test/crypto-helpers';

import { ensureOrgVault, saveVaultKeys } from '../core/vault';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('orgs/vault', () => {
  it('reads canonical vault/search access after saving before reporting bootstrap complete', async () => {
    const access = mockVaultAccess();
    vi.spyOn(CryptoProxy, 'generateAndWrapVaultKey').mockResolvedValue(access);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: { message: 'Not found' } }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json(access));
    vi.stubGlobal('fetch', fetchMock);

    const result = await ensureOrgVault(access.orgId, TEST_KEYS.alice.publicKey);

    expect(result.isOk()).toBe(true);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      `/v1/orgs/${access.orgId}/vault-key`,
      `/v1/orgs/${access.orgId}/vault`,
      `/v1/orgs/${access.orgId}/vault-access`,
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      wrappedVaultKey: access.wrappedVaultKey,
      searchKey: access.searchKey,
      recipientKeyVersion: access.recipientKeyVersion,
      vaultKeyVersion: access.vaultKeyVersion,
    });
  });

  describe('generateAndWrapVaultKey', () => {
    it('returns vaultPublicKey and wrappedVaultKey with correct formats', async () => {
      const { privateKey, publicKey } = generateVaultKeyPair();
      const wrappedVaultKey = await wrapVaultKey(privateKey, TEST_KEYS.alice.publicKey, mockVaultAccess());

      expect(publicEncryptionKeySchema.safeParse(publicKey).success).toBe(true);
      expect(privateKey).toBeInstanceOf(Uint8Array);
      expect(privateKey).toHaveLength(32);

      expect(wrappedVaultKey.ek).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(wrappedVaultKey.epk).toMatch(/^[0-9a-f]{64}$/);
      expect(wrappedVaultKey.kemCt).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(wrappedVaultKey.iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('generates unique keys each call', () => {
      const r1 = generateVaultKeyPair();
      const r2 = generateVaultKeyPair();

      expect(r1.publicKey.xwing).not.toBe(r2.publicKey.xwing);
      expect(bytesToHex(r1.privateKey)).not.toBe(bytesToHex(r2.privateKey));
    });
  });

  describe('saveVaultKeys', () => {
    it('does not retry a rejected 4xx vault bootstrap', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Vault already exists' } }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      vi.stubGlobal('fetch', fetchMock);

      const result = await saveVaultKeys('org-id', mockVaultAccess());

      expect(result.isErr()).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('leaves transient retry ownership to the query', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Temporarily unavailable' } }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      vi.stubGlobal('fetch', fetchMock);

      const result = await saveVaultKeys('org-id', mockVaultAccess());

      expect(result.isErr()).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry a wrapped permanent API error', () => {
      const error = new VaultError('save_vault', new ApiError(409, 'Vault already exists'));

      expect(shouldRetryQuery(0, error)).toBe(false);
    });
  });
});
