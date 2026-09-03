import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateApplicationPipelineStatus } from '@/hooks/mutations/invalidate-application-pipeline-status';
import { qk } from '@/hooks/query-keys';
import { hasApiErrorCode } from '@/lib/api/client';
import {
  cancelInterview,
  completeInterview,
  createDirectBookingLink,
  markInterviewNoShow,
  rescheduleInterview,
  scheduleInterview,
  sendDirectBookingLink,
} from '@/lib/api/interviews';
import type {
  CancelInterviewBody,
  CreateDirectBookingLinkBody,
  RescheduleInterviewBody,
  ScheduleInterviewBody,
  SendDirectBookingLinkBody,
} from '@/lib/schemas/interviews';

function invalidateInterviewCaches(queryClient: ReturnType<typeof useQueryClient>, applicationId: string) {
  invalidateApplicationPipelineStatus(queryClient, applicationId, null);
  queryClient.invalidateQueries({ queryKey: qk.application.interviews(applicationId) });
  queryClient.invalidateQueries({ queryKey: qk.application.interviewProgress(applicationId) });
  queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
}

// --- Schedule ---

interface ScheduleInterviewParams {
  applicationId: string;
  body: ScheduleInterviewBody;
}

export function useScheduleInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, body }: ScheduleInterviewParams) => scheduleInterview(applicationId, body),

    onSuccess: (result, { applicationId }) => {
      const message = result.status === 'scheduled' ? 'Interview scheduled' : 'Interview scheduling started';

      toast.success(message);
      invalidateInterviewCaches(queryClient, applicationId);
    },

    onError: (error: Error) => {
      if (hasApiErrorCode(error, API_ERROR_CODES.availabilityConflict)) {
        return;
      }

      toast.error(error.message);
    },
  });
}

// --- Direct Booking Link ---

interface CreateDirectBookingLinkParams {
  applicationId: string;
  body: CreateDirectBookingLinkBody;
}

export function useCreateDirectBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, body }: CreateDirectBookingLinkParams) =>
      createDirectBookingLink(applicationId, body),

    onSuccess: (_, { applicationId }) => {
      invalidateInterviewCaches(queryClient, applicationId);
    },

    onError: (error: Error) => {
      if (hasApiErrorCode(error, API_ERROR_CODES.availabilityConflict)) {
        return;
      }

      toast.error(error.message);
    },
  });
}

interface SendDirectBookingLinkParams {
  applicationId: string;
  scheduleId: string;
  body: SendDirectBookingLinkBody;
}

export function useSendDirectBookingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, scheduleId, body }: SendDirectBookingLinkParams) =>
      sendDirectBookingLink(applicationId, scheduleId, body),

    onSuccess: (_, { applicationId }) => {
      toast.success('Scheduling link is being sent');
      invalidateInterviewCaches(queryClient, applicationId);
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// --- Reschedule ---

interface RescheduleInterviewParams {
  applicationId: string;
  interviewId: string;
  body: RescheduleInterviewBody;
}

export function useRescheduleInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, interviewId, body }: RescheduleInterviewParams) =>
      rescheduleInterview(applicationId, interviewId, body),

    onSuccess: (_, { applicationId }) => {
      toast.success('Interview rescheduled');
      invalidateInterviewCaches(queryClient, applicationId);
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// --- Cancel ---

interface CancelInterviewParams {
  applicationId: string;
  interviewId: string;
  body?: CancelInterviewBody;
}

export function useCancelInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, interviewId, body }: CancelInterviewParams) =>
      cancelInterview(applicationId, interviewId, body),

    onSuccess: (_, { applicationId }) => {
      toast.success('Interview cancelled');
      invalidateInterviewCaches(queryClient, applicationId);
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// --- Complete ---

interface InterviewActionParams {
  applicationId: string;
  interviewId: string;
}

export function useCompleteInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, interviewId }: InterviewActionParams) =>
      completeInterview(applicationId, interviewId),

    onSuccess: (_, { applicationId }) => {
      toast.success('Interview marked as completed');
      invalidateInterviewCaches(queryClient, applicationId);
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// --- No-show ---

export function useMarkInterviewNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, interviewId }: InterviewActionParams) =>
      markInterviewNoShow(applicationId, interviewId),

    onSuccess: (_, { applicationId }) => {
      toast.success('Interview marked as no-show');
      invalidateInterviewCaches(queryClient, applicationId);
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
