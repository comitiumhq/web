import { useMutation, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { verifyCode } from '@/lib/api/orgs-verification';

export function useVerifyCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => verifyCode(email, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.orgs.creation() }),
  });
}
