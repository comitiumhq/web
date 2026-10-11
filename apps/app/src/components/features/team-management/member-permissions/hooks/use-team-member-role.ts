import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import { changeTeamMemberRole } from '@/lib/api/orgs-team';
import type { OrgRole } from '@/lib/schemas/org';

interface ChangeRoleParams {
  orgId: string;
  userId: string;
  role: OrgRole;
  vaultGrant?: { wrappedVaultKey: unknown };
}

export function useChangeRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, userId, role, vaultGrant }: ChangeRoleParams) => {
      await changeTeamMemberRole(orgId, userId, role, vaultGrant);
    },
    onSuccess: (_, { orgId, userId }) => {
      toast.success('Role updated');

      for (const queryKey of [
        qk.org.teamMember(orgId, userId),
        qk.org.team(orgId),
        qk.org.memberAccess(orgId, userId),
      ]) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
