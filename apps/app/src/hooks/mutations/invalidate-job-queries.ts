import type { QueryClient } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';

export interface JobQueryTarget {
  orgId: string;
  jobId: string;
}

export function invalidateJobQueries(
  queryClient: QueryClient,
  target: JobQueryTarget,
  refetchType: 'active' | 'all' = 'all',
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.jobs.detail(target.jobId), refetchType }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.editor(target.orgId, target.jobId), refetchType }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.posting(target.orgId, target.jobId), refetchType }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.orgRoot(target.orgId), refetchType }),
    queryClient.invalidateQueries({ queryKey: qk.jobs.draftsOrg(target.orgId), refetchType }),
  ]);
}
