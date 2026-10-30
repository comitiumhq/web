import type { CryptoProxy, VaultKeyAccess } from '@comitium/crypto';
import { CandidateSearchCacheError, type CandidateSearchCacheNamespace } from '@comitium/crypto/candidate-search-cache';
import { CandidateSearchError } from '@comitium/crypto/candidate-search-protocol';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CandidateSearchRuntime } from './profile-corpus';

type CandidateCommitResult = Awaited<ReturnType<typeof CryptoProxy.commitCandidateSearch>>;

const mocks = vi.hoisted(() => ({
  cache: {
    captureFence: vi.fn(),
    open: vi.fn(),
    installKey: vi.fn(),
    checkpoint: vi.fn(),
    invalidate: vi.fn(),
    reset: vi.fn(),
  },
  worker: {
    beginCandidateSearch: vi.fn(),
    createCandidateSearchCacheKey: vi.fn(),
    commitCandidateSearch: vi.fn(),
    candidateSearchStatus: vi.fn(),
    evaluateCandidateSearchReferences: vi.fn(),
    clearCandidateSearch: vi.fn(),
  },
  bootstrap: vi.fn(),
  changes: vi.fn(),
  vault: vi.fn(),
}));

vi.mock('@comitium/crypto', () => ({ CryptoProxy: mocks.worker }));

vi.mock('@comitium/crypto/candidate-search-cache', async (original) => ({
  ...(await original<typeof import('@comitium/crypto/candidate-search-cache')>()),
  CandidateSearchCache: class {
    captureFence = mocks.cache.captureFence;
    open = mocks.cache.open;
    installKey = mocks.cache.installKey;
    checkpoint = mocks.cache.checkpoint;
    invalidate = mocks.cache.invalidate;
    reset = mocks.cache.reset;
  },
}));

vi.mock('@/lib/api/candidate-search', () => ({
  bootstrapCandidateCorpus: mocks.bootstrap,
  getCandidateCorpusChanges: mocks.changes,
}));

vi.mock('@/lib/api/orgs-vault', () => ({ getOrgVaultAccess: mocks.vault }));

const orgId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';
const identity = { userId, keyVersion: 1, encryptedKeyFingerprint: 'a'.repeat(64) };
const scopeToken = 'scope';
const index = { orgId, scopeToken, generation: 1 };

const access: VaultKeyAccess = {
  orgId,
  recipientUserId: userId,
  vaultKeyVersion: 1,
  recipientKeyVersion: 1,
  vaultPublicKey: { v: 1, xwing: 'synthetic' },
  wrappedVaultKey: { v: 1, ek: '', epk: '', kemCt: '', iv: '' },
  searchKey: { orgId, vaultKeyVersion: 1, searchKeyVersion: 1, encryptedSearchKey: { v: 1, ek: '', iv: '' } },
};

const namespace: CandidateSearchCacheNamespace = {
  key: 'c'.repeat(64),
  generation: orgId,
  context: { ...identity, orgId, scopeToken, corpusVersion: 1 },
  wrappedKey: { v: 1, ek: 'wrapped', epk: '', kemCt: '', iv: '' },
  phase: 'complete',
  appliedCursor: '0',
  bootstrapCursor: null,
  bootstrapHead: '0',
  recordCount: 75_000,
  unreadableCount: 0,
  indexRevision: 1,
  nextDocumentId: 75_001,
  accountedBytes: 0,
  lastUsedAt: 0,
};

const firstPage = {
  corpusVersion: 1,
  projectionWorkAvailable: false,
  scopeToken,
  head: '0',
  upperCandidateId: null,
  nextCursor: null,
  profiles: [],
};

const changePage = {
  scopeToken,
  since: '0',
  head: '0',
  throughCursor: '0',
  nextCursor: '0',
  caughtUp: true,
  projectionWorkAvailable: false,
  events: [],
};

const signal = () => new AbortController().signal;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cache.captureFence.mockResolvedValue('fence');
  mocks.cache.open.mockResolvedValue(namespace);
  mocks.cache.checkpoint.mockResolvedValue(namespace);
  mocks.cache.installKey.mockResolvedValue(namespace);
  mocks.bootstrap.mockResolvedValue(firstPage);
  mocks.changes.mockResolvedValue(changePage);
  mocks.vault.mockResolvedValue(access);
  mocks.worker.beginCandidateSearch.mockResolvedValue(index);
  mocks.worker.candidateSearchStatus.mockResolvedValue({ documents: 75_000, unreadableDocuments: 0 });

  mocks.worker.commitCandidateSearch.mockImplementation(async (_index, commit) => ({
    index,
    namespace: { ...namespace, appliedCursor: commit.nextCursor ?? '0' },
  }));
});

describe('Candidate disk search synchronization', () => {
  it('opens an existing disk index without rebuilding or imposing a document-count cap', async () => {
    const runtime = new CandidateSearchRuntime(orgId, identity, access);

    expect(await runtime.sync(signal())).toMatchObject({ phase: 'ready', indexed: 75_000 });
    expect(mocks.worker.commitCandidateSearch).toHaveBeenCalledOnce();
    expect(mocks.worker.commitCandidateSearch.mock.calls[0][1].kind).toBe('changes');
  });

  it('does not open or decrypt disk data before fresh authorization', async () => {
    const authorization = Promise.withResolvers<typeof firstPage>();
    mocks.bootstrap.mockReturnValueOnce(authorization.promise);
    const runtime = new CandidateSearchRuntime(orgId, identity, access);
    const pending = runtime.sync(signal());
    await vi.waitFor(() => expect(mocks.bootstrap).toHaveBeenCalled());

    expect(mocks.cache.open).not.toHaveBeenCalled();
    expect(mocks.worker.beginCandidateSearch).not.toHaveBeenCalled();

    authorization.resolve(firstPage);

    expect((await pending).phase).toBe('ready');
  });

  it('atomically adopts the winning key wrapper before opening the index', async () => {
    mocks.cache.open.mockResolvedValueOnce({ ...namespace, wrappedKey: null });
    const proposed = { ...namespace.wrappedKey, ek: 'proposed' };
    mocks.worker.createCandidateSearchCacheKey.mockResolvedValueOnce(proposed);
    const runtime = new CandidateSearchRuntime(orgId, identity, access);
    await runtime.sync(signal());
    await runtime.sync(signal());

    expect(mocks.cache.installKey).toHaveBeenCalledWith(expect.objectContaining({ wrappedKey: null }), proposed);
    expect(mocks.worker.beginCandidateSearch).toHaveBeenCalledWith({ orgId, scopeToken }, access, namespace);
    expect(mocks.worker.createCandidateSearchCacheKey).toHaveBeenCalledOnce();
  });

  it('passes bootstrap profiles and cursor to one Worker transaction', async () => {
    mocks.cache.open.mockResolvedValueOnce({
      ...namespace,
      phase: 'bootstrap',
      bootstrapHead: null,
      bootstrapCursor: null,
    });

    const runtime = new CandidateSearchRuntime(orgId, identity, access);
    await runtime.sync(signal());
    const { projectionWorkAvailable: _available, ...page } = firstPage;

    expect(mocks.worker.commitCandidateSearch.mock.calls[0][1]).toEqual({
      ...page,
      kind: 'bootstrap',
      expectedCursor: null,
    });
  });

  it('continues a fixed interval when the response head has advanced', async () => {
    mocks.changes
      .mockResolvedValueOnce({ ...changePage, head: '1' })
      .mockResolvedValueOnce({ ...changePage, head: '1', nextCursor: '1', throughCursor: '1' });

    const runtime = new CandidateSearchRuntime(orgId, identity, access);

    expect((await runtime.sync(signal())).ready?.index).toEqual(index);

    const { projectionWorkAvailable: _available, ...change } = changePage;

    expect(mocks.worker.commitCandidateSearch).toHaveBeenLastCalledWith(index, {
      ...change,
      kind: 'changes',
      head: '1',
      nextCursor: '1',
      throughCursor: '1',
    });

    expect(mocks.changes).toHaveBeenCalledTimes(2);
  });

  it('does not publish ready state after disposal during a commit', async () => {
    const completion = Promise.withResolvers<CandidateCommitResult>();
    mocks.worker.commitCandidateSearch.mockReturnValueOnce(completion.promise);
    const runtime = new CandidateSearchRuntime(orgId, identity, access);
    const pending = runtime.sync(signal());
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(mocks.worker.commitCandidateSearch).toHaveBeenCalled());
    runtime.dispose();
    completion.resolve({ index, namespace });
    await rejected;
  });

  it('serializes overlapping passes without replacing the Worker generation', async () => {
    const completion = Promise.withResolvers<CandidateCommitResult>();
    mocks.worker.commitCandidateSearch.mockReturnValueOnce(completion.promise);
    const runtime = new CandidateSearchRuntime(orgId, identity, access);
    const first = runtime.sync(signal());
    await vi.waitFor(() => expect(mocks.worker.commitCandidateSearch).toHaveBeenCalled());
    const second = runtime.sync(signal());
    completion.resolve({ index, namespace });

    expect((await first).phase).toBe('ready');
    expect((await second).phase).toBe('ready');
    expect(mocks.worker.beginCandidateSearch).toHaveBeenCalledOnce();
  });

  it('joins a namespace advanced by another tab without deleting its index', async () => {
    mocks.worker.commitCandidateSearch.mockRejectedValueOnce(new CandidateSearchCacheError('changed'));
    const runtime = new CandidateSearchRuntime(orgId, identity, access);

    expect((await runtime.sync(signal())).phase).toBe('syncing');
    expect(mocks.cache.invalidate).not.toHaveBeenCalled();
    expect((await runtime.sync(signal())).phase).toBe('ready');
  });

  it('stops after eviction instead of repeatedly downloading the corpus', async () => {
    mocks.worker.commitCandidateSearch.mockRejectedValueOnce(new CandidateSearchCacheError('changed'));
    mocks.cache.checkpoint.mockRejectedValueOnce(new CandidateSearchCacheError('changed'));
    const runtime = new CandidateSearchRuntime(orgId, identity, access);

    await expect(runtime.sync(signal())).rejects.toMatchObject({ code: 'changed' });
    expect(mocks.bootstrap).toHaveBeenCalledOnce();
  });

  it.each(['unsupported', 'blocked'] as const)('preserves storage on %s errors', async (code) => {
    mocks.cache.captureFence.mockRejectedValueOnce(new CandidateSearchCacheError(code));
    const runtime = new CandidateSearchRuntime(orgId, identity, access);

    await expect(runtime.sync(signal())).rejects.toMatchObject({ code });
    expect(mocks.cache.reset).not.toHaveBeenCalled();
    expect(mocks.cache.invalidate).not.toHaveBeenCalled();
  });

  it('invalidates a bad wrapped key before fresh authorization and retry', async () => {
    mocks.worker.beginCandidateSearch.mockRejectedValueOnce(new CandidateSearchError('SEARCH_CACHE_INVALID'));
    const runtime = new CandidateSearchRuntime(orgId, identity, access);

    expect((await runtime.sync(signal())).phase).toBe('syncing');
    expect(mocks.cache.invalidate).toHaveBeenCalledWith(namespace);
    expect((await runtime.sync(signal())).phase).toBe('ready');
    expect(mocks.bootstrap).toHaveBeenCalledTimes(2);
  });

  it('invalidates corrupted query ciphertext before authorizing the next search session', async () => {
    const runtime = new CandidateSearchRuntime(orgId, identity, access);
    await runtime.sync(signal());

    mocks.worker.evaluateCandidateSearchReferences.mockRejectedValueOnce(
      new CandidateSearchError('SEARCH_CACHE_INVALID'),
    );

    await expect(runtime.evaluate(index, { profileText: 'anna' }, [], signal())).rejects.toMatchObject({
      code: 'SEARCH_CACHE_INVALID',
    });

    expect(mocks.cache.invalidate).toHaveBeenCalledWith(namespace);
    expect(mocks.worker.clearCandidateSearch).toHaveBeenCalledOnce();
    expect((await runtime.sync(signal())).phase).toBe('ready');
    expect(mocks.bootstrap).toHaveBeenCalledTimes(2);
  });

  it('fences invalid metadata with a fresh catalog before retry', async () => {
    mocks.cache.captureFence.mockRejectedValueOnce(new CandidateSearchCacheError('invalid'));
    const runtime = new CandidateSearchRuntime(orgId, identity, access);

    expect((await runtime.sync(signal())).phase).toBe('syncing');
    expect(mocks.cache.reset).toHaveBeenCalledOnce();
    expect((await runtime.sync(signal())).phase).toBe('ready');
  });

  it('retains an atomic bootstrap checkpoint after a capacity stop for explicit Retry', async () => {
    const partial = {
      ...namespace,
      phase: 'bootstrap',
      recordCount: 1000,
      bootstrapCursor: 'resume',
      bootstrapHead: '0',
    };

    mocks.cache.open.mockResolvedValueOnce(partial);
    mocks.worker.commitCandidateSearch.mockRejectedValueOnce(new CandidateSearchCacheError('capacity'));
    const runtime = new CandidateSearchRuntime(orgId, identity, access);

    await expect(runtime.sync(signal())).rejects.toMatchObject({ code: 'capacity' });
    expect(mocks.cache.invalidate).not.toHaveBeenCalled();
    expect((await runtime.sync(signal())).phase).toBe('ready');
    expect(mocks.bootstrap.mock.calls[2][1]).toBe('resume');
    expect(mocks.cache.open).toHaveBeenCalledOnce();
  });
});
