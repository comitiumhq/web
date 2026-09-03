import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  archiveCustomField,
  createCustomField,
  reorderCustomFields,
  restoreCustomField,
  updateCustomField,
} from '@/lib/api/custom-fields';
import type {
  CreateCustomFieldBody,
  ReorderCustomFieldsBody,
  UpdateCustomFieldBody,
} from '@/lib/schemas/custom-fields';

function invalidate(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.settings.customFieldsListRoot(orgId) });
}

interface CreateParams {
  orgId: string;
  body: CreateCustomFieldBody;
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, body }: CreateParams) => createCustomField(orgId, body),

    onSuccess: (_, { orgId }) => {
      toast.success('Custom field created');
      invalidate(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

interface UpdateParams {
  orgId: string;
  id: string;
  body: UpdateCustomFieldBody;
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id, body }: UpdateParams) => updateCustomField(orgId, id, body),

    onSuccess: (_, { orgId }) => {
      toast.success('Custom field updated');
      invalidate(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

interface IdParams {
  orgId: string;
  id: string;
}

export function useArchiveCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => archiveCustomField(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Custom field archived');
      invalidate(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useRestoreCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => restoreCustomField(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Custom field restored');
      invalidate(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

interface ReorderParams {
  orgId: string;
  body: ReorderCustomFieldsBody;
}

export function useReorderCustomFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, body }: ReorderParams) => reorderCustomFields(orgId, body),

    onSettled: (_data, _error, { orgId }) => {
      invalidate(queryClient, orgId);
    },

    onError: showMutationError,
  });
}
