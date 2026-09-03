import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  archiveCancelRescheduleReason,
  createCancelRescheduleReason,
  restoreCancelRescheduleReason,
  updateCancelRescheduleReason,
} from '@/lib/api/cancel-reschedule-reasons';
import type { CreateReasonBody, UpdateReasonBody } from '@/lib/schemas/cancel-reschedule-reasons';

function invalidateReasons(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.settings.cancelRescheduleReasonsRoot(orgId) });
}

interface CreateParams {
  orgId: string;
  body: CreateReasonBody;
}

export function useCreateCancelRescheduleReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, body }: CreateParams) => createCancelRescheduleReason(orgId, body),

    onSuccess: (_, { orgId }) => {
      toast.success('Reason created');
      invalidateReasons(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

interface UpdateParams {
  orgId: string;
  id: string;
  body: UpdateReasonBody;
}

export function useUpdateCancelRescheduleReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id, body }: UpdateParams) => updateCancelRescheduleReason(orgId, id, body),

    onSuccess: (_, { orgId }) => {
      toast.success('Reason updated');
      invalidateReasons(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

interface IdParams {
  orgId: string;
  id: string;
}

export function useArchiveCancelRescheduleReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => archiveCancelRescheduleReason(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Reason archived');
      invalidateReasons(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useRestoreCancelRescheduleReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => restoreCancelRescheduleReason(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Reason restored');
      invalidateReasons(queryClient, orgId);
    },

    onError: showMutationError,
  });
}
