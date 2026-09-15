import { CryptoProxy } from '@comitium/crypto';
import type { EncryptedEnvelope, WrappedKey } from '@comitium/schemas/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPublicEncryptionKey, mockWrappedKey } from '@/test/crypto-helpers';

import { buildEncryptedLabel } from '../use-candidate-tag';

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: {
    encryptApplication: vi.fn(),
    hashTagLabel: vi.fn(),
  },
}));

const mockEncrypt = vi.mocked(CryptoProxy.encryptApplication);
const mockHash = vi.mocked(CryptoProxy.hashTagLabel);

const ORG_ID = 'org-1';
const TAG_CONTEXT = {
  purpose: 'candidate_tag',
  orgId: ORG_ID,
  subjectId: ORG_ID,
  fieldId: 'label',
};
const VAULT_PUB = mockPublicEncryptionKey();
const WRAPPED: WrappedKey = mockWrappedKey();

const fakeEnvelope: EncryptedEnvelope = {
  v: 1,
  purpose: 'candidate_tag',
  zip: 'none',
  ct: 'AQIDBA==',
  iv: 'AAAAAAAAAAAAAAAA',
  keys: [{ recipient: 'org_vault', rkv: 1, ...mockWrappedKey() }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockEncrypt.mockResolvedValue(fakeEnvelope);
  mockHash.mockResolvedValue('h'.repeat(64));
});

describe('buildEncryptedLabel', () => {
  it('encrypts the trimmed display label and lets the Crypto Worker normalize the hash input', async () => {
    await buildEncryptedLabel(ORG_ID, '  Senior Engineer  ', VAULT_PUB, 1, WRAPPED);

    expect(mockEncrypt).toHaveBeenCalledExactlyOnceWith(VAULT_PUB, 1, { label: 'Senior Engineer' }, TAG_CONTEXT);
    expect(mockHash).toHaveBeenCalledExactlyOnceWith(ORG_ID, WRAPPED, '  Senior Engineer  ');
  });

  it('returns the body expected by the API (envelope + hex hash)', async () => {
    const body = await buildEncryptedLabel(ORG_ID, 'foo', VAULT_PUB, 1, WRAPPED);

    expect(body).toEqual({
      label: fakeEnvelope,
      labelHash: 'h'.repeat(64),
    });
  });

  it('propagates encryption errors to the caller', async () => {
    mockEncrypt.mockRejectedValueOnce(new Error('worker dead'));

    await expect(buildEncryptedLabel(ORG_ID, 'foo', VAULT_PUB, 1, WRAPPED)).rejects.toThrow('worker dead');
  });

  it('propagates hash errors to the caller', async () => {
    mockHash.mockRejectedValueOnce(new Error('hkdf failed'));

    await expect(buildEncryptedLabel(ORG_ID, 'foo', VAULT_PUB, 1, WRAPPED)).rejects.toThrow('hkdf failed');
  });

  it('scopes each hash request to its organization', async () => {
    await buildEncryptedLabel('org-A', 'foo', VAULT_PUB, 1, WRAPPED);
    await buildEncryptedLabel('org-B', 'foo', VAULT_PUB, 1, WRAPPED);

    expect(mockHash.mock.calls.map((call) => call[0])).toEqual(['org-A', 'org-B']);
  });
});
