import { STALE_TIME_DEFAULT, shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import type { JobSummary } from '@comitium/schemas/jobs';
import { queryOptions, skipToken } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getJobSummary } from '@/lib/api/jobs';

export function jobSummaryQueryOptions(id: string | null) {
  return queryOptions<JobSummary>({
    queryKey: qk.jobs.summary(id),
    queryFn: id !== null ? () => getJobSummary(id) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    retry: shouldRetryQuery,
  });
}
