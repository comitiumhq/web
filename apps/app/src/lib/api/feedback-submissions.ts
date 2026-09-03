import { successSchema } from '@comitium/schemas/public';
import {
  type CreateFeedbackSubmissionBody,
  feedbackSubmissionItemResponseSchema,
  feedbackSubmissionListResponseSchema,
  type ResolveFeedbackFormBody,
  resolvedFeedbackFormResponseSchema,
  type UpdateFeedbackSubmissionBody,
} from '@/lib/schemas/feedback-submissions';
import { api } from './client';
import { buildCursorSearchParams, DEFAULT_CURSOR_PAGE_SIZE } from './cursor-pagination';

export function listFeedbackSubmissions(
  applicationId: string,
  limit = DEFAULT_CURSOR_PAGE_SIZE,
  cursor?: string,
  interviewEventId?: string,
) {
  const params = buildCursorSearchParams(limit, cursor);

  if (interviewEventId) {
    params.set('interviewEventId', interviewEventId);
  }

  return api.get(`/applications/${applicationId}/feedback?${params.toString()}`, feedbackSubmissionListResponseSchema);
}

export function getFeedbackSubmission(applicationId: string, submissionId: string) {
  return api.get(`/applications/${applicationId}/feedback/${submissionId}`, feedbackSubmissionItemResponseSchema);
}

export function createFeedbackSubmission(applicationId: string, body: CreateFeedbackSubmissionBody) {
  return api.post(`/applications/${applicationId}/feedback`, body, feedbackSubmissionItemResponseSchema);
}

export function updateFeedbackSubmission(
  applicationId: string,
  submissionId: string,
  body: UpdateFeedbackSubmissionBody,
) {
  return api.patch(
    `/applications/${applicationId}/feedback/${submissionId}`,
    body,
    feedbackSubmissionItemResponseSchema,
  );
}

export function deleteFeedbackSubmission(applicationId: string, submissionId: string) {
  return api.delete(`/applications/${applicationId}/feedback/${submissionId}`, successSchema);
}

export function resolveFeedbackForm(applicationId: string, body: ResolveFeedbackFormBody) {
  return api.post(`/applications/${applicationId}/resolve-feedback-form`, body, resolvedFeedbackFormResponseSchema);
}
