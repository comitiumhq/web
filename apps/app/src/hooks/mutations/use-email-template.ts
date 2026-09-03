import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  archiveEmailTemplate,
  createEmailTemplate,
  restoreEmailTemplate,
  updateEmailTemplate,
} from '@/lib/api/email-templates';
import type { EmailTemplateBody, EmailTemplateUpdateBody } from '@/lib/schemas/emails';

function invalidateAllTemplates(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.templates.emailRoot(orgId) });
  queryClient.invalidateQueries({ queryKey: qk.stageActivities.root() });
}

// --- Create ---

interface CreateParams {
  orgId: string;
  body: EmailTemplateBody;
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateParams) => {
      return createEmailTemplate(params.orgId, params.body);
    },

    onSuccess: (_, variables) => {
      toast.success('Template created');
      invalidateAllTemplates(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Update ---

interface UpdateParams {
  orgId: string;
  templateId: string;
  body: EmailTemplateUpdateBody;
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateParams) => {
      return updateEmailTemplate(params.orgId, params.templateId, params.body);
    },

    onSuccess: (_, variables) => {
      toast.success('Template saved');
      invalidateAllTemplates(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Archive ---

interface TemplateActionParams {
  orgId: string;
  templateId: string;
}

export function useArchiveEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TemplateActionParams) => {
      return archiveEmailTemplate(params.orgId, params.templateId);
    },

    onSuccess: (_, variables) => {
      toast.success('Template archived');
      invalidateAllTemplates(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Restore ---

export function useRestoreEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TemplateActionParams) => {
      return restoreEmailTemplate(params.orgId, params.templateId);
    },

    onSuccess: (_, variables) => {
      toast.success('Template restored');
      invalidateAllTemplates(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}
