import type { CandidateSearchCacheNamespace, CandidateSearchCommit } from '@comitium/crypto/candidate-search-cache';
import type {
  CandidateSearchProfileDocument,
  CandidateSearchReference,
} from '@comitium/crypto/candidate-search-protocol';
import type { CandidateSearchReferenceRow } from '@comitium/schemas/candidate-search';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CandidateSearchChanged, PrivateCandidateSearch } from './candidate-query';
import { type CandidateSearchReady, CandidateSearchRuntime } from './profile-corpus';

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn(),
  apply: vi.fn(),
  query: vi.fn(),
  hydrateHttp: vi.fn(),
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: { evaluateCandidateSearchReferences: mocks.evaluate, commitCandidateSearch: mocks.apply },
}));

vi.mock('@/lib/api/candidate-search', () => ({
  queryCandidates: mocks.query,
  hydrateCandidateCorpus: mocks.hydrateHttp,
}));

vi.mock('@/lib/api/orgs-vault', () => ({ getOrgVaultAccess: vi.fn() }));

const orgId = '00000000-0000-4000-8000-000000000001';

const identity = {
  userId: '00000000-0000-4000-8000-000000000002',
  keyVersion: 1,
  encryptedKeyFingerprint: 'a'.repeat(64),
};

const ready: CandidateSearchReady = { index: { orgId, scopeToken: 'scope', generation: 1 } };

const displayProfile = {
  firstName: 'Private',
  lastName: 'Lovelace',
  location: null,
  currentTitle: 'Engineer',
  currentCompany: 'Demo',
};

const namespace: CandidateSearchCacheNamespace = {
  key: 'a'.repeat(64),
  generation: orgId,
  context: { ...identity, orgId, scopeToken: 'scope', corpusVersion: 1 },
  wrappedKey: null,
  phase: 'complete',
  appliedCursor: '0',
  bootstrapCursor: null,
  bootstrapHead: '0',
  recordCount: 17,
  unreadableCount: 0,
  indexRevision: 1,
  nextDocumentId: 18,
  accountedBytes: 0,
  lastUsedAt: 0,
};

function documents(count: number): CandidateSearchProfileDocument[] {
  return Array.from({ length: count }, (_, index) => ({
    candidateId: `00000000-0000-4000-8000-${(index + 10).toString().padStart(12, '0')}`,
    profileRevision: 1,
    profileFingerprint: null,
    profile: null,
    firstSeenAt: '2026-01-01T00:00:00Z',
  }));
}

function rows(values: CandidateSearchProfileDocument[]): CandidateSearchReferenceRow[] {
  return values.map(({ profile: _profile, ...reference }) => ({ ...reference, matchedApplication: null, tagIds: [] }));
}

function response(data: CandidateSearchReferenceRow[], nextCursor: string | null = null) {
  return {
    mode: 'scan',
    data,
    profileCorpus: { scopeToken: 'scope', head: '0' },
    queryScopeToken: 'query-scope',
    pagination: { hasMore: nextCursor !== null, nextCursor },
    retrieval: 'exact',
    coverage: { professional: 'not_requested' },
    exhaustive: true,
    consistency: 'live_batches',
  };
}

let sources: CandidateSearchProfileDocument[];
let indexed: Set<string>;
let matching: Set<string>;
let runtime: CandidateSearchRuntime;

function useSources(values: CandidateSearchProfileDocument[]) {
  sources = values;
  indexed = new Set(values.map((profile) => profile.candidateId));
  matching = new Set(indexed);
}

function currentSource(reference: CandidateSearchReference) {
  return sources.find(
    (profile) =>
      profile.candidateId === reference.candidateId &&
      profile.profileRevision === reference.profileRevision &&
      profile.profileFingerprint === reference.profileFingerprint,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  useSources(documents(17));

  runtime = new CandidateSearchRuntime(orgId, identity, {
    orgId,
    vaultKeyVersion: 1,
    recipientUserId: identity.userId,
    recipientKeyVersion: 1,
    vaultPublicKey: { v: 1, xwing: '' },
    wrappedVaultKey: { v: 1, ek: '', epk: '', kemCt: '', iv: '' },
    searchKey: { orgId, vaultKeyVersion: 1, searchKeyVersion: 1, encryptedSearchKey: { v: 1, ek: '', iv: '' } },
  });

  mocks.query.mockImplementation(async () => response(rows(sources)));

  mocks.evaluate.mockImplementation(async (_handle, _filter, refs: CandidateSearchReference[]) =>
    refs.map((reference) => {
      if (!indexed.has(reference.candidateId) || !currentSource(reference)) {
        return { candidateId: reference.candidateId, outcome: 'hydrate' };
      }

      return {
        candidateId: reference.candidateId,
        outcome: matching.has(reference.candidateId) ? 'match' : 'no_match',
        displayProfile,
      };
    }),
  );

  mocks.hydrateHttp.mockImplementation(async (_org, _scope, refs: CandidateSearchReference[]) => ({
    scopeToken: 'scope',
    head: '0',
    profiles: sources.filter((profile) => refs.some((ref) => ref.candidateId === profile.candidateId)),
    unavailable: [],
  }));

  mocks.apply.mockImplementation(async (_handle, change: Extract<CandidateSearchCommit, { kind: 'hydrate' }>) => {
    for (const profile of change.profiles) {
      indexed.add(profile.candidateId);
    }

    return { index: ready.index, namespace };
  });
});

function search() {
  return new PrivateCandidateSearch(
    orgId,
    { version: 1, candidateAll: [], sort: 'first_seen_desc', limit: 50 },
    { profileText: 'Private Lovelace' },
  );
}

const signal = () => new AbortController().signal;

describe('Private Candidate query', () => {
  it('renders warm matches from the authorized local snapshot without hydration requests', async () => {
    useSources(documents(50));
    const page = await search().page(runtime, ready, signal());

    expect(page.rows).toHaveLength(50);
    expect(page.rows.every((row) => row.searchIndex === ready.index)).toBe(true);
    expect(JSON.stringify(page.rows)).not.toContain('Private');
    expect(mocks.query).toHaveBeenCalledOnce();
    expect(mocks.hydrateHttp).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('Private Lovelace');
  });

  it('hydrates unknown sources in bounded batches before deciding matches, without private HTTP literals', async () => {
    indexed.clear();

    const page = await search().page(runtime, ready, signal());

    expect(page.rows.map((row) => row.candidateId)).toEqual(sources.map((profile) => profile.candidateId));
    expect(mocks.hydrateHttp.mock.calls.map((call) => call[2].length)).toEqual([8, 8, 1]);
    expect(mocks.apply).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('Private Lovelace');
  });

  it('rejects a changed hydration scope before persistence or decryption', async () => {
    indexed.clear();

    mocks.hydrateHttp.mockResolvedValue({
      scopeToken: 'revoked',
      head: '1',
      profiles: sources.slice(0, 1),
      unavailable: [],
    });

    await expect(search().page(runtime, ready, signal())).rejects.toBeInstanceOf(CandidateSearchChanged);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('retains the same page after a source-repair failure', async () => {
    indexed.clear();
    mocks.hydrateHttp.mockRejectedValueOnce(new Error('Temporary source read failure'));
    const query = search();

    await expect(query.page(runtime, ready, signal())).rejects.toThrow('Temporary source read failure');

    const page = await query.page(runtime, ready, signal());

    expect(page.rows).toHaveLength(17);
    expect(mocks.evaluate).toHaveBeenCalledTimes(3);
  });

  it('finds matches on server page ten and preserves P+1 and the unprocessed tail across user pages', async () => {
    useSources(documents(160));
    matching = new Set(sources.slice(9).map((profile) => profile.candidateId));

    mocks.query.mockImplementation(async (_org, input) => {
      const page = input.cursor ? Number(input.cursor) : 0;

      return page < 9
        ? response(rows(sources.slice(page, page + 1)), String(page + 1))
        : response(rows(sources.slice(9)));
    });

    const query = search();
    const found: string[] = [];

    for (const expected of [50, 50, 50, 1]) {
      const page = await query.page(runtime, ready, signal());

      expect(page.rows).toHaveLength(expected);
      expect(page.hasMore).toBe(expected === 50);

      found.push(...page.rows.map((row) => row.candidateId));
      query.advance();
    }

    expect(found).toEqual(sources.slice(9).map((profile) => profile.candidateId));
  });

  it('rechecks source permissions before serving the retained tail', async () => {
    useSources(documents(100));
    const query = search();

    await query.page(runtime, ready, signal());
    query.advance();
    mocks.query.mockResolvedValueOnce({ ...response(rows(sources)), queryScopeToken: 'revoked' });

    await expect(query.page(runtime, ready, signal())).rejects.toBeInstanceOf(CandidateSearchChanged);
  });

  it('rejects index generation and scope changes before reusing a page', async () => {
    for (const changed of [
      { ...ready, index: { ...ready.index, generation: 2 } },
      { ...ready, index: { ...ready.index, scopeToken: 'revoked' } },
    ]) {
      const query = search();

      await query.page(runtime, ready, signal());

      await expect(query.page(runtime, changed, signal())).rejects.toBeInstanceOf(CandidateSearchChanged);
    }
  });

  it('continues past unrelated head updates and rechecks a changed buffered profile', async () => {
    useSources(documents(101));
    const query = search();

    const first = await query.page(runtime, ready, signal());
    query.advance();
    const buffered = sources[50];
    buffered.profileRevision = 2;
    matching.delete(buffered.candidateId);

    mocks.query.mockImplementation(async () => ({
      ...response(rows(sources)),
      profileCorpus: { scopeToken: 'scope', head: '3' },
    }));

    mocks.hydrateHttp.mockImplementation(async (_org, _scope, refs: CandidateSearchReference[]) => ({
      scopeToken: 'scope',
      head: '4',
      profiles: sources.filter((profile) => refs.some((ref) => ref.candidateId === profile.candidateId)),
      unavailable: [],
    }));

    const next = await query.page(runtime, ready, signal());

    expect(first.rows).toHaveLength(50);
    expect(next.rows.map((row) => row.candidateId)).toEqual(sources.slice(51).map((profile) => profile.candidateId));
    expect(next.hasMore).toBe(false);
    expect(mocks.apply).toHaveBeenCalledWith(ready.index, { kind: 'hydrate', head: '4', profiles: [buffered] });
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('appliedCursor');
  });

  it('reports unreadable profiles rather than claiming a complete zero result', async () => {
    useSources(documents(1));
    indexed.clear();

    mocks.hydrateHttp.mockResolvedValue({
      scopeToken: 'scope',
      head: '0',
      profiles: [],
      unavailable: sources.map((profile) => profile.candidateId),
    });

    const page = await search().page(runtime, ready, signal());

    expect(page).toMatchObject({ rows: [], hasMore: false, unreadable: 1 });
    expect(mocks.hydrateHttp).toHaveBeenCalledOnce();
  });

  it('bounds one user action and resumes the retained scan without losing matches', async () => {
    useSources(documents(33));
    matching = new Set([sources[32].candidateId]);

    mocks.query.mockImplementation(async (_org, input) => {
      const page = Number(input.cursor ?? 0);

      return response(rows(sources.slice(page, page + 1)), page < 32 ? String(page + 1) : null);
    });

    const query = search();

    expect(await query.page(runtime, ready, signal())).toMatchObject({ rows: [], scanning: true, hasMore: true });
    expect(mocks.query).toHaveBeenCalledTimes(32);

    const page = await query.page(runtime, ready, signal());

    expect(page.rows.map((row) => row.candidateId)).toEqual([sources[32].candidateId]);
    expect(page).toMatchObject({ scanning: false, hasMore: false });
  });

  it('shows early sparse matches and retains them while continuing the same page', async () => {
    useSources(documents(70));
    matching = new Set([sources[0].candidateId, sources[32].candidateId, sources[64].candidateId]);

    mocks.query.mockImplementation(async (_org, input) => {
      const index = Number(input.cursor ?? 0);

      return response(rows(sources.slice(index, index + 1)), index < 69 ? String(index + 1) : null);
    });

    const query = search();

    for (const count of [1, 2, 3]) {
      const page = await query.page(runtime, ready, signal());

      const expected = [sources[0], sources[32], sources[64]].slice(0, count);

      expect(page.rows.map((row) => row.candidateId)).toEqual(expected.map((source) => source.candidateId));
      expect(page).toMatchObject({ scanning: count < 3, hasMore: count < 3 });
    }
  });

  it('fills a partial page before advancing and preserves ordered overflow without duplicates', async () => {
    useSources(documents(70));

    mocks.query.mockImplementation(async (_org, input) => {
      const index = Number(input.cursor ?? 0);

      return response(rows(sources.slice(index, index + 1)), index < 69 ? String(index + 1) : null);
    });

    const query = search();

    const partial = await query.page(runtime, ready, signal());

    expect(partial.rows).toHaveLength(32);
    expect(partial).toMatchObject({ scanning: true, hasMore: true });

    const first = await query.page(runtime, ready, signal());

    expect(first.rows).toHaveLength(50);
    expect(first).toMatchObject({ scanning: false, hasMore: true });

    query.advance();

    const second = await query.page(runtime, ready, signal());

    expect(second).toMatchObject({ scanning: false, hasMore: false });

    expect([...first.rows, ...second.rows].map((row) => row.candidateId)).toEqual(
      sources.map((source) => source.candidateId),
    );
  });

  it('revalidates scope and current profile matches before extending a partial page', async () => {
    useSources(documents(33));
    matching = new Set([sources[0].candidateId, sources[32].candidateId]);

    mocks.query.mockImplementation(async (_org, input) => {
      const index = Number(input.cursor ?? 0);

      return response(rows(sources.slice(index, index + 1)), index < 32 ? String(index + 1) : null);
    });

    const query = search();

    const partial = await query.page(runtime, ready, signal());

    expect(partial.rows.map((row) => row.candidateId)).toEqual([sources[0].candidateId]);

    const revoked = search();
    await revoked.page(runtime, ready, signal());
    mocks.query.mockResolvedValueOnce({ ...response([]), queryScopeToken: 'revoked' });

    await expect(revoked.page(runtime, ready, signal())).rejects.toBeInstanceOf(CandidateSearchChanged);

    sources[0].profileRevision = 2;
    matching.delete(sources[0].candidateId);

    const complete = await query.page(runtime, ready, signal());

    expect(complete.rows.map((row) => row.candidateId)).toEqual([sources[32].candidateId]);
    expect(complete.scanning).toBe(false);
  });

  it('rejects a repeated server cursor instead of looping', async () => {
    mocks.query.mockResolvedValue(response([], 'same'));

    await expect(search().page(runtime, ready, signal())).rejects.toThrow('cursor did not advance');
  });

  it('cancellation discards late evaluation output without cancelling a newer query', async () => {
    const evaluation = Promise.withResolvers<{ candidateId: string; outcome: string }[]>();
    mocks.evaluate.mockReturnValueOnce(evaluation.promise);

    const old = search();
    const pending = old.page(runtime, ready, signal());
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });

    await vi.waitFor(() => expect(mocks.evaluate).toHaveBeenCalled());
    old.cancel();

    expect((await search().page(runtime, ready, signal())).rows).toHaveLength(17);

    evaluation.resolve([]);

    await rejected;
  });
});
