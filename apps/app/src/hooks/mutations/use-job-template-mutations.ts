import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateSettingsUsage } from '@/hooks/mutations/invalidate-settings-usage';
import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import { hasApiErrorCode } from '@/lib/api/client';
import {
  activateJobTemplate,
  archiveJobTemplate,
  createDraftFromTemplate,
  createJobTemplate,
  deactivateJobTemplate,
  restoreJobTemplate,
  updateJobTemplate,
} from '@/lib/api/job-templates';
import type {
  CreateDraftFromTemplateBody,
  CreateJobTemplateBody,
  UpdateJobTemplateBody,
} from '@/lib/schemas/job-templates';

const CALLER_HANDLED_CODES = [API_ERROR_CODES.templateNotActive] as const;

function invalidateTemplates(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.templates.jobsRoot(orgId) });
  invalidateSettingsUsage(queryClient);
}

function onMutationError(error: Error) {
  if (hasApiErrorCode(error, CALLER_HANDLED_CODES)) {
    return;
  }

  showMutationError(error);
}

interface OrgScopedParams {
  orgId: string;
}

interface TemplateScopedParams extends OrgScopedParams {
  templateId: string;
}

interface CreateDraftFromTemplateParams extends TemplateScopedParams {
  body: CreateDraftFromTemplateBody;
}

interface CreateBlankParams extends OrgScopedParams {
  body: CreateJobTemplateBody;
}

export function useCreateJobTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateBlankParams) => createJobTemplate(params.orgId, params.body),
    onSuccess: (_, variables) => {
      toast.success('Job template created');
      invalidateTemplates(queryClient, variables.orgId);
      queryClient.invalidateQueries({ queryKey: qk.interviewPlans.root(variables.orgId) });
    },
    onError: onMutationError,
  });
}

interface UpdateParams extends TemplateScopedParams {
  body: UpdateJobTemplateBody;
}

export function useUpdateJobTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateParams) => updateJobTemplate(params.orgId, params.templateId, params.body),
    onSuccess: (_, variables) => {
      toast.success('Job template updated');
      invalidateTemplates(queryClient, variables.orgId);

      if ('interviewPlanId' in variables.body) {
        queryClient.invalidateQueries({ queryKey: qk.stageActivities.root() });
        queryClient.invalidateQueries({ queryKey: qk.interviewPlans.root(variables.orgId) });
      }
    },
    onError: onMutationError,
  });
}

export function useActivateJobTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TemplateScopedParams) => activateJobTemplate(params.orgId, params.templateId),
    onSuccess: (_, variables) => {
      toast.success('Job template activated');
      invalidateTemplates(queryClient, variables.orgId);
    },
    onError: onMutationError,
  });
}

export function useDeactivateJobTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TemplateScopedParams) => deactivateJobTemplate(params.orgId, params.templateId),
    onSuccess: (_, variables) => {
      toast.success('Job template deactivated');
      invalidateTemplates(queryClient, variables.orgId);
    },
    onError: onMutationError,
  });
}

export function useArchiveJobTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TemplateScopedParams) => archiveJobTemplate(params.orgId, params.templateId),
    onSuccess: (_, variables) => {
      toast.success('Job template archived');
      invalidateTemplates(queryClient, variables.orgId);
    },
    onError: onMutationError,
  });
}

export function useRestoreJobTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TemplateScopedParams) => restoreJobTemplate(params.orgId, params.templateId),
    onSuccess: (_, variables) => {
      toast.success('Job template restored');
      invalidateTemplates(queryClient, variables.orgId);
    },
    onError: onMutationError,
  });
}

export function useCreateDraftFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateDraftFromTemplateParams) =>
      createDraftFromTemplate(params.orgId, params.templateId, params.body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.jobs.draftsOrg(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: qk.interviewPlans.root(variables.orgId) });
      invalidateSettingsUsage(queryClient);
    },
    onError: onMutationError,
  });
}
