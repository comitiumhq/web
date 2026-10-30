import { transferHandlers } from 'comlink';
import { CandidateSearchCacheError } from '../candidate-search-cache';
import { isRecord } from '../runtime-guards';
import { serializedCandidateSearchCacheErrorSchema } from '../schemas/candidate-search-cache';
import { serializedCandidateSearchErrorSchema } from '../schemas/search';
import { serializedUnlockApiErrorSchema } from '../schemas/unlock-api';
import { CandidateSearchError } from './candidate-search-error';
import { UnlockApiError } from './unlock-api-error';

const fallback = transferHandlers.get('throw');

if (!fallback) {
  throw new Error('Comlink exception handler is unavailable');
}

/**
 * Preserve only allowlisted API error metadata across the Worker boundary.
 */
transferHandlers.set('throw', {
  canHandle: fallback.canHandle,
  serialize(thrown) {
    const error = isRecord(thrown) && 'value' in thrown ? thrown.value : undefined;

    if (error instanceof UnlockApiError) {
      return [{ kind: 'comitium.unlock-api-error', status: error.status, code: error.code }, []];
    }

    if (error instanceof CandidateSearchError) {
      return [{ kind: 'comitium.candidate-search-error', code: error.code }, []];
    }

    if (error instanceof CandidateSearchCacheError) {
      return [{ kind: 'comitium.candidate-search-cache-error', code: error.code }, []];
    }

    return fallback.serialize(thrown);
  },
  deserialize(value) {
    const result = serializedUnlockApiErrorSchema.safeParse(value);

    if (result.success) {
      throw new UnlockApiError(result.data.status, result.data.code);
    }

    const searchError = serializedCandidateSearchErrorSchema.safeParse(value);

    if (searchError.success) {
      throw new CandidateSearchError(searchError.data.code);
    }

    const cacheError = serializedCandidateSearchCacheErrorSchema.safeParse(value);

    if (cacheError.success) {
      throw new CandidateSearchCacheError(cacheError.data.code);
    }

    return fallback.deserialize(value);
  },
});
