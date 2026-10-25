import { CryptoProxy, type VaultKeyAccess } from '@comitium/crypto';
import {
  type CandidateProfile,
  projectCandidateProfileSearch as projectProfileSearch,
} from '@comitium/crypto/candidate-profile';

export function projectCandidateProfileSearch(orgId: string, vaultAccess: VaultKeyAccess, profile: CandidateProfile) {
  return projectProfileSearch(profile, (field, value) =>
    CryptoProxy.hashCandidateProfileSearchValue(orgId, vaultAccess, field, value),
  );
}
