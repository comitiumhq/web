import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getInterviewPlan } from '@/lib/api/interview-plans';
import type { InterviewPlanDetail } from '@/lib/schemas/pipeline';
import { isDefined } from '@/lib/utils';

interface InterviewPlanResponse {
  data: InterviewPlanDetail;
}

export function useQueryInterviewPlan(orgId?: string, planId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<InterviewPlanResponse>({
    queryKey: qk.interviewPlans.detail(orgId, planId),
    queryFn:
      isAuthenticated && isDefined(orgId) && isDefined(planId) ? () => getInterviewPlan(orgId, planId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
