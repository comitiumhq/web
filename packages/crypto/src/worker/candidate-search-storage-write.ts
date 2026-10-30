import { type CandidateSearchCache, CandidateSearchCacheError } from '../candidate-search-cache';
import {
  type CandidateIndexPostingWrite,
  candidateSearchDataBytes,
  type PreparedCandidateIndex,
} from '../candidate-search-cache/types';
import {
  CANDIDATE_SEARCH_CACHE_LIMITS,
  type CandidateSearchCacheNamespace,
  type CandidateSearchLibraryCommit,
  type CandidateSearchRegistry,
  type StoredPosting,
} from '../schemas/candidate-search-cache';
import type { CandidateSearchCacheCipher } from './candidate-search-cache-cipher';
import type { CandidateIndexOperation } from './candidate-search-documents';
import {
  candidatePostingAddress,
  candidatePostingBucket,
  candidateRegistryAddress,
} from './candidate-search-storage-address';

export interface CandidateStorageWriteContext {
  cache: CandidateSearchCache;
  cipher: CandidateSearchCacheCipher;
  namespace: CandidateSearchCacheNamespace;
  prepared: PreparedCandidateIndex;
  operations: CandidateIndexOperation[];
  buffer: CandidateSearchLibraryCommit;
  assertCurrent: () => void;
}

interface PostingPatch {
  term: string;
  bucket: number;
  additions: Set<number>;
  removals: Set<number>;
}

interface StorageWriteState {
  context: CandidateStorageWriteContext;
  patches: Map<string, PostingPatch>;
  bytes: number;
  registryBytes: number;
}

/**
 * Persist the library's commit buffer; token generation and query intersection stay in FlexSearch.
 */
export async function prepareCandidateStorageWrites(context: CandidateStorageWriteContext): Promise<void> {
  context.prepared.postings = [];

  const state: StorageWriteState = {
    context,
    patches: new Map(),
    bytes: context.prepared.documents.reduce((sum, write) => sum + (write.record?.accountedBytes ?? 0), 0),
    registryBytes: 0,
  };

  const registries = new Map<number, CandidateSearchRegistry>();

  for (const write of context.prepared.documents) {
    if (write.record) {
      registries.set(write.record.localId, { id: write.record.localId, terms: [] });
    }
  }

  for (const [term, posting] of context.buffer.map) {
    for (const id of posting[0] ?? []) {
      const registry = registries.get(id);

      if (!registry) {
        throw new CandidateSearchCacheError('invalid');
      }

      registry.terms.push(term);
      patchFor(state, term, id).additions.add(id);
    }
  }

  await prepareRegistries(state, registries);
  await preparePostingBuckets(state);
}

/**
 * Reverse entries make updates proportional to one candidate's terms, without an index scan.
 */
async function prepareRegistries(
  state: StorageWriteState,
  registries: Map<number, CandidateSearchRegistry>,
): Promise<void> {
  const { context } = state;
  const removals = new Set(context.buffer.commit_task.flatMap((task) => (task.del ? [task.del] : [])));
  const batchSize = CANDIDATE_SEARCH_CACHE_LIMITS.maxPostingReadBatch;

  for (let offset = 0; offset < context.operations.length; offset += batchSize) {
    const batch = context.operations.slice(offset, offset + batchSize);
    const addresses = await Promise.all(batch.map(({ id }) => candidateRegistryAddress(context.cipher, id)));
    const records = await readStored(state, addresses);

    for (let index = 0; index < batch.length; index++) {
      const operation = batch[index];
      const address = addresses[index];
      const previous = records[index];
      const expectedRegistry = operation.kind !== 'append';
      const invalid = expectedRegistry !== Boolean(previous) || (expectedRegistry && !removals.has(operation.id));

      if (invalid) {
        throw new CandidateSearchCacheError('invalid');
      }

      if (previous) {
        state.registryBytes += previous.data.plaintextBytes;

        if (state.registryBytes > CANDIDATE_SEARCH_CACHE_LIMITS.maxBatchExpandedBytes) {
          throw new CandidateSearchCacheError('capacity');
        }

        const registry = await context.cipher.decryptRegistry(address, previous.data);
        context.assertCurrent();

        if (registry.id !== operation.id) {
          throw new CandidateSearchCacheError('invalid');
        }

        for (const term of registry.terms) {
          patchFor(state, term, operation.id).removals.add(operation.id);
        }
      }

      const registry = registries.get(operation.id);
      const data = registry ? await context.cipher.encryptRegistry(address, registry) : null;
      context.assertCurrent();

      appendWrite(
        state,
        address,
        data ? { data, accountedBytes: 320 + candidateSearchDataBytes(data) } : null,
        previous,
      );
    }
  }
}

/**
 * Read, merge and re-encrypt only affected numeric ranges from the library commit.
 */
async function preparePostingBuckets(state: StorageWriteState): Promise<void> {
  const { context } = state;
  const batchSize = CANDIDATE_SEARCH_CACHE_LIMITS.maxPostingReadBatch;
  const patches = [...state.patches.values()];

  for (let offset = 0; offset < patches.length; offset += batchSize) {
    const batch = patches.slice(offset, offset + batchSize);
    const addresses = await Promise.all(
      batch.map(({ term, bucket }) => candidatePostingAddress(context.cipher, term, bucket)),
    );

    const records = await readStored(state, addresses);

    for (let index = 0; index < batch.length; index++) {
      const patch = batch[index];
      const address = addresses[index];
      const previous = records[index];
      const posting = previous ? await context.cipher.decryptPosting(address, previous.data) : [];

      context.assertCurrent();
      const old = posting[0] ?? [];

      if (old.some((id) => candidatePostingBucket(id) !== patch.bucket)) {
        throw new CandidateSearchCacheError('invalid');
      }

      const ids = new Set(old.filter((id) => !patch.removals.has(id)));

      for (const id of patch.additions) {
        ids.add(id);
      }

      const data = ids.size ? await context.cipher.encryptPosting(address, [[...ids]]) : null;
      context.assertCurrent();

      appendWrite(
        state,
        address,
        data ? { data, accountedBytes: 320 + candidateSearchDataBytes(data) } : null,
        previous,
      );
    }
  }
}

function patchFor(state: StorageWriteState, term: string, id: number): PostingPatch {
  const bucket = candidatePostingBucket(id);
  const key = JSON.stringify([term, bucket]);
  let patch = state.patches.get(key);

  if (!patch) {
    if (state.patches.size >= CANDIDATE_SEARCH_CACHE_LIMITS.maxBatchTermPostings) {
      throw new CandidateSearchCacheError('capacity');
    }

    patch = { term, bucket, additions: new Set(), removals: new Set() };
    state.patches.set(key, patch);
  }

  return patch;
}

async function readStored(state: StorageWriteState, addresses: ArrayBuffer[]): Promise<Array<StoredPosting | null>> {
  const { context } = state;
  context.assertCurrent();

  const snapshot = await context.cache.readPostings(context.namespace, addresses);
  context.assertCurrent();

  if (snapshot.namespace.indexRevision !== context.prepared.expectedRevision) {
    throw new CandidateSearchCacheError('changed');
  }

  return snapshot.records;
}

function appendWrite(
  state: StorageWriteState,
  address: ArrayBuffer,
  record: StoredPosting | null,
  previous: StoredPosting | null,
): void {
  state.bytes += record?.accountedBytes ?? 0;

  if (state.bytes > CANDIDATE_SEARCH_CACHE_LIMITS.maxCommitBytes) {
    throw new CandidateSearchCacheError('capacity');
  }

  const write: CandidateIndexPostingWrite = { address, record, previousBytes: previous?.accountedBytes ?? 0 };

  state.context.prepared.postings.push(write);
}
