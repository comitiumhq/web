import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { JobDraft } from '@comitium/schemas/jobs';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getDraft } from '@/lib/api/jobs';

export function useQueryDraft(orgId: string, jobId: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<JobDraft | null>({
    queryKey: qk.jobs.draft(orgId, jobId),
    queryFn: isAuthenticated ? () => getDraft(orgId, jobId) : skipToken,
    staleTime: STALE_TIME_SHORT,
  });
}
