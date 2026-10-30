import {
  type CandidateSearchReference,
  candidateCorpusBootstrapResponseSchema,
  candidateCorpusChangesResponseSchema,
  candidateCorpusHydrateResponseSchema,
} from '@comitium/crypto/candidate-search-protocol';
import {
  type CandidateFilterOptionsInput,
  candidateFilterOptionsResponseSchema,
  candidateQueryResponseSchema,
  type ServerCandidateQuery,
  serverCandidateQuerySchema,
} from '@comitium/schemas/candidate-search';
import { api } from './client';

export function bootstrapCandidateCorpus(orgId: string, cursor: string | null, signal: AbortSignal) {
  return api.post(
    `/orgs/${orgId}/candidates/search-corpus/bootstrap`,
    { corpusVersion: 1, ...(cursor ? { cursor } : {}) },
    candidateCorpusBootstrapResponseSchema,
    { signal },
  );
}

export function getCandidateCorpusChanges(
  orgId: string,
  scopeToken: string,
  since: string,
  throughCursor: string | undefined,
  signal: AbortSignal,
) {
  return api.post(
    `/orgs/${orgId}/candidates/search-corpus/changes`,
    { scopeToken, since, ...(throughCursor ? { throughCursor } : {}) },
    candidateCorpusChangesResponseSchema,
    { signal },
  );
}

export function hydrateCandidateCorpus(
  orgId: string,
  scopeToken: string,
  references: CandidateSearchReference[],
  signal: AbortSignal,
) {
  return api.post(
    `/orgs/${orgId}/candidates/search-corpus/hydrate`,
    {
      scopeToken,
      references: references.map(({ candidateId, profileRevision }) => ({
        candidateId,
        expectedRevision: profileRevision,
      })),
    },
    candidateCorpusHydrateResponseSchema,
    { signal },
  );
}

export function queryCandidates(orgId: string, query: ServerCandidateQuery, signal?: AbortSignal) {
  return api.post(
    `/orgs/${orgId}/candidates/query`,
    serverCandidateQuerySchema.parse(query),
    candidateQueryResponseSchema,
    { signal },
  );
}

export function getCandidateFilterOptions(orgId: string, input: CandidateFilterOptionsInput) {
  return api.post(
    `/orgs/${orgId}/candidates/search-corpus/filter-options`,
    input,
    candidateFilterOptionsResponseSchema,
  );
}
