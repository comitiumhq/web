import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useContractAuthorityMutation } from '@/hooks/mutations/use-contract-authority-mutation';
import { qk } from '@/hooks/query-keys';
import { deactivateTeamMember, reactivateTeamMember } from '@/lib/api/orgs-team';

interface MemberLifecycleParams {
  orgId: string;
  userId: string;
}

export function useDeactivateMember() {
  const queryClient = useQueryClient();
  const executeAuthorityMutation = useContractAuthorityMutation();

  return useMutation({
    mutationFn: async ({ orgId, userId }: MemberLifecycleParams) => {
      await executeAuthorityMutation((authorityProof) => deactivateTeamMember(orgId, userId, authorityProof));
    },
    onSuccess: (_, { orgId, userId }) => {
      toast.success('Member deactivated');

      queryClient.invalidateQueries({ queryKey: qk.org.teamMember(orgId, userId) });
      queryClient.invalidateQueries({ queryKey: qk.org.team(orgId) });
      queryClient.invalidateQueries({ queryKey: qk.org.permissions(orgId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useReactivateMember() {
  const queryClient = useQueryClient();
  const executeAuthorityMutation = useContractAuthorityMutation();

  return useMutation({
    mutationFn: async ({ orgId, userId }: MemberLifecycleParams) => {
      await executeAuthorityMutation((authorityProof) => reactivateTeamMember(orgId, userId, authorityProof));
    },
    onSuccess: (_, { orgId, userId }) => {
      toast.success('Member reactivated');

      queryClient.invalidateQueries({ queryKey: qk.org.teamMember(orgId, userId) });
      queryClient.invalidateQueries({ queryKey: qk.org.team(orgId) });
      queryClient.invalidateQueries({ queryKey: qk.org.permissions(orgId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
