import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { PublicJobSort } from '@comitium/schemas/job-enums';
import type { JobsResponse } from '@comitium/schemas/public-jobs';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { PublicJobsApi } from '../api';
import { jobsQueryKeys } from '../query-keys';

export interface UseQueryJobsParams {
  limit?: number;
  status?: 'open' | 'closed';
  category?: string;
  location?: string;
  employmentType?: string;
  search?: string;
  locationType?: string;
  salaryMin?: number;
  salaryMax?: number;
  sort?: PublicJobSort;
  enabled?: boolean;
}

export function useQueryJobs(api: PublicJobsApi, params: UseQueryJobsParams = {}) {
  const {
    limit = 20,
    status,
    category,
    location,
    employmentType,
    search,
    locationType,
    salaryMin,
    salaryMax,
    sort,
    enabled = true,
  } = params;

  const fetchJobs = async ({ pageParam }: { pageParam: string | null }): Promise<JobsResponse> => {
    return api.getJobs({
      limit,
      cursor: pageParam,
      status,
      category,
      location,
      employmentType,
      search,
      locationType,
      salaryMin,
      salaryMax,
      sort,
    });
  };

  return useInfiniteQuery({
    queryKey: jobsQueryKeys.publicList({
      status,
      category,
      location,
      employmentType,
      search,
      locationType,
      salaryMin,
      salaryMax,
      sort,
      limit,
    }),
    queryFn: fetchJobs,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: STALE_TIME_SHORT,
    enabled,
  });
}

export function getFlatJobsList(data: ReturnType<typeof useQueryJobs>['data']) {
  return data?.pages.flatMap((page) => page.data) ?? [];
}
