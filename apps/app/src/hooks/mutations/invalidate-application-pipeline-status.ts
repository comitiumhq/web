import type { QueryClient } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';

export function invalidateApplicationPipelineStatus(
  queryClient: QueryClient,
  applicationId: string,
  jobId: string | null,
) {
  queryClient.invalidateQueries({ queryKey: qk.application.detail(applicationId) });
  invalidatePipelineCollections(queryClient, jobId);
}

export function invalidateAllApplicationPipelineStatuses(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: qk.application.root() });
  invalidatePipelineCollections(queryClient, null);
}

function invalidatePipelineCollections(queryClient: QueryClient, jobId: string | null) {
  if (jobId) {
    queryClient.invalidateQueries({ queryKey: qk.jobs.kanbanRoot(jobId) });
  } else {
    queryClient.invalidateQueries({
      predicate: (query) => qk.jobs.isKanban(query.queryKey),
    });
  }

  queryClient.invalidateQueries({ queryKey: qk.pipeline.root() });
}
