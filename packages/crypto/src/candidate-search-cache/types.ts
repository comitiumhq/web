import type { CandidateSearchData, StoredPosting, StoredProfile } from '../schemas/candidate-search-cache';

export interface CandidateIndexDocumentWrite {
  candidateId: string;
  record: StoredProfile | null;
  previousBytes: number;
  existed: boolean;
  previouslyUnreadable: boolean;
}

export interface CandidateIndexPostingWrite {
  address: ArrayBuffer;
  record: StoredPosting | null;
  previousBytes: number;
}

export interface PreparedCandidateIndex {
  expectedRevision: number;
  nextDocumentId: number;
  documents: CandidateIndexDocumentWrite[];
  postings: CandidateIndexPostingWrite[];
}

export function candidateSearchDataBytes(data: CandidateSearchData): number {
  return data.ct.byteLength + 2 * data.iv.length;
}
