import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateApplicationPipelineStatus } from '@/hooks/mutations/invalidate-application-pipeline-status';
import { qk } from '@/hooks/query-keys';
import { changeStage } from '@/lib/api/applications-actions';

export interface StageChangeParams {
  applicationId: string;
  stageId: string;
  expectedStageId: string;
  jobId: string;
}

export function useStageChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: StageChangeParams) => {
      return changeStage(params.applicationId, params.stageId, params.expectedStageId);
    },

    onSuccess: (_, variables) => {
      invalidateApplicationPipelineStatus(queryClient, variables.applicationId, variables.jobId);
      queryClient.invalidateQueries({ queryKey: qk.application.feedbackSubmissions(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: qk.application.interviewProgress(variables.applicationId) });
      queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
      queryClient.invalidateQueries({ queryKey: qk.stageActivities.root() });
    },
  });
}
