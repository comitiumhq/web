import { Index } from 'flexsearch';
import { isRecord } from '../runtime-guards';
import {
  CANDIDATE_SEARCH_CACHE_LIMITS,
  type CandidateSearchLibraryCommit,
  candidateSearchLibraryCommitSchema,
} from '../schemas/candidate-search-cache';

export function createCandidateIndex<Persistent extends boolean = false>(): Index<false, Persistent> {
  return new Index<false, Persistent>({
    tokenize: 'forward',
    encode: JSON.parse,
    resolution: 1,
    context: false,
    cache: false,
    commit: false,
  });
}

/**
 * Validate the buffer supplied to the official StorageInterface.commit boundary.
 */
export function readCandidateIndexCommit(index: unknown): CandidateSearchLibraryCommit {
  const invalid =
    !isRecord(index) ||
    !(index.map instanceof Map) ||
    index.map.size > CANDIDATE_SEARCH_CACHE_LIMITS.maxBatchTermPostings;

  if (invalid) {
    throw new Error('Unsupported Candidate index buffer');
  }

  const result = candidateSearchLibraryCommitSchema.safeParse(index);

  if (!result.success) {
    throw new Error('Unsupported Candidate index buffer');
  }

  return result.data;
}

/**
 * Release only this operation's buffers; never call persistent clear for session cleanup.
 */
export function clearCandidateIndexBuffer(index: unknown): void {
  if (!isRecord(index)) {
    return;
  }

  const { map, reg, ctx } = index;

  if (map instanceof Map) {
    map.clear();
  }

  if (reg instanceof Set) {
    reg.clear();
  }

  if (ctx instanceof Map) {
    ctx.clear();
  }

  index.commit_task = [];
}
