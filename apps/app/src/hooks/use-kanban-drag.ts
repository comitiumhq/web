import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useStageChange } from '@/hooks/mutations/use-stage-change';
import { hasApiErrorCode } from '@/lib/api/client';
import type { KanbanResponse, KanbanStage } from '@/lib/schemas/pipeline';

interface UseKanbanDragOptions {
  stages: KanbanStage[];
  jobId: string;
  kanbanQueryKey?: readonly unknown[];
}

export function useKanbanDrag({ stages, jobId, kanbanQueryKey }: UseKanbanDragOptions) {
  const { mutate: changeStage } = useStageChange();
  const queryClient = useQueryClient();

  const handleDragEnd = useCallback(
    (sourceStageId: string, destStageId: string, applicationId: string): boolean => {
      const sourceStage = stages.find((s) => s.id === sourceStageId);
      const destStage = stages.find((s) => s.id === destStageId);
      const application = sourceStage?.applications.find((a) => a.id === applicationId);

      if (!sourceStage || !destStage || !application) {
        return false;
      }

      // Optimistic update
      if (kanbanQueryKey) {
        queryClient.setQueryData(kanbanQueryKey, (old?: KanbanResponse) => {
          if (!old) {
            return old;
          }

          return {
            ...old,
            stages: old.stages.map((stage) => {
              if (stage.id === sourceStageId) {
                return {
                  ...stage,
                  applications: stage.applications.filter((a) => a.id !== applicationId),
                  total: Math.max(0, stage.total - 1),
                };
              }

              if (stage.id === destStageId) {
                return {
                  ...stage,
                  applications: [...stage.applications, { ...application, currentStageId: destStageId }],
                  total: stage.total + 1,
                };
              }

              return stage;
            }),
          };
        });
      }

      changeStage(
        {
          applicationId: application.id,
          stageId: destStage.id,
          expectedStageId: sourceStage.id,
          jobId,
        },
        {
          onSuccess: (data) => {
            toast.success(`Moved to ${data.stage.name}`);
          },
          onError: (error) => {
            if (kanbanQueryKey) {
              queryClient.invalidateQueries({ queryKey: kanbanQueryKey });
            }

            if (hasApiErrorCode(error, API_ERROR_CODES.stageConflict)) {
              toast.error('Stage was changed by another user. Refreshing...');
            } else {
              toast.error('Failed to move candidate');
            }
          },
        },
      );

      return true;
    },
    [stages, jobId, kanbanQueryKey, changeStage, queryClient],
  );

  return { handleDragEnd };
}
