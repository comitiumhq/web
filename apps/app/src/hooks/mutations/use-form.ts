import type { CreateFormBody, UpdateFormBody } from '@comitium/schemas/forms/form-definitions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qk } from '@/hooks/query-keys';
import { archiveForm, createForm, restoreForm, updateForm } from '@/lib/api/form-definitions';

async function invalidateFormCollections(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.settings.formsListRoot(orgId) }),
    queryClient.invalidateQueries({ queryKey: qk.stageActivities.root() }),
    queryClient.invalidateQueries({ queryKey: qk.applicationFormOptions.root() }),
    queryClient.invalidateQueries({ queryKey: qk.templates.interviewFeedbackFormOptions(orgId) }),
  ]);
}

async function invalidateForm(queryClient: ReturnType<typeof useQueryClient>, orgId: string, formId: string) {
  await Promise.all([
    invalidateFormCollections(queryClient, orgId),
    queryClient.invalidateQueries({ queryKey: qk.settings.form(orgId, formId) }),
  ]);
}

export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, body }: { orgId: string; body: CreateFormBody }) => createForm(orgId, body),
    onSuccess: async (_, { orgId }) => invalidateFormCollections(queryClient, orgId),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, formId, body }: { orgId: string; formId: string; body: UpdateFormBody }) =>
      updateForm(orgId, formId, body),
    onSuccess: async (form, { orgId, formId }) => {
      queryClient.setQueryData(qk.settings.form(orgId, formId), form);
      await invalidateFormCollections(queryClient, orgId);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useArchiveForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, formId }: { orgId: string; formId: string }) => archiveForm(orgId, formId),
    onSuccess: async (_, { orgId, formId }) => invalidateForm(queryClient, orgId, formId),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRestoreForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, formId }: { orgId: string; formId: string }) => restoreForm(orgId, formId),
    onSuccess: async (_, { orgId, formId }) => invalidateForm(queryClient, orgId, formId),
    onError: (error: Error) => toast.error(error.message),
  });
}
