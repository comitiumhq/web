import type { CandidateSearchFilter } from '@comitium/crypto/candidate-search-protocol';
import {
  type CandidateSearchDefinition,
  type CandidateServerPredicate,
  candidateSearchDefinitionSchema,
  type ServerCandidateQuery,
} from '@comitium/schemas/candidate-search';

/**
 * Allowlist the wire contract. Private values never enter an API request or query key.
 */
export function compileCandidateSearch(value: CandidateSearchDefinition): {
  server: ServerCandidateQuery;
  privateFilter: CandidateSearchFilter | null;
} {
  const definition = candidateSearchDefinitionSchema.parse(value);
  const candidateAll: CandidateServerPredicate[] = [];
  const privateFilter: CandidateSearchFilter = {};

  for (const predicate of definition.candidateAll) {
    switch (predicate.field) {
      case 'candidate.profileText':
        if (predicate.value.trim()) {
          privateFilter.profileText = predicate.value;
        }

        break;
      case 'candidate.email':
        privateFilter.email = predicate.value;
        break;
      case 'candidate.cityId':
        privateFilter.cityIds = predicate.value;
        break;
      case 'candidate.country':
        privateFilter.countries = predicate.value;
        break;
      default:
        candidateAll.push(predicate);
    }
  }

  return {
    server: {
      version: 1,
      candidateAll,
      applicationAny: definition.applicationAny,
      retrieval: definition.retrieval,
      sort: definition.sort,
      limit: 50,
    },
    privateFilter: Object.keys(privateFilter).length ? privateFilter : null,
  };
}
