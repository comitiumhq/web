import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy, type PublicEncryptionKey } from '@comitium/crypto';
import { candidateProfileContext } from '@comitium/crypto/context';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import type { WrappedKey } from '@comitium/schemas/common';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import { updateCandidateProfile } from '@/lib/api/candidates';
import { projectCandidateProfileSearch } from '@/lib/candidates/profile-search-projection';

interface UpdateCandidateProfileParams {
  candidateId: string;
  orgId: string;
  profile: CandidateProfile;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  wrappedVaultKey: WrappedKey;
}

export function useUpdateCandidateProfile() {
  const queryClient = useQueryClient();
  const { ensureUnlocked } = useCryptoUnlock();

  return useMutation({
    mutationFn: async ({
      candidateId,
      orgId,
      profile,
      vaultPublicKey,
      vaultKeyVersion,
      wrappedVaultKey,
    }: UpdateCandidateProfileParams) => {
      await ensureUnlocked();

      const [encryptedProfile, searchProjection] = await Promise.all([
        CryptoProxy.encryptApplication(
          vaultPublicKey,
          vaultKeyVersion,
          profile,
          candidateProfileContext(orgId, candidateId),
        ),
        projectCandidateProfileSearch(orgId, wrappedVaultKey, profile),
      ]);

      return updateCandidateProfile(candidateId, encryptedProfile, searchProjection);
    },

    onSuccess: (_, { candidateId }) => {
      toast.success('Candidate profile updated');
      queryClient.invalidateQueries({ queryKey: qk.candidate.detail(candidateId) });
      queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
      queryClient.invalidateQueries({ queryKey: qk.application.root() });
      queryClient.invalidateQueries({ queryKey: qk.pipeline.candidatesRoot() });
      queryClient.invalidateQueries({
        predicate: (query) => qk.jobs.isKanban(query.queryKey),
      });
    },

    onError: showMutationError,
  });
}
