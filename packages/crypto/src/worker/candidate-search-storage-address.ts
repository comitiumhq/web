import { CANDIDATE_SEARCH_POSTING_BUCKET_SIZE } from '../schemas/candidate-search-cache';
import type { CandidateSearchCacheCipher } from './candidate-search-cache-cipher';

/**
 * Stable numeric ranges bound each encrypted posting independently of corpus growth.
 */
export function candidatePostingBucket(id: number): number {
  return Math.floor((id - 1) / CANDIDATE_SEARCH_POSTING_BUCKET_SIZE);
}

export function candidatePostingAddress(
  cipher: CandidateSearchCacheCipher,
  term: string,
  bucket: number,
): Promise<ArrayBuffer> {
  return cipher.address(JSON.stringify(['term', term, bucket]));
}

export function candidateRegistryAddress(cipher: CandidateSearchCacheCipher, id: number): Promise<ArrayBuffer> {
  return cipher.address(JSON.stringify(['registry', id]));
}
