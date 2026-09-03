import { CryptoProxy } from '@comitium/crypto';
import type { EncryptedEnvelope, WrappedKey } from '@comitium/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCandidateTags } from '@/lib/api/candidate-tags';
import type { CandidateTag } from '@/lib/schemas/candidate-tags';
import { mockWrappedKey } from '@/test/crypto-helpers';

import { decryptTag, fetchDecryptedTags } from '../use-candidate-tags';

vi.mock('@/lib/api/candidate-tags', () => ({
  getCandidateTags: vi.fn(),
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: {
    decryptApplication: vi.fn(),
  },
}));

const mockGetTags = vi.mocked(getCandidateTags);
const mockDecrypt = vi.mocked(CryptoProxy.decryptApplication);

const ORG_ID = 'org-1';
const CREATOR_USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CREATOR_USER_ID = '22222222-2222-4222-8222-222222222222';
const TAG_CONTEXT = {
  purpose: 'candidate_tag',
  orgId: ORG_ID,
  subjectId: ORG_ID,
  fieldId: 'label',
};

const wrappedKey: WrappedKey = mockWrappedKey();

function envelope(suffix: string): EncryptedEnvelope {
  return {
    v: 1,
    purpose: 'candidate_tag',
    zip: 'none',
    ct: Buffer.from(`ct-${suffix}`).toString('base64'),
    iv: 'AAAAAAAAAAAAAAAA',
    keys: [{ recipient: 'org_vault', rkv: 1, ...mockWrappedKey() }],
  };
}

function rawTag(id: string, overrides: Partial<CandidateTag> = {}): CandidateTag {
  return {
    id,
    label: envelope(id),
    labelHash: 'a'.repeat(64),
    isArchived: false,
    createdBy: CREATOR_USER_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('decryptTag', () => {
  it('returns tag with decrypted label on success', async () => {
    mockDecrypt.mockResolvedValueOnce({ label: 'Silver Medalist' });

    const result = await decryptTag(rawTag('t1'), ORG_ID, wrappedKey);

    expect(result).toEqual({
      id: 't1',
      label: 'Silver Medalist',
      labelHash: 'a'.repeat(64),
      isArchived: false,
      createdBy: CREATOR_USER_ID,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('forwards envelope, orgId and wrapped key to CryptoProxy', async () => {
    mockDecrypt.mockResolvedValueOnce({ label: 'x' });
    const tag = rawTag('t1');

    await decryptTag(tag, ORG_ID, wrappedKey);

    expect(mockDecrypt).toHaveBeenCalledExactlyOnceWith(tag.label, ORG_ID, wrappedKey, TAG_CONTEXT);
  });

  it('returns null when CryptoProxy throws', async () => {
    mockDecrypt.mockRejectedValueOnce(new Error('auth tag mismatch'));

    const result = await decryptTag(rawTag('t1'), ORG_ID, wrappedKey);

    expect(result).toBeNull();
  });

  it('returns null when decrypted payload fails schema validation', async () => {
    mockDecrypt.mockResolvedValueOnce({ wrongField: 'nope' });

    const result = await decryptTag(rawTag('t1'), ORG_ID, wrappedKey);

    expect(result).toBeNull();
  });

  it('returns null when decrypted label is not a string', async () => {
    mockDecrypt.mockResolvedValueOnce({ label: 42 });

    const result = await decryptTag(rawTag('t1'), ORG_ID, wrappedKey);

    expect(result).toBeNull();
  });

  it('preserves isArchived, creator user and timestamps from raw tag', async () => {
    mockDecrypt.mockResolvedValueOnce({ label: 'Archived Tag' });
    const tag = rawTag('t1', {
      isArchived: true,
      createdBy: OTHER_CREATOR_USER_ID,
      createdAt: '2025-06-01T12:00:00.000Z',
      updatedAt: '2025-07-15T08:30:00.000Z',
    });

    const result = await decryptTag(tag, ORG_ID, wrappedKey);

    expect(result).toMatchObject({
      isArchived: true,
      createdBy: OTHER_CREATOR_USER_ID,
      createdAt: '2025-06-01T12:00:00.000Z',
      updatedAt: '2025-07-15T08:30:00.000Z',
    });
  });
});

describe('fetchDecryptedTags', () => {
  it('returns empty array when API returns empty list', async () => {
    mockGetTags.mockResolvedValueOnce({ data: [] });

    const result = await fetchDecryptedTags(ORG_ID, wrappedKey);

    expect(result).toEqual([]);
    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it('fetches with includeArchived=true so settings page sees archived tags', async () => {
    mockGetTags.mockResolvedValueOnce({ data: [] });

    await fetchDecryptedTags(ORG_ID, wrappedKey);

    expect(mockGetTags).toHaveBeenCalledExactlyOnceWith(ORG_ID, true);
  });

  it('decrypts all tags in parallel and returns them', async () => {
    mockGetTags.mockResolvedValueOnce({
      data: [rawTag('t1'), rawTag('t2'), rawTag('t3')],
    });
    mockDecrypt
      .mockResolvedValueOnce({ label: 'alpha' })
      .mockResolvedValueOnce({ label: 'beta' })
      .mockResolvedValueOnce({ label: 'gamma' });

    const result = await fetchDecryptedTags(ORG_ID, wrappedKey);

    expect(result).toHaveLength(3);
    expect(result.map((t) => t.label)).toEqual(['alpha', 'beta', 'gamma']);
    expect(mockDecrypt).toHaveBeenCalledTimes(3);
  });

  it('silently drops tags whose decryption fails, keeps successful ones', async () => {
    mockGetTags.mockResolvedValueOnce({
      data: [rawTag('t1'), rawTag('t2'), rawTag('t3')],
    });
    mockDecrypt
      .mockResolvedValueOnce({ label: 'alpha' })
      .mockRejectedValueOnce(new Error('corrupt ciphertext'))
      .mockResolvedValueOnce({ label: 'gamma' });

    const result = await fetchDecryptedTags(ORG_ID, wrappedKey);

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['t1', 't3']);
    expect(result.map((t) => t.label)).toEqual(['alpha', 'gamma']);
  });

  it('drops tags whose payload fails schema validation', async () => {
    mockGetTags.mockResolvedValueOnce({
      data: [rawTag('t1'), rawTag('t2')],
    });
    mockDecrypt.mockResolvedValueOnce({ label: 'alpha' }).mockResolvedValueOnce({ not: 'a label' });

    const result = await fetchDecryptedTags(ORG_ID, wrappedKey);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('t1');
  });

  it('returns empty array when all tags fail to decrypt', async () => {
    mockGetTags.mockResolvedValueOnce({
      data: [rawTag('t1'), rawTag('t2')],
    });
    mockDecrypt.mockRejectedValue(new Error('wrong key'));

    const result = await fetchDecryptedTags(ORG_ID, wrappedKey);

    expect(result).toEqual([]);
  });

  it('propagates orgId and wrapped key to each decrypt call', async () => {
    mockGetTags.mockResolvedValueOnce({
      data: [rawTag('t1'), rawTag('t2')],
    });
    mockDecrypt.mockResolvedValue({ label: 'x' });

    await fetchDecryptedTags(ORG_ID, wrappedKey);

    expect(mockDecrypt.mock.calls).toEqual([
      [envelope('t1'), ORG_ID, wrappedKey, TAG_CONTEXT],
      [envelope('t2'), ORG_ID, wrappedKey, TAG_CONTEXT],
    ]);
  });

  it('uses a different orgId when called for a second org, so queries never cross-pollinate', async () => {
    mockGetTags.mockResolvedValueOnce({ data: [rawTag('t1')] }).mockResolvedValueOnce({ data: [rawTag('t2')] });
    mockDecrypt.mockResolvedValue({ label: 'x' });

    await fetchDecryptedTags('org-A', wrappedKey);
    await fetchDecryptedTags('org-B', wrappedKey);

    expect(mockGetTags.mock.calls).toEqual([
      ['org-A', true],
      ['org-B', true],
    ]);
    expect(mockDecrypt.mock.calls[0]?.[1]).toBe('org-A');
    expect(mockDecrypt.mock.calls[1]?.[1]).toBe('org-B');
  });
});
