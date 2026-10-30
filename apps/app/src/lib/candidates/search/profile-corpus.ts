import { CryptoProxy, type VaultKeyAccess } from '@comitium/crypto';
import {
  CandidateSearchCache,
  CandidateSearchCacheError,
  type CandidateSearchCacheNamespace,
  type CandidateSearchCommit,
} from '@comitium/crypto/candidate-search-cache';
import {
  CandidateSearchError,
  type CandidateSearchFilter,
  type CandidateSearchHandle,
  type CandidateSearchProfileDocument,
  type CandidateSearchReference,
} from '@comitium/crypto/candidate-search-protocol';
import type { CryptoSessionIdentity } from '@comitium/crypto/session';
import { bootstrapCandidateCorpus, getCandidateCorpusChanges } from '@/lib/api/candidate-search';
import { getErrorStatus } from '@/lib/api/client';
import { getOrgVaultAccess } from '@/lib/api/orgs-vault';

export interface CandidateSearchReady {
  index: CandidateSearchHandle;
}

export interface CandidateSearchSyncStatus {
  phase: 'syncing' | 'ready';
  indexed: number;
  unreadable: number;
  ready: CandidateSearchReady | null;
  head: string;
  projectionWorkAvailable: boolean;
}

/**
 * App owns fresh authorization, HTTP pagination and scheduling. Worker atomically publishes each disk batch.
 */
export class CandidateSearchRuntime {
  readonly id = crypto.randomUUID();
  private readonly cache = new CandidateSearchCache();
  private namespace: CandidateSearchCacheNamespace | null = null;
  private index: CandidateSearchHandle | null = null;
  private through: string | undefined;
  private active = true;
  private running: Promise<CandidateSearchSyncStatus> | null = null;
  private projectionWorkAvailable = false;

  constructor(
    readonly orgId: string,
    readonly identity: CryptoSessionIdentity,
    private access: VaultKeyAccess,
  ) {}

  async sync(signal: AbortSignal): Promise<CandidateSearchSyncStatus> {
    const previous = this.running;
    const current = (async () => {
      if (previous) {
        await previous.catch(() => undefined);
      }

      this.assertActive(signal);

      return this.performSync(signal);
    })();

    this.running = current;

    try {
      return await current;
    } finally {
      if (this.running === current) {
        this.running = null;
      }
    }
  }

  async applyDocuments(
    index: CandidateSearchHandle,
    profiles: CandidateSearchProfileDocument[],
    observedHead: string,
    signal: AbortSignal,
  ): Promise<void> {
    await this.commit(index, { kind: 'hydrate', head: observedHead, profiles }, signal);
  }

  async evaluate(
    index: CandidateSearchHandle,
    filter: CandidateSearchFilter,
    references: CandidateSearchReference[],
    signal: AbortSignal,
  ) {
    this.assertActive(signal);

    try {
      const result = await CryptoProxy.evaluateCandidateSearchReferences(index, filter, references);

      this.assertActive(signal);

      return result;
    } catch (error) {
      if (this.active && !signal.aborted && invalidSearchCache(error)) {
        await this.invalidateCache();
      }

      throw error;
    }
  }

  dispose(): void {
    const clearing = this.clearIndex();

    this.active = false;
    this.namespace = null;

    void clearing.catch(() => undefined);
  }

  private async performSync(signal: AbortSignal): Promise<CandidateSearchSyncStatus> {
    try {
      return await this.syncPass(signal);
    } catch (error) {
      if (!this.active || signal.aborted) {
        throw error;
      }

      const invalidCache = invalidSearchCache(error);
      const status = getErrorStatus(error);

      if (invalidCache) {
        await this.invalidateCache();

        return this.emptyProgress();
      }

      if (error instanceof CandidateSearchCacheError && error.code === 'changed') {
        const current = this.namespace ? await this.cache.checkpoint(this.namespace).catch(() => null) : null;
        this.namespace = current;

        await this.clearIndex();

        if (current) {
          return this.emptyProgress();
        }

        throw error;
      }

      if (status === 409 || status === 410 || status === 403) {
        if (this.namespace) {
          await this.cache.invalidate(this.namespace).catch(() => undefined);
        }

        this.namespace = null;
        await this.clearIndex();

        if (status === 403) {
          throw error;
        }

        return this.emptyProgress();
      }

      await this.clearIndex();
      throw error;
    }
  }

  private async syncPass(signal: AbortSignal): Promise<CandidateSearchSyncStatus> {
    let namespace = await this.authorizeNamespace(signal);

    for (let batch = 0; batch < 4 && namespace.phase === 'bootstrap'; batch++) {
      const expectedCursor = namespace.bootstrapCursor;
      const page = await bootstrapCandidateCorpus(this.orgId, expectedCursor, signal);

      this.assertActive(signal);
      const { projectionWorkAvailable, ...change } = page;
      this.projectionWorkAvailable = projectionWorkAvailable;
      namespace = await this.commit(this.requireIndex(), { ...change, kind: 'bootstrap', expectedCursor }, signal);
    }

    if (namespace.phase === 'bootstrap') {
      return this.progress(signal);
    }

    for (let batch = 0; batch < 4; batch++) {
      const since = namespace.appliedCursor;
      const page = await getCandidateCorpusChanges(
        this.orgId,
        namespace.context.scopeToken,
        since,
        this.through,
        signal,
      );

      this.assertActive(signal);
      const { projectionWorkAvailable, ...change } = page;
      this.projectionWorkAvailable = projectionWorkAvailable;
      namespace = await this.commit(this.requireIndex(), { ...change, kind: 'changes', since }, signal);
      this.through = page.caughtUp ? undefined : page.throughCursor;

      if (page.caughtUp && page.nextCursor === page.head) {
        return {
          phase: 'ready',
          indexed: namespace.recordCount,
          unreadable: namespace.unreadableCount,
          ready: { index: this.requireIndex() },
          head: namespace.appliedCursor,
          projectionWorkAvailable: this.projectionWorkAvailable,
        };
      }
    }

    return this.progress(signal);
  }

  private async authorizeNamespace(signal: AbortSignal): Promise<CandidateSearchCacheNamespace> {
    this.assertActive(signal);
    let namespace = this.namespace;
    let first: Awaited<ReturnType<typeof bootstrapCandidateCorpus>> | null = null;

    if (!namespace) {
      const fence = await this.cache.captureFence();

      this.assertActive(signal);
      this.access = await getOrgVaultAccess(this.orgId);
      this.assertActive(signal);
      first = await bootstrapCandidateCorpus(this.orgId, null, signal);
      this.projectionWorkAvailable = first.projectionWorkAvailable;
      this.assertActive(signal);

      namespace = await this.cache.open(
        { ...this.identity, orgId: this.orgId, scopeToken: first.scopeToken, corpusVersion: 1 },
        fence,
      );

      this.assertActive(signal);
      this.namespace = namespace;
    }

    if (!this.index) {
      if (!namespace.wrappedKey) {
        const wrapped = await CryptoProxy.createCandidateSearchCacheKey(namespace, this.access);

        this.assertActive(signal);
        namespace = await this.cache.installKey(namespace, wrapped);
        this.assertActive(signal);
        this.namespace = namespace;
      }

      this.index = await CryptoProxy.beginCandidateSearch(
        { orgId: this.orgId, scopeToken: namespace.context.scopeToken },
        this.access,
        namespace,
      );
      this.assertActive(signal);
    }

    if (first && namespace.phase === 'bootstrap' && namespace.bootstrapCursor === null) {
      const { projectionWorkAvailable: _available, ...change } = first;

      namespace = await this.commit(
        this.requireIndex(),
        { ...change, kind: 'bootstrap', expectedCursor: null },
        signal,
      );
    }

    return namespace;
  }

  private async commit(
    index: CandidateSearchHandle,
    change: CandidateSearchCommit,
    signal: AbortSignal,
  ): Promise<CandidateSearchCacheNamespace> {
    this.assertActive(signal);
    const result = await CryptoProxy.commitCandidateSearch(index, change);

    this.assertActive(signal);
    this.index = result.index;
    this.namespace = result.namespace;

    return result.namespace;
  }

  private async invalidateCache(): Promise<void> {
    if (this.namespace) {
      await this.cache.invalidate(this.namespace);
    } else {
      await this.cache.reset();
    }

    this.namespace = null;
    await this.clearIndex();
  }

  private requireIndex(): CandidateSearchHandle {
    if (!this.index) {
      throw new CandidateSearchCacheError('changed');
    }

    return this.index;
  }

  private async progress(signal: AbortSignal): Promise<CandidateSearchSyncStatus> {
    const stats = await CryptoProxy.candidateSearchStatus();
    this.assertActive(signal);

    return {
      phase: 'syncing',
      indexed: stats.documents,
      unreadable: stats.unreadableDocuments,
      ready: null,
      head: this.namespace?.appliedCursor ?? '0',
      projectionWorkAvailable: this.projectionWorkAvailable,
    };
  }

  private emptyProgress(): CandidateSearchSyncStatus {
    return { phase: 'syncing', indexed: 0, unreadable: 0, ready: null, head: '0', projectionWorkAvailable: false };
  }

  private assertActive(signal: AbortSignal): void {
    signal.throwIfAborted();

    if (!this.active) {
      throw new DOMException('Search was cancelled', 'AbortError');
    }
  }

  private async clearIndex(): Promise<void> {
    this.index = null;
    this.through = undefined;

    if (this.active) {
      await CryptoProxy.clearCandidateSearch();
    }
  }
}

function invalidSearchCache(error: unknown): boolean {
  const invalidData = error instanceof CandidateSearchCacheError && error.code === 'invalid';
  const invalidKey = error instanceof CandidateSearchError && error.code === 'SEARCH_CACHE_INVALID';

  return invalidData || invalidKey;
}
