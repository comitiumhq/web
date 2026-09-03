import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import type { ApplicationApiResponse } from '@comitium/schemas/applications';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useStageChange } from '@/hooks/mutations/use-stage-change';
import { hasApiErrorCode } from '@/lib/api/client';
import type { InterviewStageBase } from '@/lib/schemas/pipeline';

export function useStageActions(
  application: ApplicationApiResponse | null,
  resolvedStages: InterviewStageBase[] | undefined,
  jobId: string,
) {
  const { mutate: changeStage, isPending: isChangingStage } = useStageChange();

  const currentStage = application ? (resolvedStages?.find((s) => s.id === application.currentStageId) ?? null) : null;

  const handleStageChange = useCallback(
    (targetStageId: string) => {
      if (!application?.currentStageId || targetStageId === application.currentStageId) {
        return;
      }

      changeStage(
        {
          applicationId: application.id,
          stageId: targetStageId,
          expectedStageId: application.currentStageId,
          jobId,
        },
        {
          onSuccess: (data) => {
            toast.success(`Moved to ${data.stage.name}`);
          },
          onError: (error) => {
            if (hasApiErrorCode(error, API_ERROR_CODES.stageConflict)) {
              toast.error('Stage was changed by another user. Please refresh.');
            } else {
              toast.error('Failed to change stage');
            }
          },
        },
      );
    },
    [application, changeStage, jobId],
  );

  return {
    currentStage,
    isChangingStage,
    handleStageChange,
  };
}
