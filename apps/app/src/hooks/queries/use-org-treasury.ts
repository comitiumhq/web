import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { isTransientApiError } from '@/lib/api/client';
import { getOrgTreasuryStatus } from '@/lib/api/orgs';
import type { OrgTreasuryStatus } from '@/lib/schemas/org';

const TREASURY_REFETCH_INTERVAL_MS = 2_000;

export function useOrgTreasury(orgId: string) {
  const query = useQuery<OrgTreasuryStatus>({
    queryKey: qk.balance.orgTreasury(orgId),
    queryFn: () => getOrgTreasuryStatus(orgId),
    staleTime: STALE_TIME_SHORT,
    refetchInterval: (treasuryQuery) => {
      const isMissingProjection = treasuryQuery.state.data?.status === 'missing_projection';
      const isRecoverableError = treasuryQuery.state.error === null || isTransientApiError(treasuryQuery.state.error);

      if (isMissingProjection && isRecoverableError) {
        return TREASURY_REFETCH_INTERVAL_MS;
      }

      return false;
    },
  });
  const treasury = query.data?.status === 'ready' ? query.data : null;
  const isMissingProjection = query.data?.status === 'missing_projection';
  const isRecoverableError = query.error === null || isTransientApiError(query.error);
  const isWaitingForTreasury = isMissingProjection && isRecoverableError;

  return {
    treasury,
    isLoading: query.isLoading || isWaitingForTreasury,
    error: query.error && !isWaitingForTreasury ? 'Failed to load treasury wallet' : null,
  };
}
