import { useMutation, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { acceptInvite } from '@/lib/api/orgs-invites';

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => acceptInvite(token),
    onSuccess: (_data, token) => {
      queryClient.invalidateQueries({ queryKey: qk.orgs.my() });
      queryClient.invalidateQueries({ queryKey: qk.invite.detail(token) });
    },
  });
}
