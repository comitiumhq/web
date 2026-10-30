import { keyMetadataFingerprint } from '../key-context';
import { isDefined } from '../runtime-guards';
import { candidateSearchIdsSchema } from '../schemas/candidate-search';
import {
  CANDIDATE_SEARCH_CACHE_LIMITS,
  type CandidateSearchCacheContext,
  type CandidateSearchCacheHandle,
  type CandidateSearchCacheNamespace,
  type CandidateSearchCommit,
  candidateSearchCacheContextSchema,
  optionalStoredPostingSchema,
  optionalStoredProfileSchema,
  type StoredPosting,
} from '../schemas/candidate-search-cache';
import { type WrappedKey, wrappedKeySchema } from '../schemas/keys';
import {
  type CandidateSearchDatabaseOpener,
  cacheRead,
  cacheTransaction,
  openCandidateSearchDatabase,
  resetCacheDatabase,
} from './database';
import {
  admitNamespace,
  CandidateSearchCacheError,
  catalogBytes,
  currentNamespace,
  namespaceKey,
  parse,
  removeNamespace,
} from './namespace';
import { advanceCandidateCheckpoint, assertCandidateCommit } from './profiles';
import { writeCandidateIndex } from './projections';
import type { PreparedCandidateIndex } from './types';

export type {
  CandidateSearchCacheContext,
  CandidateSearchCacheHandle,
  CandidateSearchCacheNamespace,
  CandidateSearchCommit,
} from '../schemas/candidate-search-cache';
export { CandidateSearchCacheError } from './namespace';

export interface CandidateSearchCacheOptions {
  database?: CandidateSearchDatabaseOpener;
  maxBytes?: number;
  maxNamespaces?: number;
}

/**
 * Owns the encrypted disk representation, namespace admission and atomic index/checkpoint CAS.
 */
export class CandidateSearchCache {
  private readonly database: CandidateSearchDatabaseOpener;
  private readonly maxBytes: number;
  private readonly maxNamespaces: number;

  constructor(options: CandidateSearchCacheOptions = {}) {
    this.database = options.database ?? openCandidateSearchDatabase;
    this.maxBytes = options.maxBytes ?? 1024 * 1024 * 1024;
    this.maxNamespaces = options.maxNamespaces ?? 8;

    const validBytes = Number.isSafeInteger(this.maxBytes) && this.maxBytes >= 1024;
    const validNamespaces = Number.isInteger(this.maxNamespaces) && this.maxNamespaces >= 1 && this.maxNamespaces <= 8;

    if (!validBytes || !validNamespaces) {
      throw new CandidateSearchCacheError('invalid');
    }
  }

  captureFence(): Promise<string> {
    return cacheTransaction(this.database, (_store, catalog) => catalog.fence);
  }

  async open(
    contextValue: CandidateSearchCacheContext,
    authorizationFence: string,
  ): Promise<CandidateSearchCacheNamespace> {
    const context = parse(candidateSearchCacheContextSchema, contextValue);
    const key = keyMetadataFingerprint(context);
    const budget = await this.writeBudget();

    return cacheTransaction(this.database, async (store, catalog) => {
      if (catalog.fence !== authorizationFence) {
        throw new CandidateSearchCacheError('changed');
      }

      for (const old of [...catalog.namespaces]) {
        const sameOwner = old.context.userId === context.userId && old.context.orgId === context.orgId;

        if (sameOwner && old.key !== key) {
          await removeNamespace(store, catalog, old);
        }
      }

      let namespace = catalog.namespaces.find((entry) => entry.key === key);

      if (!namespace) {
        namespace = {
          key,
          generation: crypto.randomUUID(),
          context,
          wrappedKey: null,
          phase: 'bootstrap',
          bootstrapCursor: null,
          bootstrapHead: null,
          appliedCursor: '0',
          recordCount: 0,
          unreadableCount: 0,
          accountedBytes: 0,
          indexRevision: 0,
          nextDocumentId: 1,
          lastUsedAt: Date.now(),
        };
        catalog.namespaces.push(namespace);
      }

      namespace.lastUsedAt = Date.now();

      await admitNamespace(store, catalog, namespace, budget, this.maxNamespaces);

      return namespace;
    });
  }

  checkpoint(handle: CandidateSearchCacheHandle): Promise<CandidateSearchCacheNamespace> {
    return cacheRead(this.database, (_store, catalog) => currentNamespace(catalog, handle));
  }

  async installKey(handle: CandidateSearchCacheHandle, value: WrappedKey): Promise<CandidateSearchCacheNamespace> {
    const wrappedKey = parse(wrappedKeySchema, value);
    const budget = await this.writeBudget();

    return cacheTransaction(this.database, async (store, catalog) => {
      const namespace = currentNamespace(catalog, handle);
      namespace.wrappedKey ??= wrappedKey;

      await admitNamespace(store, catalog, namespace, budget, this.maxNamespaces);

      return namespace;
    });
  }

  /**
   * Reads a coherent source-identity snapshot without any plaintext, crypto or network await.
   */
  readDocuments(handle: CandidateSearchCacheHandle, candidateIds: string[]) {
    const ids = parse(candidateSearchIdsSchema, candidateIds);

    return cacheRead(this.database, async (store, catalog) => {
      const namespace = currentNamespace(catalog, handle);
      const raw = await Promise.all(ids.map((id) => store.get([namespaceKey(namespace.key), id])));
      const records = raw.map((value, index) => {
        const record = parse(optionalStoredProfileSchema, value) ?? null;

        if (record && record.candidateId !== ids[index]) {
          throw new CandidateSearchCacheError('invalid');
        }

        return record;
      });

      return { namespace, records };
    });
  }

  readPostings(handle: CandidateSearchCacheHandle, addresses: ArrayBuffer[]) {
    const invalidAddresses =
      addresses.length > CANDIDATE_SEARCH_CACHE_LIMITS.maxPostingReadBatch ||
      addresses.some((address) => address.byteLength !== 32);

    if (invalidAddresses) {
      throw new CandidateSearchCacheError('invalid');
    }

    return cacheRead(this.database, async (store, catalog) => {
      const namespace = currentNamespace(catalog, handle);
      const raw = await Promise.all(addresses.map((address) => store.get([namespaceKey(namespace.key), address])));

      return { namespace, records: raw.map((value) => parse(optionalStoredPostingSchema, value) ?? null) };
    });
  }

  /**
   * All source identities and postings for one evaluation come from one native read snapshot.
   */
  readQuery(handle: CandidateSearchCacheHandle, candidateIds: string[], addresses: ArrayBuffer[]) {
    const ids = parse(candidateSearchIdsSchema, candidateIds);

    const invalidAddresses =
      addresses.length > CANDIDATE_SEARCH_CACHE_LIMITS.maxQueryAddresses ||
      addresses.some((address) => address.byteLength !== 32);

    if (invalidAddresses) {
      throw new CandidateSearchCacheError('invalid');
    }

    return cacheRead(this.database, async (store, catalog) => {
      const namespace = currentNamespace(catalog, handle);
      const documents = await Promise.all(ids.map((id) => store.get([namespaceKey(namespace.key), id])));
      const postings: Array<StoredPosting | null> = [];
      let plaintextBytes = 0;
      const batchSize = CANDIDATE_SEARCH_CACHE_LIMITS.maxPostingReadBatch;

      for (let offset = 0; offset < addresses.length; offset += batchSize) {
        const batch = addresses.slice(offset, offset + batchSize);
        const raw = await Promise.all(batch.map((address) => store.get([namespaceKey(namespace.key), address])));

        for (const value of raw) {
          const posting = parse(optionalStoredPostingSchema, value) ?? null;
          const oversized =
            posting &&
            (posting.data.plaintextBytes > CANDIDATE_SEARCH_CACHE_LIMITS.maxBucketBytes ||
              posting.data.ct.byteLength > CANDIDATE_SEARCH_CACHE_LIMITS.maxBucketBytes + 16);
          plaintextBytes += posting?.data.plaintextBytes ?? 0;

          if (oversized || plaintextBytes > CANDIDATE_SEARCH_CACHE_LIMITS.maxQueryBytes) {
            throw new CandidateSearchCacheError('invalid');
          }

          postings.push(posting);
        }
      }

      return {
        namespace,
        documents: documents.map((value) => parse(optionalStoredProfileSchema, value) ?? null),
        postings,
      };
    });
  }

  /**
   * CAS fences competing tabs. Every prepared ciphertext and the feed position publish together.
   */
  async commit(
    handle: CandidateSearchCacheHandle,
    change: CandidateSearchCommit,
    prepared: PreparedCandidateIndex,
    signal?: AbortSignal,
  ): Promise<CandidateSearchCacheNamespace> {
    const budget = await this.writeBudget();

    return cacheTransaction(
      this.database,
      async (store, catalog) => {
        const namespace = currentNamespace(catalog, handle);

        if (namespace.indexRevision !== prepared.expectedRevision || !namespace.wrappedKey) {
          throw new CandidateSearchCacheError('changed');
        }

        assertCandidateCommit(namespace, change);
        await writeCandidateIndex(store, namespace, prepared);
        namespace.nextDocumentId = prepared.nextDocumentId;
        namespace.indexRevision += 1;
        advanceCandidateCheckpoint(namespace, change);
        namespace.lastUsedAt = Date.now();
        await admitNamespace(store, catalog, namespace, budget, this.maxNamespaces);
        return namespace;
      },
      signal,
    );
  }

  invalidate(handle: CandidateSearchCacheHandle): Promise<void> {
    return cacheTransaction(this.database, async (store, catalog) =>
      removeNamespace(store, catalog, currentNamespace(catalog, handle)),
    );
  }

  purgeAccount(userId: string): Promise<void> {
    return cacheTransaction(this.database, async (store, catalog) => {
      for (const namespace of [...catalog.namespaces]) {
        if (namespace.context.userId === userId) {
          await removeNamespace(store, catalog, namespace);
        }
      }

      catalog.fence = crypto.randomUUID();
    });
  }

  statistics(): Promise<{ accountedBytes: number; namespaces: number }> {
    return cacheRead(this.database, (_store, catalog) => ({
      accountedBytes: catalogBytes(catalog),
      namespaces: catalog.namespaces.length,
    }));
  }

  reset(): Promise<void> {
    return resetCacheDatabase(this.database);
  }

  private async writeBudget(): Promise<number> {
    const own = await this.statistics();

    if (!globalThis.navigator?.storage?.estimate) {
      return this.maxBytes;
    }

    try {
      const { usage, quota } = await navigator.storage.estimate();

      if (!isDefined(usage) || !isDefined(quota)) {
        return this.maxBytes;
      }

      const reserve = Math.min(64 * 1024 * 1024, quota * 0.2);

      return Math.min(this.maxBytes, own.accountedBytes + Math.max(0, quota - usage - reserve));
    } catch {
      return this.maxBytes;
    }
  }
}
