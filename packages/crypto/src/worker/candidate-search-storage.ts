import { Index, type StorageInterface } from 'flexsearch';
import { type CandidateSearchCache, CandidateSearchCacheError } from '../candidate-search-cache';
import type {
  CandidateSearchCacheNamespace,
  CandidateSearchCommit,
  CandidateSearchPosting,
  StoredPosting,
} from '../schemas/candidate-search-cache';
import type { CandidateSearchCacheCipher } from './candidate-search-cache-cipher';
import type { CandidatePreparedDocuments } from './candidate-search-documents';
import { clearCandidateIndexBuffer, createCandidateIndex, readCandidateIndexCommit } from './candidate-search-index';
import { candidatePostingBucket, candidateRegistryAddress } from './candidate-search-storage-address';
import { prepareCandidateStorageWrites } from './candidate-search-storage-write';

interface CandidateStoragePublication extends CandidatePreparedDocuments {
  change: CandidateSearchCommit;
}

export interface CandidateStorageQueryPosting {
  address: ArrayBuffer;
  bucket: number;
  record: StoredPosting | null;
}

export interface CandidateStorageQuery {
  terms: Map<string, CandidateStorageQueryPosting[]>;
  ids: Set<number>;
}

export interface CandidateStorageContext {
  cache: CandidateSearchCache;
  cipher: CandidateSearchCacheCipher;
  namespace: CandidateSearchCacheNamespace;
  signal: AbortSignal;
  assertCurrent: () => void;
  publication?: CandidateStoragePublication;
  query?: CandidateStorageQuery;
}

/**
 * Full storage boundary for our fixed FlexSearch Index configuration. Each instance
 * owns one immutable native snapshot or one atomic source/index/checkpoint publication.
 */
export class CandidateSearchStorage implements StorageInterface {
  readonly db: CandidateSearchCache;
  private closed = false;
  private namespace: CandidateSearchCacheNamespace;

  constructor(private readonly context: CandidateStorageContext) {
    this.db = context.cache;
    this.namespace = context.namespace;
  }

  async mount(index: Parameters<StorageInterface['mount']>[0]): Promise<void> {
    if (!(index instanceof Index)) {
      throw new CandidateSearchCacheError('invalid');
    }

    Object.assign(index, { db: this });
    await this.open();
  }

  async open(): Promise<void> {
    this.assertOpen();
    const namespace = await this.db.checkpoint(this.namespace);

    const staleWrite = Boolean(this.context.publication) && namespace.indexRevision !== this.namespace.indexRevision;

    if (staleWrite) {
      throw new CandidateSearchCacheError('changed');
    }
  }

  checkpoint(): CandidateSearchCacheNamespace {
    return this.namespace;
  }

  async get(
    term: string,
    context = '',
    limit = 0,
    offset = 0,
    resolve = true,
    enrich = false,
  ): Promise<number[] | CandidateSearchPosting> {
    this.assertOpen();

    const query = this.context.query;

    if (!query || context || enrich) {
      throw new CandidateSearchCacheError('invalid');
    }

    const ids: number[] = [];

    for (const { address, bucket, record } of query.terms.get(term) ?? []) {
      const posting = record ? await this.context.cipher.decryptPosting(address, record.data) : [];
      this.assertOpen();

      const values = posting[0] ?? [];

      if (values.some((id) => candidatePostingBucket(id) !== bucket)) {
        throw new CandidateSearchCacheError('invalid');
      }

      for (const id of values) {
        if (query.ids.has(id)) {
          ids.push(id);
        }
      }
    }

    if (!resolve) {
      return ids.length ? [ids] : [];
    }

    return limit ? ids.slice(offset, offset + limit) : ids.slice(offset);
  }

  async has(id: number): Promise<boolean> {
    this.assertOpen();

    const address = await candidateRegistryAddress(this.context.cipher, id);
    const snapshot = await this.db.readPostings(this.namespace, [address]);
    this.assertOpen();

    if (snapshot.namespace.indexRevision !== this.namespace.indexRevision) {
      throw new CandidateSearchCacheError('changed');
    }

    const record = snapshot.records[0];
    const registry = record ? await this.context.cipher.decryptRegistry(address, record.data) : null;

    this.assertOpen();

    return registry?.id === id;
  }

  async remove(ids: number | number[]): Promise<void> {
    const index = createCandidateIndex<true>();

    try {
      await index.mount(this);

      for (const id of Array.isArray(ids) ? ids : [ids]) {
        index.remove(id);
      }

      await index.commit();
    } finally {
      clearCandidateIndexBuffer(index);
    }
  }

  async commit(index: Index): Promise<void> {
    this.assertOpen();

    const publication = this.context.publication;

    if (!publication) {
      throw new CandidateSearchCacheError('invalid');
    }

    const buffer = readCandidateIndexCommit(index);

    await prepareCandidateStorageWrites({ ...this.context, ...publication, buffer, namespace: this.namespace });

    this.assertOpen();

    this.namespace = await this.db.commit(
      this.namespace,
      publication.change,
      publication.prepared,
      this.context.signal,
    );
    this.assertOpen();

    clearCandidateIndexBuffer(index);
  }

  async clear(): Promise<void> {
    this.assertOpen();

    await this.db.invalidate(this.namespace);
    await this.close();
  }

  async destroy(): Promise<void> {
    await this.clear();
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  private assertOpen(): void {
    this.context.signal.throwIfAborted();
    this.context.assertCurrent();

    if (this.closed) {
      throw new CandidateSearchCacheError('changed');
    }
  }
}
