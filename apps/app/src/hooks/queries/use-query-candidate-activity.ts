import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qk } from '@/hooks/query-keys';
import { getCandidateActivity } from '@/lib/api/candidates';
import { DEFAULT_CURSOR_PAGE_SIZE } from '@/lib/api/cursor-pagination';
import type { ActivityFeedResponse } from '@/lib/schemas/emails';

export function useQueryCandidateActivity(candidateId: string | null, applicationId: string | null) {
  const isAuthenticated = useIsAuthenticated();

  const query = useInfiniteQuery<ActivityFeedResponse>({
    queryKey: qk.candidate.activity(candidateId, applicationId),
    queryFn:
      candidateId && applicationId
        ? ({ pageParam }) =>
            getCandidateActivity(candidateId, applicationId, DEFAULT_CURSOR_PAGE_SIZE, pageParam as string | undefined)
        : skipToken,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: STALE_TIME_SHORT,
    enabled: isAuthenticated,
  });

  const data = useMemo<ActivityFeedResponse | undefined>(() => {
    if (!query.data) {
      return undefined;
    }

    const lastPage = query.data.pages.at(-1);

    return {
      data: query.data.pages.flatMap((page) => page.data),
      pagination: lastPage?.pagination ?? { nextCursor: null, hasMore: false },
    };
  }, [query.data]);

  return { ...query, data };
}
