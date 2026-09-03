import { type EncryptedEnvelope, encryptedEnvelopeSchema } from '@comitium/schemas/common';
import { formSubmissionResponseSchema } from '@comitium/schemas/forms/form-submission';
import { InterviewStatus, interviewStatusEnum } from '@comitium/schemas/interview-status';
import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import type { EmailDeliveryGrantSubmission } from './emails';
import { interviewTemplateInstructionsFieldSchema } from './interview-templates';
import { stageTypeSchema } from './stages';

export { InterviewStatus, type InterviewStatusValue, interviewStatusEnum } from '@comitium/schemas/interview-status';

const ScheduleMode = {
  MANUAL: 'manual',
} as const;

type ScheduleModeValue = (typeof ScheduleMode)[keyof typeof ScheduleMode];

const interviewBusyWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
  source: z.string().optional(),
  title: z.string().nullable().optional(),
});

const interviewerAvailabilityReasonSchema = z.enum(['calendar_not_connected', 'provider_unavailable']);

const availableInterviewerSchema = z.object({
  userId: uuidSchema,
  status: z.literal('available'),
  scheduleTimeZone: z.string(),
  workingRanges: z.array(interviewBusyWindowSchema),
  busyTimes: z.array(interviewBusyWindowSchema),
});

const unavailableInterviewerSchema = z.object({
  userId: uuidSchema,
  status: z.literal('unavailable'),
  reason: interviewerAvailabilityReasonSchema,
});

const interviewerBusySchema = z.discriminatedUnion('status', [
  availableInterviewerSchema,
  unavailableInterviewerSchema,
]);

export type InterviewerBusy = z.infer<typeof interviewerBusySchema>;

export const interviewBusyResponseSchema = z.object({
  data: z.object({
    interviewers: z.array(interviewerBusySchema),
  }),
});

const getInterviewBusyBodySchema = z.object({
  interviewerUserIds: z.array(uuidSchema).min(1),
  startTime: z.string(),
  endTime: z.string(),
  timeZone: z.string(),
});

export type GetInterviewBusyBody = z.infer<typeof getInterviewBusyBodySchema>;

const rsvpStatusSchema = z.enum(['accepted', 'declined', 'tentative', 'awaiting']).nullable();

export type RsvpStatus = z.infer<typeof rsvpStatusSchema>;

export const interviewRsvpResponseSchema = z.object({
  data: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('available'),
      interviewers: z.array(
        z.object({
          userId: uuidSchema,
          status: rsvpStatusSchema,
        }),
      ),
      candidate: z.object({ status: rsvpStatusSchema }).nullable(),
    }),
    z.object({ status: z.literal('unavailable') }),
  ]),
});

// --- API response schemas ---

const interviewerSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['interviewer', 'shadow', 'lead']),
  isRequired: z.boolean(),
});

// Event within a schedule — holds actual booking data
const interviewEventSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  interviewId: uuidSchema.nullable(),
  eventOrder: z.number(),
  scheduledAt: z.string().nullable(),
  durationMinutes: z.number(),
  meetingUrl: z.string().nullable(),
  location: z.string().nullable(),
  status: interviewStatusEnum,
  confirmedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  noShowAt: z.string().nullable(),
  interviewers: z.array(interviewerSchema),
});

export type InterviewEvent = z.infer<typeof interviewEventSchema>;

// Schedule — container grouping events for a candidate on a stage
const interviewScheduleSchema = z.object({
  id: uuidSchema,
  stageId: uuidSchema.nullable(),
  status: interviewStatusEnum,
  availabilityRequestedAt: z.string().nullable(),
  createdAt: z.string(),
  events: z.array(interviewEventSchema),
});

export type InterviewSchedule = z.infer<typeof interviewScheduleSchema>;

export const interviewsListSchema = z.object({
  data: z.array(interviewScheduleSchema),
  total: z.number().int().nonnegative(),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type InterviewsList = z.infer<typeof interviewsListSchema>;

const interviewFeedbackStatusSchema = z.enum(['submitted', 'pending', 'not_due', 'not_required']);

const interviewProgressInterviewerSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['interviewer', 'shadow', 'lead']),
  isRequired: z.boolean(),
  rsvpStatus: rsvpStatusSchema,
  feedbackStatus: interviewFeedbackStatusSchema,
  feedbackSubmittedAt: z.string().nullable(),
});

const interviewProgressEventSchema = z.object({
  id: uuidSchema,
  scheduleId: uuidSchema,
  title: z.string(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().positive(),
  location: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  status: interviewStatusEnum,
  interviewers: z.array(interviewProgressInterviewerSchema),
});

const interviewProgressStageVisitSchema = z.object({
  id: uuidSchema,
  stageId: uuidSchema.nullable(),
  stageName: z.string(),
  stageType: stageTypeSchema,
  stageGroupId: uuidSchema.nullable(),
  stageGroupName: z.string().nullable(),
  enteredAt: z.string(),
  leftAt: z.string().nullable(),
  durationSeconds: z.number().nonnegative(),
  isCurrent: z.boolean(),
  interviews: z.array(interviewProgressEventSchema),
});

export const interviewProgressResponseSchema = z.object({
  data: z.array(interviewProgressStageVisitSchema),
});

export type InterviewProgressInterviewer = z.infer<typeof interviewProgressInterviewerSchema>;
export type InterviewProgressEvent = z.infer<typeof interviewProgressEventSchema>;
export type InterviewProgressStageVisit = z.infer<typeof interviewProgressStageVisitSchema>;
export type InterviewProgressResponse = z.infer<typeof interviewProgressResponseSchema>;

// --- Create response ---

const createInterviewerSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['interviewer', 'shadow', 'lead']),
});

export const createInterviewResponseSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  status: interviewStatusEnum,
  title: z.string(),
  durationMinutes: z.number(),
  scheduledAt: z.string().nullable(),
  interviewers: z.array(createInterviewerSchema),
});

export const createDirectBookingLinkResponseSchema = z.object({
  data: z.object({
    scheduleId: uuidSchema,
    eventId: uuidSchema,
    status: z.literal(InterviewStatus.NEEDS_SCHEDULING),
    url: z.url(),
    expiresAt: z.string(),
  }),
});

export type CreateDirectBookingLinkResponse = z.infer<typeof createDirectBookingLinkResponseSchema>;

export const sendDirectBookingLinkResponseSchema = z.object({
  status: z.literal('accepted'),
});

export interface SendDirectBookingLinkBody {
  content: EncryptedEnvelope;
  deliveryGrant: EmailDeliveryGrantSubmission;
  emailTemplateId?: string;
}

// --- Request bodies ---

const interviewerInputSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['interviewer', 'shadow', 'lead']).default('interviewer'),
});

const scheduleInterviewBodySchema = z.object({
  interviewId: uuidSchema,
  interviewers: z.array(interviewerInputSchema).min(1),
  durationMinutes: z.number().int().min(15).max(180).optional(),
  mode: z.enum(Object.values(ScheduleMode) as [ScheduleModeValue, ...ScheduleModeValue[]]),
  scheduledAt: z.string(),
  stageId: uuidSchema,
  candidateEmail: z.email(),
  timeZone: z.string(),
  availabilityOverride: z.boolean().optional(),
});

export type ScheduleInterviewBody = z.infer<typeof scheduleInterviewBodySchema>;

const createDirectBookingLinkBodySchema = z.object({
  interviewId: uuidSchema,
  interviewers: z.array(interviewerInputSchema).min(1),
  durationMinutes: z.number().int().min(15).max(180).optional(),
  stageId: uuidSchema,
  candidateEmail: z.email(),
  timeZone: z.string(),
});

export type CreateDirectBookingLinkBody = z.infer<typeof createDirectBookingLinkBodySchema>;

const cancelInterviewBodySchema = z.object({
  reasonId: uuidSchema.optional(),
  note: z.string().max(1000).optional(),
});

export type CancelInterviewBody = z.infer<typeof cancelInterviewBodySchema>;

const rescheduleInterviewBodySchema = z.object({
  scheduledAt: z.string(),
  timeZone: z.string(),
  availabilityOverride: z.boolean().optional(),
  reasonId: uuidSchema.optional(),
  note: z.string().max(1000).optional(),
});

export type RescheduleInterviewBody = z.infer<typeof rescheduleInterviewBodySchema>;

// --- Cal token & calendar status ---

export const calTokenSchema = z.object({
  accessToken: z.string(),
  refreshUrl: z.string(),
  calApiUrl: z.string(),
  calApiVersion: z.string(),
  calClientId: z.string(),
  calUserId: z.number(),
});

export const calendarStatusSchema = z.object({
  hasCalUser: z.boolean(),
  calendarConnected: z.boolean(),
  calendarProvider: z.string().nullable(),
  calendarAccountEmail: z.string().nullable(),
  conferencingReady: z.boolean(),
  defaultConferencingApp: z.string().nullable(),
});

export type CalendarStatus = z.infer<typeof calendarStatusSchema>;

export const calConnectResponseSchema = z.object({
  connected: z.boolean(),
  provider: z.string().nullable(),
  conferencingReady: z.boolean(),
});

// --- My interviews (interviewer view) ---

const myInterviewSchema = z.object({
  applicationId: uuidSchema,
  scheduleId: uuidSchema,
  eventId: uuidSchema,
  title: z.string(),
  status: interviewStatusEnum,
  scheduledAt: z.string().nullable(),
  durationMinutes: z.number(),
  location: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  createdAt: z.string(),
  jobTitle: z.string(),
});

export type MyInterview = z.infer<typeof myInterviewSchema>;

export const myInterviewsListSchema = z.object({
  data: z.array(myInterviewSchema),
});

export const interviewBriefingResponseSchema = z.object({
  data: z.object({
    applicationId: uuidSchema,
    candidateProfileInput: encryptedEnvelopeSchema
      .refine((envelope) => envelope.purpose === 'candidate_profile_input', 'Expected candidate profile input envelope')
      .nullable(),
    jobTitle: z.string(),
    interview: z.object({
      eventId: uuidSchema,
      title: z.string(),
      instructions: interviewTemplateInstructionsFieldSchema.nullable(),
      status: interviewStatusEnum,
      scheduledAt: z.string().nullable(),
      durationMinutes: z.number().int().positive(),
      location: z.string().nullable(),
      meetingUrl: z.string().nullable(),
    }),
    interviewers: z.array(
      z.object({
        userId: uuidSchema,
        name: z.string().nullable(),
        role: z.enum(['interviewer', 'shadow', 'lead']),
      }),
    ),
    applicationSubmission: formSubmissionResponseSchema,
    hasResume: z.boolean(),
    resumeFileId: uuidSchema.nullable(),
  }),
});

export type InterviewBriefing = z.infer<typeof interviewBriefingResponseSchema>['data'];
