import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { qk } from '@/hooks/query-keys';
import { getBalanceHistory } from '@/lib/api/orgs-balance';
import type { BalanceEvent } from '@/lib/schemas/org';

export type {
  BalanceEvent,
  BalanceEventDetails,
  BalanceEventType,
} from '@/lib/schemas/org';

export {
  isDepositOrWithdraw,
  isJobFunded,
  isJobSettled,
} from '@/lib/schemas/org';

const BALANCE_HISTORY_STALE_TIME = STALE_TIME_SHORT;

function balanceHistoryQueryKey(orgId: string) {
  return qk.balance.orgHistory(orgId);
}

export function useOrgBalanceHistory(orgId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<BalanceEvent[]>({
    queryKey: balanceHistoryQueryKey(orgId),
    queryFn: async () => {
      const res = await getBalanceHistory(orgId);

      return res.data;
    },
    staleTime: BALANCE_HISTORY_STALE_TIME,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: balanceHistoryQueryKey(orgId) });
  }, [queryClient, orgId]);

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? 'Failed to load balance activity' : null,
    refetch,
  };
}
