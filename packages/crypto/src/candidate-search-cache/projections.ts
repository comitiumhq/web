import {
  CANDIDATE_SEARCH_CACHE_LIMITS,
  type CandidateSearchCacheNamespace,
  storedPostingSchema,
  storedProfileSchema,
} from '../schemas/candidate-search-cache';
import type { CandidateSearchStore } from './database';
import { CandidateSearchCacheError, namespaceKey, parse } from './namespace';
import type { PreparedCandidateIndex } from './types';

/**
 * Publish a prepared encrypted projection. The caller already holds the namespace revision CAS.
 * Queue native requests together; no per-term read round trips or crypto awaits inside the transaction.
 */
export async function writeCandidateIndex(
  store: CandidateSearchStore,
  namespace: CandidateSearchCacheNamespace,
  prepared: PreparedCandidateIndex,
): Promise<void> {
  const documents = prepared.documents.map((write) => ({
    ...write,
    record: write.record ? parse(storedProfileSchema, write.record) : null,
  }));

  const postings = prepared.postings.map((write) => ({
    ...write,
    record: write.record ? parse(storedPostingSchema, write.record) : null,
  }));

  const bytes = [...documents, ...postings].reduce((sum, write) => sum + (write.record?.accountedBytes ?? 0), 0);

  if (bytes > CANDIDATE_SEARCH_CACHE_LIMITS.maxCommitBytes) {
    throw new CandidateSearchCacheError('capacity');
  }

  const writes: Promise<unknown>[] = [];

  for (const write of documents) {
    const key: [ArrayBuffer, string] = [namespaceKey(namespace.key), write.candidateId];
    const record = write.record;

    namespace.accountedBytes += (record?.accountedBytes ?? 0) - write.previousBytes;
    namespace.recordCount += Number(Boolean(record)) - Number(write.existed);
    namespace.unreadableCount += Number(record?.unreadable ?? false) - Number(write.previouslyUnreadable);

    writes.push(record ? store.put(record, key) : store.delete(key));
  }

  for (const write of postings) {
    const key: [ArrayBuffer, ArrayBuffer] = [namespaceKey(namespace.key), write.address];
    const record = write.record;

    namespace.accountedBytes += (record?.accountedBytes ?? 0) - write.previousBytes;

    writes.push(record ? store.put(record, key) : store.delete(key));
  }

  await Promise.all(writes);
}
