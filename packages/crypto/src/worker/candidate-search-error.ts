import type { CandidateSearchErrorCode } from '../schemas/search';

export class CandidateSearchError extends Error {
  readonly name = 'CandidateSearchError';

  constructor(readonly code: CandidateSearchErrorCode) {
    super(code);
  }
}
