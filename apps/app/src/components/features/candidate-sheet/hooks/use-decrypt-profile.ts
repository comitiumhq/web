import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import type { VaultKeyAccess } from '@comitium/crypto';
import { CryptoProxy } from '@comitium/crypto';
import { candidateProfileContext } from '@comitium/crypto/context';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import { useCallback, useEffect, useState } from 'react';
import { useQueryCandidate } from '@/hooks/queries/use-query-candidate';
import { parseDecryptedCandidateProfile } from '@/lib/crypto/decrypted-payloads';

type ProfileDecryptionState =
  | { candidateId: string; status: 'decrypting'; profile: null }
  | { candidateId: string; revision: number; status: 'success'; profile: CandidateProfile }
  | { candidateId: string; status: 'error'; profile: null };

export function useDecryptProfile(candidateId: string | null | undefined, orgId: string, vaultAccess?: VaultKeyAccess) {
  const { data: candidateData, isLoading, isError, refetch } = useQueryCandidate(candidateId ?? null);
  const isCryptoActive = useIsCryptoActive();
  const [decryptionState, setDecryptionState] = useState<ProfileDecryptionState | null>(null);
  const retryQuery = useCallback(() => refetch(), [refetch]);
  const hasCurrentCandidateData = candidateData?.id === candidateId;
  const hasCurrentEncryptedProfile = Boolean(hasCurrentCandidateData && candidateData?.profile);
  const currentDecryptionState =
    hasCurrentEncryptedProfile && decryptionState?.candidateId === candidateId ? decryptionState : null;
  const canDecrypt = hasCurrentEncryptedProfile && Boolean(vaultAccess) && isCryptoActive;
  const isAwaitingDecryption =
    canDecrypt && currentDecryptionState?.status !== 'success' && currentDecryptionState?.status !== 'error';

  useEffect(() => {
    let cancelled = false;

    if (!candidateData?.profile || candidateData.id !== candidateId || !vaultAccess || !isCryptoActive) {
      return;
    }

    setDecryptionState({ candidateId: candidateData.id, status: 'decrypting', profile: null });

    CryptoProxy.decryptApplication(
      candidateData.profile,
      orgId,
      vaultAccess,
      candidateProfileContext(orgId, candidateData.id),
    )
      .then((data) => {
        const profile = parseDecryptedCandidateProfile(data);

        if (cancelled) {
          return;
        }

        if (!profile) {
          setDecryptionState({ candidateId: candidateData.id, status: 'error', profile: null });

          return;
        }

        setDecryptionState({
          candidateId: candidateData.id,
          revision: candidateData.profileRevision,
          status: 'success',
          profile,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setDecryptionState({ candidateId: candidateData.id, status: 'error', profile: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [candidateData, candidateId, vaultAccess, orgId, isCryptoActive]);

  let profileRevision =
    hasCurrentCandidateData && !candidateData?.profile ? (candidateData?.profileRevision ?? null) : null;

  if (currentDecryptionState?.status === 'success') {
    profileRevision = currentDecryptionState.revision;
  }

  return {
    profileRevision,
    profile: currentDecryptionState?.status === 'success' ? currentDecryptionState.profile : null,
    isLoading: Boolean(candidateId) && (isLoading || isAwaitingDecryption),
    hasEncryptedProfile: hasCurrentEncryptedProfile,
    queryError: isError && !hasCurrentCandidateData,
    decryptionError: currentDecryptionState?.status === 'error',
    searchProjectionVersion: hasCurrentCandidateData ? (candidateData?.profileSearchProjectionVersion ?? null) : null,
    retryQuery,
  };
}
