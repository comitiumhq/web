import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getInterviewPlanUsage } from '@/lib/api/interview-plans';

export function useQueryInterviewPlanUsage(orgId: string, planId: string, enabled: boolean) {
  const isAuthenticated = useIsAuthenticated();
  const canLoad = isAuthenticated && enabled;

  return useQuery({
    queryKey: qk.interviewPlans.usage(orgId, planId),
    queryFn: canLoad ? () => getInterviewPlanUsage(orgId, planId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
