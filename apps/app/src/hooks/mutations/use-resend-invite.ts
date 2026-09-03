import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import { resendInvite } from '@/lib/api/orgs-invites';

interface ResendInviteParams {
  orgId: string;
  inviteId: string;
}

export function useResendInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, inviteId }: ResendInviteParams) => resendInvite(orgId, inviteId),
    onSuccess: (_result, { orgId }) => {
      toast.success('Invitation resent');

      queryClient.invalidateQueries({ queryKey: qk.org.invites(orgId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
