import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import { revokeInvite } from '@/lib/api/orgs-invites';

interface RevokeInviteParams {
  orgId: string;
  inviteId: string;
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, inviteId }: RevokeInviteParams) => revokeInvite(orgId, inviteId),
    onSuccess: (_result, { orgId }) => {
      toast.success('Invitation revoked');

      queryClient.invalidateQueries({ queryKey: qk.org.invites(orgId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
