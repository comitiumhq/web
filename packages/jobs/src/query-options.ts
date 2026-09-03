import { STALE_TIME_DEFAULT, shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import { queryOptions } from '@tanstack/react-query';
import type { PublicJobsApi } from './api';
import type { CareerJobsParams } from './api/careers';
import { jobsQueryKeys } from './query-keys';
import type { CareerJob, CareerPage } from './schemas/careers';

export function careerPageQueryOptions(api: PublicJobsApi, orgSlug: string, params: CareerJobsParams = {}) {
  return queryOptions<CareerPage>({
    queryKey: jobsQueryKeys.careerPage(orgSlug, params),
    queryFn: () => api.getCareerPage(orgSlug, params),
    staleTime: STALE_TIME_DEFAULT,
    retry: shouldRetryQuery,
  });
}

export function careerJobQueryOptions(api: PublicJobsApi, params: { orgSlug: string; postingSlug: string }) {
  return queryOptions<CareerJob>({
    queryKey: jobsQueryKeys.careerJob(params.orgSlug, params.postingSlug),
    queryFn: () => api.getCareerJob(params.orgSlug, params.postingSlug),
    staleTime: STALE_TIME_DEFAULT,
    retry: shouldRetryQuery,
  });
}
