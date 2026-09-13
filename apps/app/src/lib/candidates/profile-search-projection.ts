import { type CandidateProfileSearchField, CryptoProxy } from '@comitium/crypto';
import {
  CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION,
  type CandidateProfile,
  type CandidateProfileSearchProjection,
} from '@comitium/schemas/candidates';
import type { WrappedKey } from '@comitium/schemas/common';

export async function projectCandidateProfileSearch(
  orgId: string,
  wrappedVaultKey: WrappedKey,
  profile: CandidateProfile,
): Promise<CandidateProfileSearchProjection> {
  const [contactEmailDigest, locationCityDigest, locationCountryDigest] = await Promise.all([
    hashOptionalProfileValue(orgId, wrappedVaultKey, 'email', profile.email),
    hashOptionalProfileValue(orgId, wrappedVaultKey, 'cityId', profile.location?.cityId ?? null),
    hashOptionalProfileValue(orgId, wrappedVaultKey, 'country', profile.location?.country ?? null),
  ]);

  return {
    version: CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION,
    contactEmailDigest,
    locationCityDigest,
    locationCountryDigest,
  };
}

function hashOptionalProfileValue(
  orgId: string,
  wrappedVaultKey: WrappedKey,
  field: CandidateProfileSearchField,
  value: string | number | null,
): Promise<string | null> {
  if (value === null) {
    return Promise.resolve(null);
  }

  return CryptoProxy.hashCandidateProfileSearchValue(orgId, wrappedVaultKey, field, value);
}
