import { CryptoProxy, type VaultKeyAccess } from '@comitium/crypto';
import { createCandidateProfile } from '@comitium/crypto/candidate-profile';
import { CandidateSearchCache } from '@comitium/crypto/candidate-search-cache';
import type {
  CandidateSearchProfileDocument,
  CandidateSearchReference,
} from '@comitium/crypto/candidate-search-protocol';
import { releaseProxy, wrap } from 'comlink';
import { renderHook } from 'vitest-browser-react';
import { useCandidateDirectoryProfiles } from '@/hooks/use-candidate-directory-profiles';
import type { CryptoWorkerApi } from '../../../../../../packages/crypto/src/worker/crypto-api';
import type { CandidateDirectoryRow } from './candidate-query';
import '../../../../../../packages/crypto/src/worker/error-transport';
import { deleteDB, openDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type NativeSearchFixture,
  nativeSearchFixture,
  nativeSearchKeys,
} from '../../../../../../packages/crypto/src/__tests__/candidate-search-browser-fixtures';
import { openCandidateSearchDatabase } from '../../../../../../packages/crypto/src/candidate-search-cache/database';
import { namespaceKey, namespaceRange } from '../../../../../../packages/crypto/src/candidate-search-cache/namespace';
import {
  catalogSchema,
  storedPostingSchema,
} from '../../../../../../packages/crypto/src/schemas/candidate-search-cache';
import { CandidateSearchCacheCipher } from '../../../../../../packages/crypto/src/worker/candidate-search-cache-cipher';
import {
  candidatePostingAddress,
  candidateRegistryAddress,
} from '../../../../../../packages/crypto/src/worker/candidate-search-storage-address';

function reference(document: CandidateSearchProfileDocument): CandidateSearchReference {
  const { candidateId, profileRevision, profileFingerprint } = document;

  return { candidateId, profileRevision, profileFingerprint };
}

let displayUnlocked = true;
let displayAccess: VaultKeyAccess | undefined;

vi.mock('@comitium/auth/use-is-crypto-active', () => ({ useIsCryptoActive: () => displayUnlocked }));

vi.mock('@/hooks/queries/use-query-org-vault-access', () => ({
  useQueryOrgVaultAccess: () => ({ data: displayAccess }),
}));

const fixtures: NativeSearchFixture[] = [];
async function setup(name?: string, maxBytes?: number) {
  const fixture = await nativeSearchFixture(name, maxBytes);
  fixtures.push(fixture);

  return fixture;
}

afterEach(async () => {
  displayUnlocked = true;
  displayAccess = undefined;
  vi.restoreAllMocks();

  const names = new Set(fixtures.map((fixture) => fixture.name));

  for (const fixture of fixtures.splice(0)) {
    fixture.session.clear();
    fixture.database.close();
  }

  for (const name of names) {
    await deleteDB(name);
  }
});

describe('Native encrypted Candidate disk index', () => {
  it('renders authorized cached fields without canonical decryption and clears visible state on lock', async () => {
    const fixture = await setup();

    const document = await fixture.source(1, {
      currentTitle: 'Principal Engineer',
      currentCompany: 'Private Company',
      location: { cityId: 756135, city: 'Warsaw', country: 'PL' },
    });

    await fixture.bootstrap([document]);
    displayAccess = fixture.access;

    const rows: CandidateDirectoryRow[] = [
      { ...document, profile: null, searchIndex: fixture.index, matchedApplication: null, tagIds: [] },
    ];

    const decrypt = vi.spyOn(CryptoProxy, 'decryptApplication');

    vi.spyOn(CryptoProxy, 'evaluateCandidateSearchReferences').mockImplementation((index, filter, references) =>
      fixture.search.evaluateCandidateSearchReferences(index, filter, references),
    );

    const hook = await renderHook(() => useCandidateDirectoryProfiles(fixture.access.orgId, rows));

    await vi.waitFor(() =>
      expect(hook.result.current.profiles?.get(document.candidateId)).toMatchObject({
        name: 'Anna Smith',
        subtitle: 'Principal Engineer · Private Company',
      }),
    );

    expect(hook.result.current.profiles?.get(document.candidateId)?.location).toContain('Warsaw');
    expect(decrypt).not.toHaveBeenCalled();

    displayUnlocked = false;
    await hook.rerender();

    expect(hook.result.current.profiles).toBeUndefined();

    await hook.unmount();
  });

  it('reuses canonical display values while loading new rows and scrolling back', async () => {
    const fixture = await setup();
    displayAccess = fixture.access;
    const documents = await Promise.all([1, 2, 3].map((index) => fixture.source(index)));

    const values = documents.map((document) => ({ ...document, matchedApplication: null, tagIds: [] }));

    const profile = createCandidateProfile({
      firstName: 'Anna',
      lastName: 'Smith',
      email: null,
      phone: null,
      linkedIn: null,
      github: null,
      website: null,
      location: null,
      currentTitle: 'Engineer',
      currentCompany: 'Company',
    });

    const decrypt = vi.spyOn(CryptoProxy, 'decryptApplication').mockResolvedValue(profile);
    let rows = values.slice(0, 2);

    const hook = await renderHook(() => useCandidateDirectoryProfiles(fixture.access.orgId, rows));
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(2));
    const retained = hook.result.current.profiles?.get(values[1].candidateId);
    const next = Promise.withResolvers<Record<string, unknown>>();
    decrypt.mockReturnValueOnce(next.promise);
    rows = values.slice(1);
    await hook.rerender();

    expect(hook.result.current.profiles?.get(values[1].candidateId)).toEqual(retained);
    expect(decrypt).toHaveBeenCalledTimes(3);

    next.resolve(profile);
    await vi.waitFor(() => expect(hook.result.current.profiles?.size).toBe(2));
    rows = values.slice(0, 2);
    await hook.rerender();

    expect(hook.result.current.profiles?.size).toBe(2);
    expect(decrypt).toHaveBeenCalledTimes(3);

    await hook.unmount();
  });

  it('reopens a complete index without canonical rebuild or retaining source envelopes', async () => {
    const first = await setup();

    const document = await first.source(1, {
      firstName: 'ＡＮＮＡ',
      lastName: 'Müller',
      currentTitle: 'Principal Engineer',
      currentCompany: 'Private Company',
      location: { cityId: 756135, city: 'Warsaw', country: 'PL' },
    });

    await first.bootstrap([document]);
    const second = await setup(first.name);

    expect(
      (
        await second.search.evaluateCandidateSearchReferences(second.index, { profileText: 'ann mül' }, [
          reference(document),
        ])
      )[0].outcome,
    ).toBe('match');

    const [match] = await second.search.evaluateCandidateSearchReferences(second.index, { profileText: 'ann' }, [
      reference(document),
    ]);

    expect(match).toMatchObject({
      outcome: 'match',
      displayProfile: {
        firstName: 'ＡＮＮＡ',
        lastName: 'Müller',
        currentTitle: 'Principal Engineer',
        currentCompany: 'Private Company',
        location: { cityId: 756135, city: 'Warsaw', country: 'PL' },
      },
    });

    const row = await first.database.get('records', [namespaceKey(first.namespace.key), document.candidateId]);

    expect(row).not.toHaveProperty('profile');
    expect(JSON.stringify(row)).not.toContain('Anna');
    expect(JSON.stringify(row)).not.toContain('Private Company');
    expect(JSON.stringify(row)).not.toContain('Warsaw');
    expect((await second.search.candidateSearchStatus()).documents).toBe(1);
  });

  it('publishes updated terms and deletion with their checkpoints and rejects stale references', async () => {
    const fixture = await setup();
    const original = await fixture.source(1);
    await fixture.bootstrap([original]);
    const updated = await fixture.source(1, { lastName: 'Miller', email: 'new@example.test' }, 2);

    const change = await fixture.search.commitCandidateSearch(fixture.index, {
      kind: 'changes',
      scopeToken: fixture.index.scopeToken,
      since: '0',
      nextCursor: '1',
      throughCursor: '1',
      head: '1',
      caughtUp: true,
      events: [{ ...updated, operation: 'upsert', sequence: '1' }],
    });

    expect(change.namespace.appliedCursor).toBe('1');

    expect(
      (
        await fixture.search.evaluateCandidateSearchReferences(change.index, { profileText: 'smith' }, [
          reference(updated),
        ])
      )[0].outcome,
    ).toBe('no_match');

    expect(
      (
        await fixture.search.evaluateCandidateSearchReferences(change.index, { profileText: 'miller new' }, [
          reference(updated),
        ])
      )[0].outcome,
    ).toBe('match');

    expect(
      (await fixture.search.evaluateCandidateSearchReferences(change.index, {}, [reference(original)]))[0].outcome,
    ).toBe('hydrate');

    const deleted = await fixture.search.commitCandidateSearch(change.index, {
      kind: 'changes',
      scopeToken: change.index.scopeToken,
      since: '1',
      nextCursor: '2',
      throughCursor: '2',
      head: '2',
      caughtUp: true,
      events: [{ operation: 'delete', sequence: '2', candidateId: updated.candidateId }],
    });

    expect(deleted.namespace).toMatchObject({ appliedCursor: '2', recordCount: 0 });

    await fixture.search.commitCandidateSearch(deleted.index, {
      kind: 'hydrate',
      head: '1',
      profiles: [updated],
    });

    expect(await fixture.cache.checkpoint(fixture.namespace)).toMatchObject({ appliedCursor: '2', recordCount: 0 });

    await expect(
      fixture.search.evaluateCandidateSearchReferences(change.index, {}, [reference(updated)]),
    ).rejects.toThrow('SEARCH_SCOPE_CHANGED');

    expect(
      (await fixture.search.evaluateCandidateSearchReferences(deleted.index, {}, [reference(updated)]))[0].outcome,
    ).toBe('hydrate');
  });

  it('updates and removes across posting buckets without touching an unrelated encrypted row', async () => {
    const fixture = await setup();
    const first = await fixture.source(1);
    await fixture.bootstrap([first]);
    const catalog = await fixture.database.get('records', 'catalog');

    const parsed = catalogSchema.parse(catalog);
    parsed.namespaces[0].nextDocumentId = 1024;
    await fixture.database.put('records', parsed, 'catalog');
    const second = await fixture.source(2);
    const third = await fixture.source(3);

    await fixture.search.commitCandidateSearch(fixture.index, {
      kind: 'hydrate',
      head: '0',
      profiles: [second, third],
    });

    const cipher = new CandidateSearchCacheCipher(fixture.session);
    await cipher.open(fixture.index, await fixture.cache.checkpoint(fixture.namespace));

    try {
      const firstAddress = await candidatePostingAddress(cipher, 'smith', 0);
      const secondAddress = await candidatePostingAddress(cipher, 'smith', 1);

      const one = storedPostingSchema.parse(
        await fixture.database.get('records', [namespaceKey(fixture.namespace.key), firstAddress]),
      );

      const two = storedPostingSchema.parse(
        await fixture.database.get('records', [namespaceKey(fixture.namespace.key), secondAddress]),
      );

      expect(await cipher.decryptPosting(firstAddress, one.data)).toEqual([[1, 1024]]);
      expect(await cipher.decryptPosting(secondAddress, two.data)).toEqual([[1025]]);

      const unrelated = await candidatePostingAddress(cipher, 'unrelated', 10);

      await fixture.database.put('records', { ...one, data: { ...one.data, ct: new Uint8Array(16) } }, [
        namespaceKey(fixture.namespace.key),
        unrelated,
      ]);

      const updated = await fixture.source(2, { lastName: 'Jones' }, 2);
      await fixture.search.commitCandidateSearch(fixture.index, { kind: 'hydrate', head: '0', profiles: [updated] });

      const result = await fixture.search.evaluateCandidateSearchReferences(fixture.index, { profileText: 'smith' }, [
        reference(first),
        reference(updated),
        reference(third),
      ]);

      expect(result.map((entry) => entry.outcome)).toEqual(['match', 'no_match', 'match']);

      const removed = await fixture.search.commitCandidateSearch(fixture.index, {
        kind: 'changes',
        scopeToken: fixture.index.scopeToken,
        since: '0',
        nextCursor: '1',
        throughCursor: '1',
        head: '1',
        caughtUp: true,
        events: [{ candidateId: third.candidateId, operation: 'delete', sequence: '1' }],
      });

      const registry = await candidateRegistryAddress(cipher, 1025);

      expect(await fixture.database.get('records', [namespaceKey(fixture.namespace.key), registry])).toBeUndefined();

      expect(
        await fixture.database.get('records', [namespaceKey(fixture.namespace.key), secondAddress]),
      ).toBeUndefined();

      expect(
        (
          await fixture.search.evaluateCandidateSearchReferences(removed.index, { profileText: 'smith' }, [
            reference(first),
          ])
        )[0].outcome,
      ).toBe('match');
    } finally {
      cipher.clear();
    }
  });

  it.each(['checkpoint', 'unrelated profile'] as const)(
    'keeps a coherent query snapshot after another connection publishes %s',
    async (publication) => {
      const left = await setup();
      const document = await left.source(1);
      await left.bootstrap([document]);
      const right = await setup(left.name);

      const read = left.cache.readQuery.bind(left.cache);

      const spy = vi.spyOn(left.cache, 'readQuery').mockImplementationOnce(async (binding, ids, addresses) => {
        const snapshot = await read(binding, ids, addresses);

        if (publication === 'unrelated profile') {
          const added = await right.source(2);
          await right.search.commitCandidateSearch(right.index, { kind: 'hydrate', head: '0', profiles: [added] });

          return snapshot;
        }

        await right.search.commitCandidateSearch(right.index, {
          kind: 'changes',
          scopeToken: right.index.scopeToken,
          since: '0',
          head: '0',
          throughCursor: '0',
          nextCursor: '0',
          caughtUp: true,
          events: [],
        });

        return snapshot;
      });

      try {
        const result = await left.search.evaluateCandidateSearchReferences(left.index, { profileText: 'anna' }, [
          reference(document),
        ]);

        expect(result[0].outcome).toBe('match');
      } finally {
        spy.mockRestore();
      }
    },
  );

  it('rejects a coherent query snapshot after its namespace is invalidated', async () => {
    const fixture = await setup();
    const document = await fixture.source(1);
    await fixture.bootstrap([document]);
    const read = fixture.cache.readQuery.bind(fixture.cache);

    const spy = vi.spyOn(fixture.cache, 'readQuery').mockImplementationOnce(async (binding, ids, addresses) => {
      const snapshot = await read(binding, ids, addresses);
      await fixture.cache.invalidate(fixture.namespace);

      return snapshot;
    });

    try {
      await expect(
        fixture.search.evaluateCandidateSearchReferences(fixture.index, { profileText: 'anna' }, [reference(document)]),
      ).rejects.toMatchObject({ code: 'changed' });
    } finally {
      spy.mockRestore();
    }
  });

  it('hydrates a profile whose local ID moves between discovery and the coherent query snapshot', async () => {
    const left = await setup();
    const original = await left.source(1);
    await left.bootstrap([original]);
    const right = await setup(left.name);
    const updated = await right.source(1, { lastName: 'Jones' }, 2);

    const read = left.cache.readDocuments.bind(left.cache);

    const spy = vi.spyOn(left.cache, 'readDocuments').mockImplementationOnce(async (binding, ids) => {
      const snapshot = await read(binding, ids);

      const deleted = await right.search.commitCandidateSearch(right.index, {
        kind: 'changes',
        scopeToken: right.index.scopeToken,
        since: '0',
        nextCursor: '1',
        throughCursor: '1',
        head: '1',
        caughtUp: true,
        events: [{ candidateId: original.candidateId, operation: 'delete', sequence: '1' }],
      });

      await right.search.commitCandidateSearch(deleted.index, { kind: 'hydrate', head: '1', profiles: [updated] });

      return snapshot;
    });

    try {
      const result = await left.search.evaluateCandidateSearchReferences(left.index, { profileText: 'jones' }, [
        reference(updated),
      ]);

      expect(result[0].outcome).toBe('hydrate');

      const retried = await left.search.evaluateCandidateSearchReferences(left.index, { profileText: 'jones' }, [
        reference(updated),
      ]);

      expect(retried[0].outcome).toBe('match');
    } finally {
      spy.mockRestore();
    }
  });

  it('evaluates more than one internal chunk without the library default result cap', async () => {
    const fixture = await setup();
    const documents = await Promise.all(Array.from({ length: 130 }, (_, index) => fixture.source(index + 1)));
    await fixture.bootstrap(documents);

    const result = await fixture.search.evaluateCandidateSearchReferences(
      fixture.index,
      { profileText: 'ann smi' },
      documents.map(reference),
    );

    expect(result).toHaveLength(130);
    expect(result.every((entry) => entry.outcome === 'match')).toBe(true);
  });

  it('resets a known previous local format and fences its pending namespace', async () => {
    const fixture = await setup();
    await fixture.bootstrap([await fixture.source(1)]);
    const previous = catalogSchema.parse(await fixture.database.get('records', 'catalog'));
    await fixture.database.put('records', { ...previous, version: 4 }, 'catalog');

    await expect(fixture.cache.captureFence()).rejects.toMatchObject({ code: 'invalid' });

    await fixture.cache.reset();

    expect(await fixture.database.count('records')).toBe(1);
    await expect(fixture.cache.checkpoint(fixture.namespace)).rejects.toMatchObject({ code: 'changed' });

    expect(await fixture.cache.open(fixture.namespace.context, await fixture.cache.captureFence())).toMatchObject({
      phase: 'bootstrap',
      recordCount: 0,
    });
  });

  it('leaves the previous complete index and checkpoint intact when disk admission fails', async () => {
    const fixture = await setup(undefined, 64 * 1024);
    const original = await fixture.source(1);
    await fixture.bootstrap([original]);

    const dense = await fixture.source(2, {
      firstName: Array.from({ length: 50 }, (_, index) => `dense${index}prefix`).join(' '),
    });

    await expect(
      fixture.search.commitCandidateSearch(fixture.index, {
        kind: 'changes',
        scopeToken: fixture.index.scopeToken,
        since: '0',
        nextCursor: '1',
        throughCursor: '1',
        head: '1',
        caughtUp: true,
        events: [{ ...dense, operation: 'upsert', sequence: '1' }],
      }),
    ).rejects.toMatchObject({ code: 'capacity' });

    expect(await fixture.cache.checkpoint(fixture.namespace)).toMatchObject({ appliedCursor: '0', recordCount: 1 });

    expect(
      (
        await fixture.search.evaluateCandidateSearchReferences(fixture.index, { profileText: 'smith' }, [
          reference(original),
        ])
      )[0].outcome,
    ).toBe('match');

    expect(
      await fixture.database.get('records', [namespaceKey(fixture.namespace.key), dense.candidateId]),
    ).toBeUndefined();
  });

  it('rejects a competing writer and converges when the losing connection retries its delta', async () => {
    const left = await setup();
    await left.bootstrap([]);
    const right = await setup(left.name);
    const first = await left.source(1);
    const second = await right.source(2);

    const a = { kind: 'hydrate' as const, head: '0', profiles: [first] };
    const b = { kind: 'hydrate' as const, head: '0', profiles: [second] };

    const writes = await Promise.allSettled([
      left.search.commitCandidateSearch(left.index, a),
      right.search.commitCandidateSearch(right.index, b),
    ]);

    expect(writes.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);

    const retry = writes[0].status === 'rejected' ? ([left, a] as const) : ([right, b] as const);
    await retry[0].search.commitCandidateSearch(retry[0].index, retry[1]);

    expect((await left.cache.checkpoint(left.namespace)).recordCount).toBe(2);
  });

  it('preserves an unknown future format instead of resetting it', async () => {
    const fixture = await setup();
    const current = await fixture.database.get('records', 'catalog');
    await fixture.database.put('records', { version: 999, sentinel: 'future-data' }, 'catalog');

    await expect(fixture.cache.captureFence()).rejects.toMatchObject({ code: 'unsupported' });
    await expect(fixture.cache.reset()).rejects.toMatchObject({ code: 'unsupported' });
    expect(await fixture.database.get('records', 'catalog')).toEqual({ version: 999, sentinel: 'future-data' });

    await fixture.database.put('records', current, 'catalog');
  });

  it('does not resurrect encrypted index records after account purge', async () => {
    const fixture = await setup();
    await fixture.bootstrap([]);
    const fence = await fixture.cache.captureFence();
    await fixture.cache.purgeAccount(fixture.namespace.context.userId);

    await expect(fixture.cache.open(fixture.namespace.context, fence)).rejects.toMatchObject({ code: 'changed' });

    await expect(
      fixture.search.commitCandidateSearch(fixture.index, {
        kind: 'hydrate',
        head: '0',
        profiles: [await fixture.source(1)],
      }),
    ).rejects.toMatchObject({ code: 'changed' });
  });

  it('rejects a late source commit after lock without advancing its checkpoint', async () => {
    const fixture = await setup();
    await fixture.bootstrap([]);
    const document = await fixture.source(1);

    const pending = fixture.search.commitCandidateSearch(fixture.index, {
      kind: 'hydrate',
      head: '0',
      profiles: [document],
    });

    const rejected = expect(pending).rejects.toThrow('SEARCH_SCOPE_CHANGED');
    fixture.session.clear();
    await rejected;

    expect(await fixture.cache.checkpoint(fixture.namespace)).toMatchObject({ appliedCursor: '0', recordCount: 0 });
    expect(await fixture.search.candidateSearchStatus()).toMatchObject({ status: 'inactive', documents: 0 });
  });

  it('does not treat an unreadable canonical source as a known nonmatch', async () => {
    const fixture = await setup();
    const document = await fixture.source(1);
    document.candidateId = '00000000-0000-4000-8000-000000000002';
    await fixture.bootstrap([document]);

    expect(
      (
        await fixture.search.evaluateCandidateSearchReferences(fixture.index, { profileText: 'anna' }, [
          reference(document),
        ])
      )[0].outcome,
    ).toBe('unreadable');

    expect((await fixture.search.candidateSearchStatus()).unreadableDocuments).toBe(1);
  });

  it('evicts an entire binary namespace when another org occupies its cache slot', async () => {
    const fixture = await setup();
    await fixture.bootstrap([await fixture.source(1)]);
    const cache = new CandidateSearchCache({ database: async () => fixture.database, maxNamespaces: 1 });
    const other = { ...fixture.namespace.context, orgId: '00000000-0000-4000-8000-000000000999' };
    await cache.open(other, await cache.captureFence());

    await expect(fixture.cache.checkpoint(fixture.namespace)).rejects.toMatchObject({ code: 'changed' });
    expect(await fixture.database.count('records', namespaceRange(fixture.namespace.key))).toBe(0);
    expect((await cache.statistics()).namespaces).toBe(1);
  });

  it('adopts one immutable namespace key when two connections propose different wrappers', async () => {
    const fixture = await setup();
    const second = await setup(fixture.name);

    const cache = fixture.cache;

    const namespace = await cache.open(
      { ...fixture.namespace.context, scopeToken: 'key-race' },
      await cache.captureFence(),
    );

    const firstKey = await fixture.search.createCandidateSearchCacheKey(namespace, fixture.access);
    const secondKey = await second.search.createCandidateSearchCacheKey(namespace, second.access);

    const winners = await Promise.all([
      cache.installKey(namespace, firstKey),
      second.cache.installKey(namespace, secondKey),
    ]);

    expect(winners[0].wrappedKey).toEqual(winners[1].wrappedKey);
    expect(firstKey).not.toEqual(secondKey);
  });

  it('blocks the native upgrade until a v1 reader closes, then fences that old reader', async () => {
    const legacy = await openDB('comitium_candidate_search_v1', 1, {
      upgrade(db) {
        db.createObjectStore('records');
      },
    });

    try {
      await legacy.put('records', { synthetic: true }, 'legacy');

      await expect(openCandidateSearchDatabase()).rejects.toMatchObject({ code: 'blocked' });
    } finally {
      legacy.close();
    }

    const upgraded = await openCandidateSearchDatabase();

    expect(upgraded.version).toBe(2);
    expect(await upgraded.get('records', 'legacy')).toBeUndefined();
    await expect(openDB('comitium_candidate_search_v1', 1)).rejects.toMatchObject({ name: 'VersionError' });
  });

  it('runs the disk index inside the actual Crypto Worker and preserves it across Worker restart', async () => {
    const fixture = await setup();
    const document = await fixture.source(1);

    const cache = new CandidateSearchCache();
    const context = { ...fixture.namespace.context, scopeToken: `worker-${crypto.randomUUID()}` };

    let namespace = await cache.open(context, await cache.captureFence());

    let worker = new Worker(new URL('../../../../../../packages/crypto/src/worker/crypto.worker.ts', import.meta.url), {
      type: 'module',
    });

    let remote = wrap<CryptoWorkerApi>(worker);

    async function unlock(): Promise<void> {
      await remote.ready();
      await remote.configure('http://127.0.0.1:63315');

      await remote.unlockWithRecoveryCode(
        nativeSearchKeys.encryptedUserKey,
        nativeSearchKeys.userId,
        nativeSearchKeys.userPublicKey,
        nativeSearchKeys.recoveryCode,
        false,
      );
    }

    try {
      await unlock();

      namespace = await cache.installKey(
        namespace,
        await remote.createCandidateSearchCacheKey(namespace, fixture.access),
      );

      const scope = { orgId: context.orgId, scopeToken: context.scopeToken };

      const index = await remote.beginCandidateSearch(scope, fixture.access, namespace);

      const boot = await remote.commitCandidateSearch(index, {
        kind: 'bootstrap',
        corpusVersion: 1,
        scopeToken: scope.scopeToken,
        head: '0',
        upperCandidateId: document.candidateId,
        profiles: [document],
        expectedCursor: null,
        nextCursor: null,
      });

      await remote.commitCandidateSearch(boot.index, {
        kind: 'changes',
        scopeToken: scope.scopeToken,
        since: '0',
        head: '0',
        nextCursor: '0',
        throughCursor: '0',
        caughtUp: true,
        events: [],
      });

      await remote.clear();
      remote[releaseProxy]();
      worker.terminate();

      worker = new Worker(new URL('../../../../../../packages/crypto/src/worker/crypto.worker.ts', import.meta.url), {
        type: 'module',
      });

      remote = wrap<CryptoWorkerApi>(worker);
      await unlock();
      const warm = await remote.beginCandidateSearch(scope, fixture.access, namespace);

      const evaluated = await remote.evaluateCandidateSearchReferences(warm, { profileText: 'ann smith' }, [
        reference(document),
      ]);

      expect(evaluated[0].outcome).toBe('match');
      expect((await remote.candidateSearchStatus()).documents).toBe(1);
    } finally {
      await remote.clear();
      remote[releaseProxy]();
      worker.terminate();
      await cache.purgeAccount(nativeSearchKeys.userId);
    }
  }, 15_000);
});
