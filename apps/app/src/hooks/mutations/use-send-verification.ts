import { useMutation, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { sendVerification } from '@/lib/api/orgs-verification';

export function useSendVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => sendVerification(email),
    onSuccess: (result) => {
      if (result.status === 'verified') {
        return queryClient.invalidateQueries({ queryKey: qk.orgs.creation() });
      }
    },
  });
}
