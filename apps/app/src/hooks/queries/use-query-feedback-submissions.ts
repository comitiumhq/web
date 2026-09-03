import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qk } from '@/hooks/query-keys';
import { DEFAULT_CURSOR_PAGE_SIZE } from '@/lib/api/cursor-pagination';
import { listFeedbackSubmissions } from '@/lib/api/feedback-submissions';
import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import { isDefined } from '@/lib/utils';

export function useQueryFeedbackSubmissions(applicationId?: string, interviewEventId?: string) {
  const isAuthenticated = useIsAuthenticated();

  const query = useInfiniteQuery({
    queryKey: qk.application.feedbackSubmissions(applicationId, interviewEventId),
    queryFn: isDefined(applicationId)
      ? ({ pageParam }) =>
          listFeedbackSubmissions(
            applicationId,
            DEFAULT_CURSOR_PAGE_SIZE,
            pageParam as string | undefined,
            interviewEventId,
          )
      : skipToken,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: isAuthenticated,
    staleTime: STALE_TIME_SHORT,
  });
  const data = useMemo<FeedbackSubmission[] | undefined>(
    () => query.data?.pages.flatMap((page) => page.data),
    [query.data?.pages],
  );

  return { ...query, data };
}
