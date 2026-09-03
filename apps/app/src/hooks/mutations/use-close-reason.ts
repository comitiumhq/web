import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import { archiveCloseReason, createCloseReason, restoreCloseReason, updateCloseReason } from '@/lib/api/close-reasons';
import type { CreateCloseReasonBody, UpdateCloseReasonBody } from '@/lib/schemas/close-reasons';

function invalidateReasons(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.settings.closeReasonsListRoot(orgId) });
}

interface CreateParams {
  orgId: string;
  body: CreateCloseReasonBody;
}

export function useCreateCloseReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, body }: CreateParams) => createCloseReason(orgId, body),

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
  body: UpdateCloseReasonBody;
}

export function useUpdateCloseReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id, body }: UpdateParams) => updateCloseReason(orgId, id, body),

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

export function useArchiveCloseReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => archiveCloseReason(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Reason archived');
      invalidateReasons(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useRestoreCloseReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => restoreCloseReason(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Reason restored');
      invalidateReasons(queryClient, orgId);
    },

    onError: showMutationError,
  });
}
