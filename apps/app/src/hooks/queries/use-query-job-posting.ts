import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getJobPosting } from '@/lib/api/jobs';

export function useQueryJobPosting(orgId: string, jobId: string, enabled = true) {
  return useQuery({
    queryKey: qk.jobs.posting(orgId, jobId),
    queryFn: enabled ? () => getJobPosting(orgId, jobId) : skipToken,
    staleTime: STALE_TIME_SHORT,
  });
}
