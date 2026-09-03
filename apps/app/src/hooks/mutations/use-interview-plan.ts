import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  archiveInterviewPlan,
  createInterviewPlan,
  duplicateInterviewPlan,
  unarchiveInterviewPlan,
  updateInterviewPlan,
} from '@/lib/api/interview-plans';
import type { TemplateBody } from '@/lib/schemas/pipeline';

function invalidateInterviewPlans(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.interviewPlans.root(orgId) });
}

// --- Create ---

interface CreateParams {
  orgId: string;
  body: TemplateBody;
}

export function useCreateInterviewPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateParams) => {
      return createInterviewPlan(params.orgId, params.body);
    },

    onSuccess: (_, variables) => {
      toast.success('Interview plan created');
      invalidateInterviewPlans(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Update ---

interface UpdateParams {
  orgId: string;
  planId: string;
  body: TemplateBody;
}

export function useUpdateInterviewPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateParams) => {
      return updateInterviewPlan(params.orgId, params.planId, params.body);
    },

    onSuccess: (_, variables) => {
      toast.success('Interview plan saved');
      invalidateInterviewPlans(queryClient, variables.orgId);
      queryClient.invalidateQueries({
        queryKey: qk.interviewPlans.detail(variables.orgId, variables.planId),
      });
    },

    onError: showMutationError,
  });
}

// --- Archive ---

interface PlanActionParams {
  orgId: string;
  planId: string;
}

export function useArchiveInterviewPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PlanActionParams) => {
      return archiveInterviewPlan(params.orgId, params.planId);
    },

    onSuccess: (_, variables) => {
      toast.success('Interview plan archived');
      invalidateInterviewPlans(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Unarchive ---

export function useUnarchiveInterviewPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PlanActionParams) => {
      return unarchiveInterviewPlan(params.orgId, params.planId);
    },

    onSuccess: (_, variables) => {
      toast.success('Interview plan restored');
      invalidateInterviewPlans(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}

// --- Duplicate ---

export function useDuplicateInterviewPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PlanActionParams) => {
      return duplicateInterviewPlan(params.orgId, params.planId);
    },

    onSuccess: (result, variables) => {
      toast.success(`Duplicated as "${result.data.name}"`);
      invalidateInterviewPlans(queryClient, variables.orgId);
    },

    onError: showMutationError,
  });
}
