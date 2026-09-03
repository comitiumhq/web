import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy, type PublicEncryptionKey } from '@comitium/crypto';
import { candidateProfileContext } from '@comitium/crypto/context';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import { updateCandidateProfile } from '@/lib/api/candidates';

interface UpdateCandidateProfileParams {
  candidateId: string;
  orgId: string;
  profile: CandidateProfile;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
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
    }: UpdateCandidateProfileParams) => {
      await ensureUnlocked();

      const encryptedProfile = await CryptoProxy.encryptApplication(
        vaultPublicKey,
        vaultKeyVersion,
        profile,
        candidateProfileContext(orgId, candidateId),
      );

      return updateCandidateProfile(candidateId, encryptedProfile);
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
