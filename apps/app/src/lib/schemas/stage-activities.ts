import { formOptionSchema } from '@comitium/schemas/forms/form-definitions';
import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import type { StageType } from './stages';

export type ActivityType = 'schedule_interview' | 'send_email' | 'application_review';

export const ALLOWED_ACTIVITIES_BY_STAGE_TYPE: Record<StageType, readonly ActivityType[]> = {
  lead: ['send_email'],
  review: ['application_review', 'send_email'],
  active: ['application_review', 'schedule_interview', 'send_email'],
  offer: ['send_email'],
  hired: [],
} as const;

const interviewerRoleSchema = z.enum(['interviewer', 'shadow', 'lead']);

const defaultInterviewerSchema = z.object({
  userId: uuidSchema,
  role: interviewerRoleSchema,
});

export type DefaultInterviewer = z.infer<typeof defaultInterviewerSchema>;

const activityMemberIdentitySchema = z.object({
  userId: uuidSchema,
  name: z.string().nullable(),
  email: z.string().nullable(),
  isActive: z.boolean(),
});

const defaultInterviewerResponseSchema = activityMemberIdentitySchema.extend({
  role: interviewerRoleSchema,
});

const scheduleInterviewActivitySchema = z.object({
  id: uuidSchema,
  stageId: uuidSchema,
  activityType: z.literal('schedule_interview'),
  activityOrder: z.number(),
  interviewId: uuidSchema,
  interviewTitle: z.string(),
  durationMinutes: z.number(),
  defaultInterviewers: z.array(defaultInterviewerResponseSchema).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const sendEmailActivitySchema = z.object({
  id: uuidSchema,
  stageId: uuidSchema,
  activityType: z.literal('send_email'),
  activityOrder: z.number(),
  emailTemplateId: uuidSchema,
  emailTemplateName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const applicationReviewActivitySchema = z.object({
  id: uuidSchema,
  stageId: uuidSchema,
  activityType: z.literal('application_review'),
  activityOrder: z.number(),
  reviewers: z.array(activityMemberIdentitySchema),
  feedbackFormId: uuidSchema.nullable(),
  feedbackFormTitle: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const stageActivitySchema = z.discriminatedUnion('activityType', [
  scheduleInterviewActivitySchema,
  sendEmailActivitySchema,
  applicationReviewActivitySchema,
]);

export type StageActivity = z.infer<typeof stageActivitySchema>;

export type StageActivityOwner =
  | { kind: 'job'; jobId: string }
  | { kind: 'jobTemplate'; orgId: string; templateId: string };

const activityInterviewTemplateOptionSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  durationMinutes: z.number(),
});

const activityEmailTemplateOptionSchema = z.object({
  id: uuidSchema,
  name: z.string(),
});

const activityMemberOptionSchema = z.object({
  userId: uuidSchema,
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export type ActivityInterviewTemplateOption = z.infer<typeof activityInterviewTemplateOptionSchema>;
export type ActivityEmailTemplateOption = z.infer<typeof activityEmailTemplateOptionSchema>;
export type ActivityFeedbackFormOption = z.infer<typeof formOptionSchema>;
export type ActivityMemberOption = z.infer<typeof activityMemberOptionSchema>;

export const activityOptionsSchema = z.object({
  data: z.object({
    interviewTemplates: z.array(activityInterviewTemplateOptionSchema),
    emailTemplates: z.array(activityEmailTemplateOptionSchema),
    feedbackForms: z.array(formOptionSchema),
    members: z.array(activityMemberOptionSchema),
  }),
});

export type ScheduleInterviewActivity = z.infer<typeof scheduleInterviewActivitySchema>;
export type SendEmailActivity = z.infer<typeof sendEmailActivitySchema>;
export type ApplicationReviewActivity = z.infer<typeof applicationReviewActivitySchema>;

export const stageActivitiesListSchema = z.object({
  data: z.array(stageActivitySchema),
});

export const stageActivityResponseSchema = z.object({
  data: stageActivitySchema,
});

// --- Request body schemas ---

interface ScheduleInterviewCreateBody {
  activityType: 'schedule_interview';
  interviewId: string;
  activityOrder?: number;
  defaultInterviewers?: { userId: string; role: 'interviewer' | 'shadow' | 'lead' }[] | null;
}

interface SendEmailCreateBody {
  activityType: 'send_email';
  emailTemplateId: string;
}

interface ApplicationReviewCreateBody {
  activityType: 'application_review';
  reviewers: { userId: string }[];
  feedbackFormId?: string | null;
}

export type CreateStageActivityBody = ScheduleInterviewCreateBody | SendEmailCreateBody | ApplicationReviewCreateBody;

interface ScheduleInterviewUpdateBody {
  activityType: 'schedule_interview';
  interviewId?: string;
  defaultInterviewers?: { userId: string; role: 'interviewer' | 'shadow' | 'lead' }[] | null;
}

interface SendEmailUpdateBody {
  activityType: 'send_email';
  emailTemplateId?: string;
}

interface ApplicationReviewUpdateBody {
  activityType: 'application_review';
  reviewers?: { userId: string }[];
  feedbackFormId?: string | null;
}

export type UpdateStageActivityBody = ScheduleInterviewUpdateBody | SendEmailUpdateBody | ApplicationReviewUpdateBody;

// --- Job plan update ---
