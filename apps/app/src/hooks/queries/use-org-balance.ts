import { usdcToUsd } from '@comitium/chain/job-economics';

import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { type OrgBalance, readOrgBalance } from '@/lib/orgs/core/balance';
import { isDefined } from '@/lib/utils';

export function useOrgBalance(onChainOrgId?: number) {
  const query = useQuery<OrgBalance>({
    queryKey: qk.balance.org(onChainOrgId),
    queryFn: isDefined(onChainOrgId)
      ? async () => {
          const result = await readOrgBalance(onChainOrgId);

          if (result.isErr()) {
            throw result.error;
          }

          return result.value;
        }
      : skipToken,
    staleTime: STALE_TIME_SHORT,
  });

  const balance = query.data;

  return {
    balance,
    availableUsd: balance ? usdcToUsd(balance.available) : 0,
    lockedUsd: balance ? usdcToUsd(balance.lockedInJobs) : 0,
    totalUsd: balance ? usdcToUsd(balance.operationalBalance) : 0,
    isLoading: query.isLoading,
    error: query.error ? 'Failed to load balance' : null,
  };
}
