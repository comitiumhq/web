import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getApplicantStakeReturnAvailability } from '@/lib/api/applications';

const STAKE_RETURN_REFRESH_MS = 60_000;

export function useQueryApplicantStakeReturn() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: qk.application.stakeReturn(),
    queryFn: getApplicantStakeReturnAvailability,
    enabled: isAuthenticated,
    staleTime: STALE_TIME_SHORT,
    refetchInterval: STAKE_RETURN_REFRESH_MS,
  });
}
