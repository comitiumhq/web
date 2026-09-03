import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getInterviewPlans } from '@/lib/api/interview-plans';
import type { InterviewPlanSummary } from '@/lib/schemas/pipeline';
import { isDefined } from '@/lib/utils';

interface InterviewPlansResponse {
  data: InterviewPlanSummary[];
}

export function useQueryInterviewPlans(orgId?: string, includeArchived = false) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<InterviewPlansResponse>({
    queryKey: qk.interviewPlans.list(orgId, { includeArchived }),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getInterviewPlans(orgId, includeArchived) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    placeholderData: keepPreviousData,
  });
}
