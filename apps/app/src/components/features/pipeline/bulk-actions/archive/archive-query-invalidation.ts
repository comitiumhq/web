import type { QueryClient } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import type { BulkOperation, BulkOperationItem } from '@/lib/schemas/bulk-operations';

export function invalidateArchiveQueries(queryClient: QueryClient, operation: BulkOperation) {
  queryClient.invalidateQueries({ queryKey: qk.pipeline.root() });
  queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });

  for (const item of operation.items) {
    invalidateApplicationQueries(queryClient, item);
  }
}

function invalidateApplicationQueries(queryClient: QueryClient, item: BulkOperationItem) {
  queryClient.invalidateQueries({ queryKey: qk.application.detail(item.selectedTargetId) });
  queryClient.invalidateQueries({ queryKey: qk.application.otherApplications(item.selectedTargetId) });
  queryClient.invalidateQueries({ queryKey: qk.application.emails(item.selectedTargetId) });

  if (!item.application?.jobId) return;

  queryClient.invalidateQueries({ queryKey: qk.jobs.kanbanRoot(item.application.jobId) });
  queryClient.invalidateQueries({ queryKey: qk.jobs.archivedKanban(item.application.jobId) });
  queryClient.invalidateQueries({ queryKey: qk.jobs.summary(item.application.jobId) });
}
