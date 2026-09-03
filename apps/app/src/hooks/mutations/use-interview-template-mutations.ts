import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  archiveInterviewTemplate,
  createInterviewTemplate,
  restoreInterviewTemplate,
  updateInterviewTemplate,
} from '@/lib/api/interview-templates';
import type { CreateInterviewTemplateBody, UpdateInterviewTemplateBody } from '@/lib/schemas/interview-templates';

function invalidateTemplates(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.templates.interviewsRoot(orgId) });
  queryClient.invalidateQueries({ queryKey: qk.stageActivities.root() });
  queryClient.invalidateQueries({ queryKey: qk.settings.formsListRoot(orgId) });
  queryClient.invalidateQueries({ queryKey: qk.settings.formUsageRoot() });
}

// --- Create ---

interface CreateParams {
  orgId: string;
  body: CreateInterviewTemplateBody;
}

export function useCreateInterviewTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateParams) => {
      return createInterviewTemplate(params.orgId, params.body);
    },

    onSuccess: (_, variables) => {
      toast.success('Interview template created');
      invalidateTemplates(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Update ---

interface UpdateParams {
  orgId: string;
  id: string;
  body: UpdateInterviewTemplateBody;
}

export function useUpdateInterviewTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateParams) => {
      return updateInterviewTemplate(params.orgId, params.id, params.body);
    },

    onSuccess: (_, variables) => {
      toast.success('Interview template updated');
      invalidateTemplates(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Archive ---

interface ArchiveParams {
  orgId: string;
  id: string;
}

export function useArchiveInterviewTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ArchiveParams) => {
      return archiveInterviewTemplate(params.orgId, params.id);
    },

    onSuccess: (_, variables) => {
      toast.success('Interview template archived');
      invalidateTemplates(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Restore ---

export function useRestoreInterviewTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ArchiveParams) => {
      return restoreInterviewTemplate(params.orgId, params.id);
    },

    onSuccess: (_, variables) => {
      toast.success('Interview template restored');
      invalidateTemplates(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}
