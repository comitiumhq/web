import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import type { LocationItem } from '@comitium/schemas/public-jobs';
import { useQuery } from '@tanstack/react-query';
import type { PublicJobsApi } from '../api';
import { jobsQueryKeys } from '../query-keys';

export function useQueryLocations(api: PublicJobsApi) {
  return useQuery({
    queryKey: jobsQueryKeys.locations(),
    queryFn: (): Promise<LocationItem[]> => api.getLocations(),
    staleTime: STALE_TIME_DEFAULT,
  });
}
