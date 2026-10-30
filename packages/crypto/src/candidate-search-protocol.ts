import { isRecord, isString } from './runtime-guards';
import { type CandidateSearchEncryptedDocument, candidateSearchEncryptedBatchSchema } from './schemas/candidate-search';
import { CandidateSearchError } from './worker/candidate-search-error';

export { CandidateSearchError };

export {
  CANDIDATE_SEARCH_SOURCE_BATCH_SIZE,
  type CandidateSearchDisplay,
  type CandidateSearchEncryptedDocument,
  type CandidateSearchFilter,
  type CandidateSearchHandle,
  type CandidateSearchProfileDocument,
  type CandidateSearchReference,
  type CandidateSearchScope,
  candidateCorpusBootstrapResponseSchema,
  candidateCorpusChangeSchema,
  candidateCorpusChangesResponseSchema,
  candidateCorpusHydrateResponseSchema,
  candidateSearchEncryptedDocumentSchema,
  candidateSearchFilterSchema,
  candidateSearchHandleSchema,
  candidateSearchPositionSchema,
  candidateSearchProfileDocumentSchema,
  candidateSearchReferenceSchema,
  candidateSearchScopeSchema,
} from './schemas/candidate-search';

/**
 * Reject oversized inputs before cloning or running envelope validation.
 */
export function readCandidateSearchDocuments(value: unknown): CandidateSearchEncryptedDocument[] {
  if (!Array.isArray(value) || value.length > 200) {
    throw new CandidateSearchError('INVALID_SEARCH');
  }

  let batchBytes = 0;

  for (const source of value) {
    const envelope = source?.profile;

    if (!isRecord(envelope)) {
      continue;
    }

    let recordBytes = 256;

    for (const key of ['ct', 'iv', 'zip', 'purpose']) {
      if (isString(envelope[key])) {
        recordBytes += envelope[key].length;
      }
    }

    if (Array.isArray(envelope.keys)) {
      if (envelope.keys.length > 8) {
        throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
      }

      for (const key of envelope.keys) {
        for (const field of ['ek', 'epk', 'kemCt', 'iv', 'recipient']) {
          if (isString(key?.[field])) {
            recordBytes += key[field].length;
          }
        }

        if (recordBytes > 64 * 1024) {
          throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
        }
      }
    }

    batchBytes += recordBytes;

    if (recordBytes > 64 * 1024 || batchBytes > 1024 * 1024) {
      throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
    }
  }

  const parsed = candidateSearchEncryptedBatchSchema.safeParse(value);

  if (!parsed.success) {
    throw new CandidateSearchError('INVALID_SEARCH');
  }

  return parsed.data;
}
