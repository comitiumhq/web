import type { VaultKeyAccess } from '@comitium/crypto';
import { type CandidateProfileSearchField, CryptoProxy } from '@comitium/crypto';
import {
  CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION,
  type CandidateProfile,
  type CandidateProfileSearchProjection,
} from '@comitium/schemas/candidates';

export async function projectCandidateProfileSearch(
  orgId: string,
  vaultAccess: VaultKeyAccess,
  profile: CandidateProfile,
): Promise<CandidateProfileSearchProjection> {
  const [contactEmailDigest, locationCityDigest, locationCountryDigest] = await Promise.all([
    hashOptionalProfileValue(orgId, vaultAccess, 'email', profile.email),
    hashOptionalProfileValue(orgId, vaultAccess, 'cityId', profile.location?.cityId ?? null),
    hashOptionalProfileValue(orgId, vaultAccess, 'country', profile.location?.country ?? null),
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
  vaultAccess: VaultKeyAccess,
  field: CandidateProfileSearchField,
  value: string | number | null,
): Promise<string | null> {
  if (value === null) {
    return Promise.resolve(null);
  }

  return CryptoProxy.hashCandidateProfileSearchValue(orgId, vaultAccess, field, value);
}
