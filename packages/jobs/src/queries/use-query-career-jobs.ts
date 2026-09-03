import { STALE_TIME_DEFAULT, STALE_TIME_SHORT, shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import type { LocationItem } from '@comitium/schemas/public-jobs';
import { skipToken, useQuery } from '@tanstack/react-query';
import type { PublicJobsApi } from '../api';
import type { CareerJobsParams } from '../api/careers';
import { CAREERS_JOBS_LIMIT } from '../constants';
import { jobsQueryKeys } from '../query-keys';
import type { CareerJob, CareerJobsResponse } from '../schemas/careers';

interface UseQueryCareerJobsParams extends Omit<CareerJobsParams, 'cursor'> {
  initialPage?: CareerJobsResponse;
}

export interface CareerJobIdentity {
  orgSlug: string;
  postingSlug: string;
}

export function useQueryCareerJobs(api: PublicJobsApi, orgSlug: string, params: UseQueryCareerJobsParams = {}) {
  const { initialPage, limit = CAREERS_JOBS_LIMIT, ...filters } = params;

  return useQuery({
    queryKey: jobsQueryKeys.careerJobs(orgSlug, { ...filters, limit }),
    queryFn: () => api.getCareerJobs(orgSlug, { ...filters, limit }),
    staleTime: STALE_TIME_SHORT,
    initialData: initialPage,
  });
}

export function useQueryCareerJob(api: PublicJobsApi, identity: CareerJobIdentity | null) {
  return useQuery<CareerJob>({
    queryKey: jobsQueryKeys.careerJob(identity?.orgSlug ?? null, identity?.postingSlug ?? null),
    queryFn: identity ? () => api.getCareerJob(identity.orgSlug, identity.postingSlug) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    retry: shouldRetryQuery,
  });
}

export function useQueryCareerLocations(api: PublicJobsApi, orgSlug: string) {
  return useQuery({
    queryKey: jobsQueryKeys.careerLocations(orgSlug),
    queryFn: (): Promise<LocationItem[]> => api.getCareerLocations(orgSlug),
    staleTime: STALE_TIME_DEFAULT,
  });
}

export function getFlatCareerJobs(data: ReturnType<typeof useQueryCareerJobs>['data']) {
  return data?.data ?? [];
}
