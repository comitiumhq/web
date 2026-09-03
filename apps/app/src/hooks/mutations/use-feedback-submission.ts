import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { invalidateApplicationPipelineStatus } from '@/hooks/mutations/invalidate-application-pipeline-status';
import { qk } from '@/hooks/query-keys';
import {
  createFeedbackSubmission,
  deleteFeedbackSubmission,
  resolveFeedbackForm,
  updateFeedbackSubmission,
} from '@/lib/api/feedback-submissions';
import type {
  CreateFeedbackSubmissionBody,
  ResolveFeedbackFormBody,
  UpdateFeedbackSubmissionBody,
} from '@/lib/schemas/feedback-submissions';

function invalidate(queryClient: ReturnType<typeof useQueryClient>, applicationId: string) {
  invalidateApplicationPipelineStatus(queryClient, applicationId, null);
  queryClient.invalidateQueries({ queryKey: qk.application.feedbackSubmissions(applicationId) });
  queryClient.invalidateQueries({ queryKey: qk.application.interviewProgress(applicationId) });
  queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
}

function onError(error: Error) {
  toast.error(error.message);
}

interface CreateParams {
  applicationId: string;
  body: CreateFeedbackSubmissionBody;
}

export function useCreateFeedbackSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateParams) => createFeedbackSubmission(params.applicationId, params.body),
    onSuccess: (_, variables) => {
      toast.success('Feedback submitted');
      invalidate(queryClient, variables.applicationId);
    },
    onError,
  });
}

interface UpdateParams {
  applicationId: string;
  submissionId: string;
  body: UpdateFeedbackSubmissionBody;
}

export function useUpdateFeedbackSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateParams) =>
      updateFeedbackSubmission(params.applicationId, params.submissionId, params.body),
    onSuccess: (_, variables) => {
      toast.success('Feedback updated');
      invalidate(queryClient, variables.applicationId);
    },
    onError,
  });
}

interface DeleteParams {
  applicationId: string;
  submissionId: string;
}

export function useDeleteFeedbackSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DeleteParams) => deleteFeedbackSubmission(params.applicationId, params.submissionId),
    onSuccess: (_, variables) => {
      toast.success('Feedback deleted');
      invalidate(queryClient, variables.applicationId);
    },
    onError,
  });
}

interface ResolveParams {
  applicationId: string;
  body: ResolveFeedbackFormBody;
}

// On-demand fetch of the form to render. Mutation shape — input drives the call, no caching.
export function useResolveFeedbackForm() {
  return useMutation({
    mutationFn: (params: ResolveParams) => resolveFeedbackForm(params.applicationId, params.body),
    onError,
  });
}
