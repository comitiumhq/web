import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getInterviewTemplateFeedbackFormOptions, getInterviewTemplates } from '@/lib/api/interview-templates';
import { isDefined } from '@/lib/utils';

export function useQueryInterviewTemplates(orgId?: string, includeArchived = false) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: qk.templates.interviews(orgId, { includeArchived }),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getInterviewTemplates(orgId, includeArchived) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    placeholderData: keepPreviousData,
  });
}

export function useQueryInterviewTemplateFeedbackFormOptions(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: qk.templates.interviewFeedbackFormOptions(orgId),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getInterviewTemplateFeedbackFormOptions(orgId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
