import { type CandidateSearchCache, CandidateSearchCacheError } from '../candidate-search-cache';
import type {
  CandidateSearchDisplay,
  CandidateSearchFilter,
  CandidateSearchReference,
} from '../candidate-search-protocol';
import {
  CANDIDATE_SEARCH_CACHE_LIMITS,
  type CandidateSearchCacheBinding,
  type CandidateSearchCacheNamespace,
  type CandidateSearchFields,
  type StoredProfile,
} from '../schemas/candidate-search-cache';
import type { CandidateSearchCacheCipher } from './candidate-search-cache-cipher';
import { CandidateSearchError } from './candidate-search-error';
import { clearCandidateIndexBuffer, createCandidateIndex } from './candidate-search-index';
import {
  CandidateSearchStorage,
  type CandidateStorageQuery,
  type CandidateStorageQueryPosting,
} from './candidate-search-storage';
import { candidatePostingAddress, candidatePostingBucket } from './candidate-search-storage-address';
import { matchesCandidateExact } from './candidate-search-terms';

export type CandidateSearchEvaluation =
  | { candidateId: string; outcome: 'match'; displayProfile: CandidateSearchDisplay | null }
  | { candidateId: string; outcome: 'no_match' | 'hydrate' | 'unreadable' };

export interface CandidateQueryContext {
  cache: CandidateSearchCache;
  cipher: CandidateSearchCacheCipher;
  binding: CandidateSearchCacheBinding;
  signal: AbortSignal;
  assertCurrent: () => void;
}

interface CandidateQueryAddress {
  term: string;
  bucket: number;
  address: ArrayBuffer;
}

interface CandidateQuerySnapshot {
  namespace: CandidateSearchCacheNamespace;
  documents: Array<StoredProfile | null>;
  discoveredLocalIds: Array<number | null> | null;
  query: CandidateStorageQuery;
}

/**
 * Evaluate one bounded reference chunk from a coherent encrypted source/index snapshot.
 */
export async function evaluateCandidateQuery(
  context: CandidateQueryContext,
  filter: CandidateSearchFilter,
  terms: string[],
  references: CandidateSearchReference[],
): Promise<CandidateSearchEvaluation[]> {
  const snapshot = await readCandidateQuery(
    context,
    terms,
    references.map((reference) => reference.candidateId),
  );

  const matches = await searchCandidateQuery(context, snapshot, terms, references.length);
  const evaluations: CandidateSearchEvaluation[] = [];

  for (let position = 0; position < references.length; position++) {
    const reference = references[position];
    const record = snapshot.documents[position];
    const discoveredIdChanged =
      snapshot.discoveredLocalIds !== null && snapshot.discoveredLocalIds[position] !== (record?.localId ?? null);

    if (!record || !sameSource(record, reference) || discoveredIdChanged) {
      evaluations.push({ candidateId: reference.candidateId, outcome: 'hydrate' });

      continue;
    }

    const payload = await context.cipher.decryptProfile(record);
    context.assertCurrent();

    if (payload.unreadable) {
      evaluations.push({ candidateId: reference.candidateId, outcome: 'unreadable' });

      continue;
    }

    const matchesText = !matches || matches.has(record.localId);
    const matchesExact = matchesCandidateExact(payload.fields, filter);

    if (matchesText && matchesExact) {
      evaluations.push({
        candidateId: reference.candidateId,
        outcome: 'match',
        displayProfile: displayCandidateProfile(payload.fields),
      });
    } else {
      evaluations.push({ candidateId: reference.candidateId, outcome: 'no_match' });
    }
  }

  return evaluations;
}

/**
 * Bucket discovery is advisory: source identities are reread with postings before matching.
 */
async function readCandidateQuery(
  context: CandidateQueryContext,
  terms: string[],
  ids: string[],
): Promise<CandidateQuerySnapshot> {
  const initial = terms.length ? await context.cache.readDocuments(context.binding, ids) : null;
  context.assertCurrent();
  const buckets = [
    ...new Set(initial?.records.flatMap((record) => (record ? [candidatePostingBucket(record.localId)] : [])) ?? []),
  ];

  const addresses: CandidateQueryAddress[] = [];

  for (const term of terms) {
    for (const bucket of buckets) {
      addresses.push({ term, bucket, address: await candidatePostingAddress(context.cipher, term, bucket) });
    }
  }

  context.assertCurrent();
  const snapshot = await context.cache.readQuery(
    context.binding,
    ids,
    addresses.map((value) => value.address),
  );
  context.assertCurrent();

  if (snapshot.namespace.phase !== 'complete') {
    throw new CandidateSearchCacheError('changed');
  }

  const plaintextBytes = snapshot.postings.reduce((sum, record) => sum + (record?.data.plaintextBytes ?? 0), 0);

  if (plaintextBytes > CANDIDATE_SEARCH_CACHE_LIMITS.maxQueryBytes) {
    throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
  }

  const query: CandidateStorageQuery = {
    terms: new Map(),
    ids: new Set(snapshot.documents.flatMap((record) => (record ? [record.localId] : []))),
  };

  for (let position = 0; position < addresses.length; position++) {
    const { term, bucket, address } = addresses[position];
    const values = query.terms.get(term) ?? [];
    const posting: CandidateStorageQueryPosting = { address, bucket, record: snapshot.postings[position] };
    values.push(posting);
    query.terms.set(term, values);
  }

  return {
    ...snapshot,
    query,
    discoveredLocalIds: initial?.records.map((record) => record?.localId ?? null) ?? null,
  };
}

async function searchCandidateQuery(
  context: CandidateQueryContext,
  snapshot: CandidateQuerySnapshot,
  terms: string[],
  limit: number,
): Promise<Set<number> | null> {
  const index = createCandidateIndex<true>();
  const storage = new CandidateSearchStorage({ ...context, namespace: snapshot.namespace, query: snapshot.query });

  try {
    if (!terms.length) {
      return null;
    }

    await index.mount(storage);

    const result = await index.search(JSON.stringify(terms), { limit, suggest: false });
    context.assertCurrent();

    return new Set(result.map(Number));
  } finally {
    clearCandidateIndexBuffer(index);

    await storage.close();
  }
}

function sameSource(record: StoredProfile, reference: CandidateSearchReference): boolean {
  return (
    record.candidateId === reference.candidateId &&
    record.profileRevision === reference.profileRevision &&
    record.profileFingerprint === reference.profileFingerprint
  );
}

function displayCandidateProfile(fields: CandidateSearchFields | null): CandidateSearchDisplay | null {
  if (!fields) {
    return null;
  }

  const { email: _email, ...display } = fields;

  return display;
}
