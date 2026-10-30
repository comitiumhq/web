import type { z } from 'zod';
import type { CandidateSearchCache } from '../candidate-search-cache';
import {
  assertCandidateCommit,
  candidateSourceMutations,
  readCandidateSearchCommit,
} from '../candidate-search-cache/profiles';
import type {
  CandidateSearchFilter,
  CandidateSearchHandle,
  CandidateSearchReference,
  CandidateSearchScope,
} from '../candidate-search-protocol';
import {
  candidateSearchFilterSchema,
  candidateSearchHandleSchema,
  candidateSearchReferencesSchema,
  candidateSearchScopeSchema,
} from '../schemas/candidate-search';
import {
  CANDIDATE_SEARCH_REFERENCE_CHUNK_SIZE,
  type CandidateSearchCacheBinding,
} from '../schemas/candidate-search-cache';
import type { CandidateSearchCacheCipher } from './candidate-search-cache-cipher';
import { type CandidateSearchSourceDecoder, prepareCandidateDocuments } from './candidate-search-documents';
import { CandidateSearchError } from './candidate-search-error';
import { clearCandidateIndexBuffer, createCandidateIndex } from './candidate-search-index';
import { type CandidateSearchEvaluation, evaluateCandidateQuery } from './candidate-search-query';
import { CandidateSearchStorage } from './candidate-search-storage';
import { candidateQueryTerms } from './candidate-search-terms';

/**
 * One active authorized disk index. Each operation owns bounded temporary state, never the full corpus.
 */
export class CandidateSearch {
  private scope: CandidateSearchScope | null = null;
  private binding: CandidateSearchCacheBinding | null = null;
  private generation = 0;
  private controller = new AbortController();

  constructor(
    private readonly cache: CandidateSearchCache,
    private readonly cipher: CandidateSearchCacheCipher,
    private readonly decode: CandidateSearchSourceDecoder,
  ) {}

  reset(value: CandidateSearchScope, binding: CandidateSearchCacheBinding): CandidateSearchHandle {
    this.clear();
    this.scope = parseSearch(candidateSearchScopeSchema, value);
    this.binding = binding;
    this.controller = new AbortController();

    return this.handle();
  }

  clear(): void {
    this.controller.abort();
    this.scope = null;
    this.binding = null;
    this.generation += 1;
  }

  async commit(handle: CandidateSearchHandle, value: unknown) {
    this.assertHandle(handle);

    const binding = this.requireBinding();
    const change = readCandidateSearchCommit(value);
    const entries = change.kind === 'changes' ? change.events : change.profiles;
    const ids = [...new Set(entries.map((entry) => entry.candidateId))];
    const snapshot = await this.cache.readDocuments(binding, ids);

    this.assertHandle(handle);
    assertCandidateCommit(snapshot.namespace, change);

    const mutations = candidateSourceMutations(snapshot.namespace, change);
    const byId = new Map(ids.map((id, index) => [id, snapshot.records[index]]));

    const publication = await prepareCandidateDocuments({
      cipher: this.cipher,
      namespace: snapshot.namespace,
      mutations,
      records: mutations.map((mutation) => byId.get(mutation.candidateId) ?? null),
      decode: this.decode,
      assertCurrent: () => this.assertHandle(handle),
    });
    this.assertHandle(handle);

    const index = createCandidateIndex<true>();
    const storage = new CandidateSearchStorage({
      cache: this.cache,
      cipher: this.cipher,
      namespace: snapshot.namespace,
      signal: this.controller.signal,
      assertCurrent: () => this.assertHandle(handle),
      publication: { ...publication, change },
    });

    try {
      await index.mount(storage);

      for (const operation of publication.operations) {
        if (operation.kind === 'remove') {
          index.remove(operation.id);
        } else if (operation.kind === 'update') {
          index.update(operation.id, operation.content);
        } else {
          index.append(operation.id, operation.content);
        }
      }

      await index.commit();
    } finally {
      clearCandidateIndexBuffer(index);
      await storage.close();
    }

    this.assertHandle(handle);
    const namespace = storage.checkpoint();
    const deleted = mutations.some((mutation) => mutation.document === null);

    if (deleted) {
      this.controller.abort();
      this.controller = new AbortController();
      this.generation += 1;
    }

    return { index: this.handle(), namespace };
  }

  async evaluateReferences(
    handle: CandidateSearchHandle,
    value: CandidateSearchFilter,
    references: CandidateSearchReference[],
  ): Promise<CandidateSearchEvaluation[]> {
    this.assertHandle(handle);

    const filter = parseSearch(candidateSearchFilterSchema, value);
    const refs = parseSearch(candidateSearchReferencesSchema, references);
    const terms = candidateQueryTerms(filter.profileText ?? '');

    if (!refs.length) {
      return [];
    }

    const results: CandidateSearchEvaluation[] = [];

    const context = {
      cache: this.cache,
      cipher: this.cipher,
      binding: this.requireBinding(),
      signal: this.controller.signal,
      assertCurrent: () => this.assertHandle(handle),
    };

    for (let offset = 0; offset < refs.length; offset += CANDIDATE_SEARCH_REFERENCE_CHUNK_SIZE) {
      const chunk = refs.slice(offset, offset + CANDIDATE_SEARCH_REFERENCE_CHUNK_SIZE);
      const result = await evaluateCandidateQuery(context, filter, terms, chunk);

      this.assertHandle(handle);

      results.push(...result);
    }

    return results;
  }

  async stats() {
    const binding = this.binding;
    const snapshot = binding ? await this.cache.checkpoint(binding) : null;
    const namespace = binding === this.binding ? snapshot : null;

    return {
      status: this.scope ? ('active' as const) : ('inactive' as const),
      documents: namespace?.recordCount ?? 0,
      unreadableDocuments: namespace?.unreadableCount ?? 0,
    };
  }

  private assertHandle(value: CandidateSearchHandle): void {
    const handle = parseSearch(candidateSearchHandleSchema, value);
    const invalid =
      !this.scope ||
      handle.orgId !== this.scope.orgId ||
      handle.scopeToken !== this.scope.scopeToken ||
      handle.generation !== this.generation;

    if (invalid) {
      throw new CandidateSearchError('SEARCH_SCOPE_CHANGED');
    }
  }

  private requireBinding(): CandidateSearchCacheBinding {
    if (!this.binding) {
      throw new CandidateSearchError('SEARCH_SCOPE_CHANGED');
    }

    return this.binding;
  }

  private handle(): CandidateSearchHandle {
    if (!this.scope) {
      throw new CandidateSearchError('SEARCH_SCOPE_CHANGED');
    }

    return { ...this.scope, generation: this.generation };
  }
}

function parseSearch<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new CandidateSearchError('INVALID_SEARCH');
  }

  return result.data;
}
