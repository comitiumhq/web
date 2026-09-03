import { publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { generateVaultKeyPair, wrapVaultKey } from '@comitium/crypto/vault-key';
import { shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import { ContractError } from '@comitium/schemas/product-errors';
import { bytesToHex } from '@noble/hashes/utils.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { TEST_KEYS } from '@/test/crypto-helpers';

import { saveVaultKeys } from '../core/vault';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('orgs/vault', () => {
  describe('generateAndWrapVaultKey', () => {
    it('returns vaultPublicKey and wrappedVaultKey with correct formats', async () => {
      const { privateKey, publicKey } = generateVaultKeyPair();
      const wrappedVaultKey = await wrapVaultKey(privateKey, TEST_KEYS.alice.publicKey);

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

      const result = await saveVaultKeys('org-id', TEST_KEYS.alice.publicKey, {} as never);

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

      const result = await saveVaultKeys('org-id', TEST_KEYS.alice.publicKey, {} as never);

      expect(result.isErr()).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry a wrapped permanent API error', () => {
      const error = new ContractError('save_vault', new ApiError(409, 'Vault already exists'));

      expect(shouldRetryQuery(0, error)).toBe(false);
    });
  });
});
