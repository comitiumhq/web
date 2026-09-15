import { createBlindIndexDigest, createUuidScopeSalt } from './blind-index';

// Wire-frozen: changing this namespace invalidates stored Candidate-profile digests.
const CANDIDATE_PROFILE_SEARCH_HASH_NAMESPACE = 'comitium-search-projection-hash-v1:candidate-profile';

export type CandidateProfileSearchField = 'email' | 'cityId' | 'country';

export function hashCandidateProfileSearchValue(
  vaultPrivateKey: Uint8Array,
  orgId: string,
  field: CandidateProfileSearchField,
  value: string | number,
): string {
  return createBlindIndexDigest(
    vaultPrivateKey,
    createUuidScopeSalt(orgId),
    `${CANDIDATE_PROFILE_SEARCH_HASH_NAMESPACE}:${field}`,
    normalizeCandidateProfileSearchValue(field, value),
  );
}

function normalizeCandidateProfileSearchValue(field: CandidateProfileSearchField, value: string | number): string {
  const stringValue = String(value).trim();

  switch (field) {
    case 'email':
      return stringValue.toLowerCase();
    case 'cityId':
      return stringValue;
    case 'country':
      return stringValue.toUpperCase();
  }
}
