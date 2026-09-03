import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { keepPreviousData, skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getPipelineJobs } from '@/lib/api/pipeline';
import type { PipelineJobsFilters, PipelineJobsResponse } from '@/lib/schemas/pipeline';
import { isDefined } from '@/lib/utils';

export function useQueryPipelineJobs(orgId?: string, filters: PipelineJobsFilters = {}) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<PipelineJobsResponse>({
    queryKey: qk.pipeline.jobs(orgId, filters),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getPipelineJobs(orgId, filters) : skipToken,
    staleTime: STALE_TIME_SHORT,
    placeholderData: keepPreviousData,
  });
}

export function useInfiniteQueryPipelineJobs(orgId?: string, filters: PipelineJobsFilters = {}) {
  const isAuthenticated = useIsAuthenticated();

  return useInfiniteQuery({
    queryKey: qk.pipeline.infiniteJobs(orgId, filters),
    queryFn:
      isAuthenticated && isDefined(orgId)
        ? ({ pageParam }) => getPipelineJobs(orgId, { ...filters, cursor: pageParam as string | undefined })
        : skipToken,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: STALE_TIME_SHORT,
  });
}

export function getFlatPipelineJobs(data: ReturnType<typeof useInfiniteQueryPipelineJobs>['data']) {
  return data?.pages.flatMap((page) => page.data) ?? [];
}
