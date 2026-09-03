import { fetchCurrentJobConfig } from '@comitium/chain/job-config';
import type { JobEconomicsConfig } from '@comitium/chain/job-economics';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';

export function useQueryJobConfig() {
  return useQuery<JobEconomicsConfig>({
    queryKey: qk.jobConfig.current(),
    queryFn: fetchCurrentJobConfig,
    staleTime: STALE_TIME_SHORT,
  });
}
