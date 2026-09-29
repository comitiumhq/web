import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { JobEditor } from '@comitium/schemas/jobs';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getJobEditor } from '@/lib/api/jobs';

export function useQueryJobEditor(orgId: string, jobId: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<JobEditor | null>({
    queryKey: qk.jobs.editor(orgId, jobId),
    queryFn: isAuthenticated ? () => getJobEditor(orgId, jobId) : skipToken,
    staleTime: STALE_TIME_SHORT,
  });
}
