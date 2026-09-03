import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { keepPreviousData, skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getPipelineCandidates } from '@/lib/api/pipeline';
import type { PipelineCandidatesFilters, PipelineCandidatesResponse } from '@/lib/schemas/pipeline';
import { isDefined } from '@/lib/utils';

export function useQueryPipelineCandidates(orgId?: string, filters: PipelineCandidatesFilters = {}) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<PipelineCandidatesResponse>({
    queryKey: qk.pipeline.candidates(orgId, filters),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getPipelineCandidates(orgId, filters) : skipToken,
    staleTime: STALE_TIME_SHORT,
    placeholderData: keepPreviousData,
  });
}

export function useInfiniteQueryPipelineCandidates(orgId?: string, filters: PipelineCandidatesFilters = {}) {
  const isAuthenticated = useIsAuthenticated();

  return useInfiniteQuery({
    queryKey: qk.pipeline.infiniteCandidates(orgId, filters),
    queryFn:
      isAuthenticated && isDefined(orgId)
        ? async ({ pageParam }: { pageParam: string | null }): Promise<PipelineCandidatesResponse> => {
            return getPipelineCandidates(orgId, {
              ...filters,
              cursor: pageParam ?? undefined,
            });
          }
        : skipToken,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: STALE_TIME_SHORT,
  });
}

export function getFlatPipelineCandidates(data: ReturnType<typeof useInfiniteQueryPipelineCandidates>['data']) {
  return data?.pages.flatMap((page) => page.data) ?? [];
}
