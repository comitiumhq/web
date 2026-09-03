import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { invalidateAllApplicationPipelineStatuses } from '@/hooks/mutations/invalidate-application-pipeline-status';
import { invalidateSettingsUsage } from '@/hooks/mutations/invalidate-settings-usage';
import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  createOwnerActivity,
  deleteOwnerActivity,
  reorderOwnerActivities,
  updateOwnerActivity,
} from '@/lib/api/stage-activities';
import type {
  CreateStageActivityBody,
  StageActivityOwner,
  UpdateStageActivityBody,
} from '@/lib/schemas/stage-activities';

function invalidateActivities(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: qk.stageActivities.root() });
}

function invalidateActivityStatus(queryClient: ReturnType<typeof useQueryClient>) {
  invalidateActivities(queryClient);
  invalidateSettingsUsage(queryClient);
  invalidateAllApplicationPipelineStatuses(queryClient);
}

interface CreateOwnerParams {
  owner: StageActivityOwner;
  stageId: string;
  body: CreateStageActivityBody;
}

export function useCreateOwnerActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateOwnerParams) => createOwnerActivity(params.owner, params.stageId, params.body),
    onSuccess: () => {
      toast.success('Activity added');
      invalidateActivityStatus(queryClient);
    },
    onError: showMutationError,
  });
}

interface UpdateOwnerParams {
  owner: StageActivityOwner;
  activityId: string;
  body: UpdateStageActivityBody;
}

export function useUpdateOwnerActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateOwnerParams) => updateOwnerActivity(params.owner, params.activityId, params.body),
    onSuccess: () => {
      invalidateActivityStatus(queryClient);
    },
    onError: showMutationError,
  });
}

interface DeleteOwnerParams {
  owner: StageActivityOwner;
  activityId: string;
}

export function useDeleteOwnerActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DeleteOwnerParams) => deleteOwnerActivity(params.owner, params.activityId),
    onSuccess: () => {
      toast.success('Activity removed');
      invalidateActivityStatus(queryClient);
    },
    onError: showMutationError,
  });
}

interface ReorderOwnerParams {
  owner: StageActivityOwner;
  stageId: string;
  activityIds: string[];
}

export function useReorderOwnerActivities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ReorderOwnerParams) =>
      reorderOwnerActivities(params.owner, params.stageId, params.activityIds),
    onSuccess: () => {
      invalidateActivities(queryClient);
    },
    onError: showMutationError,
  });
}
