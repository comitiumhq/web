import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keyMetadataFingerprint } from '../key-context';
import type {
  CandidateSearchCacheBinding,
  CandidateSearchPayload,
  StoredProfile,
} from '../schemas/candidate-search-cache';
import { createCryptoSessionIdentity } from '../session';
import { CandidateSearchCacheCipher } from '../worker/candidate-search-cache-cipher';
import { UserKeySession } from '../worker/user-key-session';
import { ORG_ID, OTHER_USER_ID, USER_ID, userKeyFixture } from './unlock-fixtures';

const fixture = userKeyFixture();
let session: UserKeySession;
let cipher: CandidateSearchCacheCipher;
let binding: CandidateSearchCacheBinding;

const payload: CandidateSearchPayload = {
  fields: {
    firstName: 'Anna',
    lastName: 'Smith',
    email: 'anna@example.test',
    location: null,
    currentTitle: 'Engineer',
    currentCompany: 'Demo',
  },
  unreadable: false,
};

beforeEach(async () => {
  session = new UserKeySession(() => cipher?.clear());
  session.configure('https://api.comitium.test/v1');
  cipher = new CandidateSearchCacheCipher(session);
  await session.unlockWithRecoveryCode(fixture.bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, false);

  const context = {
    ...createCryptoSessionIdentity(fixture.bundle, USER_ID),
    orgId: ORG_ID,
    scopeToken: 'scope',
    corpusVersion: 1 as const,
  };

  binding = { key: keyMetadataFingerprint(context), generation: crypto.randomUUID(), context, wrappedKey: null };
  binding.wrappedKey = await cipher.createKey(binding);
  await cipher.open({ orgId: ORG_ID, scopeToken: 'scope' }, binding);
});

afterEach(() => {
  session.clear();
  vi.restoreAllMocks();
});

async function profile(): Promise<StoredProfile> {
  const identity = {
    candidateId: OTHER_USER_ID,
    profileRevision: 1,
    profileFingerprint: 'a'.repeat(64),
    localId: 1,
    unreadable: false,
  };

  return { ...identity, searchData: await cipher.encryptProfile(identity, payload), accountedBytes: 1024 };
}

describe('Encrypted disk index crypto boundary', () => {
  it('stores binary ciphertext and reopens with one wrapped namespace key', async () => {
    const record = await profile();

    expect(record.searchData.ct).toBeInstanceOf(Uint8Array);
    expect(JSON.stringify(record)).not.toContain('Anna');

    cipher.clear();
    await cipher.open({ orgId: ORG_ID, scopeToken: 'scope' }, binding);

    expect(await cipher.decryptProfile(record)).toEqual(payload);
  });

  it('compresses large postings before encryption and authenticates compression metadata', async () => {
    const address = await cipher.address('common');

    const postings = [Array.from({ length: 1024 }, (_, index) => index + 1)];

    const data = await cipher.encryptPosting(address, postings);

    expect(data.zip).toBe('gzip');
    expect(data.ct.byteLength).toBeLessThan(data.plaintextBytes);
    expect(await cipher.decryptPosting(address, data)).toEqual(postings);
    await expect(cipher.decryptPosting(address, { ...data, zip: 'none' })).rejects.toThrow();
    await expect(cipher.decryptPosting(address, { ...data, plaintextBytes: 1 })).rejects.toThrow();
  });

  it.each([
    { candidateId: USER_ID },
    { profileRevision: 2 },
    { profileFingerprint: 'b'.repeat(64) },
    { localId: 2 },
    { unreadable: true },
  ])('rejects a moved profile identity %j', async (change) => {
    await expect(cipher.decryptProfile({ ...(await profile()), ...change })).rejects.toThrow();
  });

  it('rejects a posting moved to a different opaque address', async () => {
    const first = await cipher.address('first');
    const second = await cipher.address('second');
    const data = await cipher.encryptPosting(first, [[1, 2]]);

    expect(new Uint8Array(first)).toHaveLength(32);
    expect(new Uint8Array(first)).not.toEqual(new Uint8Array(second));
    await expect(cipher.decryptPosting(second, data)).rejects.toThrow();
  });

  it('authenticates reverse registry addresses and separates them from posting payloads', async () => {
    const first = await cipher.address('registry-first');
    const second = await cipher.address('registry-second');

    const registry = { id: 1, terms: ['a', 'an', 'ann', 'anna'] };

    const encrypted = await cipher.encryptRegistry(first, registry);

    expect(await cipher.decryptRegistry(first, encrypted)).toEqual(registry);
    await expect(cipher.decryptRegistry(second, encrypted)).rejects.toThrow('SEARCH_CACHE_INVALID');
    await expect(cipher.decryptPosting(first, encrypted)).rejects.toThrow('SEARCH_CACHE_INVALID');

    const posting = await cipher.encryptPosting(first, [[1]]);

    await expect(cipher.decryptRegistry(first, posting)).rejects.toThrow('SEARCH_CACHE_INVALID');
  });

  it('clears local keys on both lock and internal re-unlock', async () => {
    const record = await profile();
    session.clear();

    await expect(cipher.decryptProfile(record)).rejects.toThrow('SEARCH_SCOPE_CHANGED');

    await session.unlockWithRecoveryCode(fixture.bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, false);

    await expect(cipher.decryptProfile(record)).rejects.toThrow('SEARCH_SCOPE_CHANGED');
  });

  it('does not restore a local key when opening finishes after clear', async () => {
    const record = await profile();

    const pending = cipher.open({ orgId: ORG_ID, scopeToken: 'scope' }, binding);
    const rejected = expect(pending).rejects.toThrow('SEARCH_SCOPE_CHANGED');
    cipher.clear();
    await rejected;

    await expect(cipher.decryptProfile(record)).rejects.toThrow('SEARCH_SCOPE_CHANGED');
  });

  it('refuses another account or scope before opening its cache key', async () => {
    const foreign = { ...binding, context: { ...binding.context, userId: OTHER_USER_ID } };

    await expect(cipher.createKey(foreign)).rejects.toThrow('SEARCH_CACHE_INVALID');
    await expect(cipher.open({ orgId: ORG_ID, scopeToken: 'other' }, binding)).rejects.toThrow('SEARCH_CACHE_INVALID');
  });
});
