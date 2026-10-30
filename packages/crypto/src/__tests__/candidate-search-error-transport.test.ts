import '../worker/error-transport';
import { expose, releaseProxy, wrap } from 'comlink';
import { describe, expect, it } from 'vitest';
import { CandidateSearchCacheError } from '../candidate-search-cache';
import { CandidateSearchError } from '../worker/candidate-search-error';

describe('Candidate search errors across Comlink', () => {
  it.each(['INVALID_SEARCH', 'SEARCH_SCOPE_CHANGED', 'SEARCH_CACHE_INVALID', 'SEARCH_RESOURCE_LIMIT'] as const)(
    'preserves the allowlisted %s code across the actual Worker transport',
    async (code) => {
      const channel = new MessageChannel();

      expose(
        {
          search() {
            throw new CandidateSearchError(code);
          },
        },
        channel.port1,
      );

      const remote = wrap<{ search(): never }>(channel.port2);

      try {
        await expect(remote.search()).rejects.toMatchObject({ name: 'CandidateSearchError', code });
      } finally {
        remote[releaseProxy]();
        channel.port1.close();
        channel.port2.close();
      }
    },
  );
});

describe('Candidate cache errors across Comlink', () => {
  it.each(['changed', 'capacity', 'unavailable', 'quota', 'invalid', 'unsupported', 'blocked'] as const)(
    'preserves the safe %s storage code',
    async (code) => {
      const channel = new MessageChannel();

      expose(
        {
          read() {
            throw new CandidateSearchCacheError(code);
          },
        },
        channel.port1,
      );

      const remote = wrap<{ read(): never }>(channel.port2);

      try {
        await expect(remote.read()).rejects.toBeInstanceOf(CandidateSearchCacheError);
        await expect(remote.read()).rejects.toMatchObject({ code });
      } finally {
        remote[releaseProxy]();
        channel.port1.close();
        channel.port2.close();
      }
    },
  );
});
