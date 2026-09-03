import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  archiveArchiveReason,
  createArchiveReason,
  restoreArchiveReason,
  updateArchiveReason,
} from '@/lib/api/archive-reasons';
import type { CreateArchiveReasonBody, UpdateArchiveReasonBody } from '@/lib/schemas/archive-reasons';

function invalidateReasons(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.settings.archiveReasonsListRoot(orgId) });
}

interface CreateParams {
  orgId: string;
  body: CreateArchiveReasonBody;
}

export function useCreateArchiveReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, body }: CreateParams) => createArchiveReason(orgId, body),

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
  body: UpdateArchiveReasonBody;
}

export function useUpdateArchiveReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id, body }: UpdateParams) => updateArchiveReason(orgId, id, body),

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

export function useArchiveArchiveReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => archiveArchiveReason(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Reason archived');
      invalidateReasons(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useRestoreArchiveReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => restoreArchiveReason(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Reason restored');
      invalidateReasons(queryClient, orgId);
    },

    onError: showMutationError,
  });
}
