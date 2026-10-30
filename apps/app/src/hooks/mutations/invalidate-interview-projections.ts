import type { QueryClient } from '@tanstack/react-query';
import { invalidateApplicationPipelineStatus } from '@/hooks/mutations/invalidate-application-pipeline-status';
import { qk } from '@/hooks/query-keys';

export function invalidateInterviewProjections(queryClient: QueryClient, applicationId: string) {
  invalidateApplicationPipelineStatus(queryClient, applicationId, null);
  queryClient.invalidateQueries({ queryKey: qk.application.interviewProgress(applicationId) });
  queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
}
