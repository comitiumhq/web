import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';

import { qk } from '@/hooks/query-keys';
import { readStakeToken } from '@/lib/orgs/core/balance';

export function useStakeToken() {
  return useQuery<Address>({
    queryKey: qk.jobConfig.stakeToken(),
    queryFn: async () => {
      const result = await readStakeToken();

      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}
