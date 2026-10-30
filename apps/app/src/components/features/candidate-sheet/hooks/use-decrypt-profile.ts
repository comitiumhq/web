import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import type { EncryptedEnvelope, VaultKeyAccess } from '@comitium/crypto';
import { CryptoProxy } from '@comitium/crypto';
import { candidateProfileContext } from '@comitium/crypto/context';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import { useCallback, useEffect, useState } from 'react';
import { useQueryCandidate } from '@/hooks/queries/use-query-candidate';
import { getErrorStatus } from '@/lib/api/client';
import { parseDecryptedCandidateProfile } from '@/lib/crypto/decrypted-payloads';

type ProfileDecryptionState = { orgId: string; access: VaultKeyAccess; envelope: EncryptedEnvelope } & (
  | { candidateId: string; status: 'decrypting'; profile: null }
  | { candidateId: string; revision: number; status: 'success'; profile: CandidateProfile }
  | { candidateId: string; status: 'error'; profile: null }
);

export function useDecryptProfile(candidateId: string | null | undefined, orgId: string, vaultAccess?: VaultKeyAccess) {
  const { data: candidateData, isLoading, isError, error, refetch } = useQueryCandidate(candidateId ?? null);
  const isCryptoActive = useIsCryptoActive();
  const [decryptionState, setDecryptionState] = useState<ProfileDecryptionState | null>(null);
  const retryQuery = useCallback(() => refetch(), [refetch]);
  const denied = getErrorStatus(error) === 403 || getErrorStatus(error) === 404;
  const hasCurrentCandidateData = !denied && candidateData?.id === candidateId;
  const hasCurrentEncryptedProfile = Boolean(hasCurrentCandidateData && candidateData?.profile);

  const currentDecryptionState =
    isCryptoActive &&
    hasCurrentEncryptedProfile &&
    decryptionState !== null &&
    decryptionState.candidateId === candidateId &&
    decryptionState.orgId === orgId &&
    decryptionState.access === vaultAccess &&
    decryptionState.envelope === candidateData?.profile
      ? decryptionState
      : null;

  const canDecrypt = hasCurrentEncryptedProfile && Boolean(vaultAccess) && isCryptoActive;
  const isAwaitingDecryption =
    canDecrypt && currentDecryptionState?.status !== 'success' && currentDecryptionState?.status !== 'error';

  useEffect(() => {
    let cancelled = false;

    if (denied || !candidateData?.profile || candidateData.id !== candidateId || !vaultAccess || !isCryptoActive) {
      setDecryptionState(null);
      return;
    }

    const source = { orgId, access: vaultAccess, envelope: candidateData.profile };
    setDecryptionState({ ...source, candidateId: candidateData.id, status: 'decrypting', profile: null });

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
          setDecryptionState({ ...source, candidateId: candidateData.id, status: 'error', profile: null });

          return;
        }

        setDecryptionState({
          ...source,
          candidateId: candidateData.id,
          revision: candidateData.profileRevision,
          status: 'success',
          profile,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setDecryptionState({ ...source, candidateId: candidateData.id, status: 'error', profile: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [candidateData, candidateId, vaultAccess, orgId, isCryptoActive, denied]);

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
