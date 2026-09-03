import type { EnvelopeKey } from '@comitium/crypto';
import { encryptedEnvelopeSchema, type TipTapDoc, tipTapDocSchema } from '@comitium/schemas/common';
import { paginationSchema, uuidSchema, walletAddressSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import { archiveReasonTypeSchema } from '@/lib/schemas/archive-reasons';
import { stageTypeSchema } from './stages';

// --- Email response ---

const senderRoleSchema = z.enum(['applicant', 'org_member']);

const emailResponseSchema = z.object({
  id: z.string(),
  senderRole: senderRoleSchema,
  senderName: z.string().nullable(),
  content: encryptedEnvelopeSchema,
  createdAt: z.string(),
});

export type EmailResponse = z.infer<typeof emailResponseSchema>;

export const emailListResponseSchema = z.object({
  data: z.array(emailResponseSchema),
  pagination: paginationSchema,
});

export type EmailListResponse = z.infer<typeof emailListResponseSchema>;

// --- Email templates ---

export const emailTemplateUseCaseSchema = z.enum([
  'general',
  'application_confirmation',
  'referral_confirmation',
  'rejection',
  'application_hired',
  'application_withdrew',
  'application_unresponsive',
  'application_transferred',
  'application_outcome_corrected',
  'interview_confirmation',
]);

export type EmailTemplateUseCase = z.infer<typeof emailTemplateUseCaseSchema>;

export const emailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  body: tipTapDocSchema,
  useCase: emailTemplateUseCaseSchema,
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const emailTemplateListItemSchema = emailTemplateSchema.extend({
  jobCount: z.number().int().nonnegative(),
  jobTemplateCount: z.number().int().nonnegative(),
});

export type EmailTemplateResponse = z.infer<typeof emailTemplateListItemSchema>;

export const emailTemplatesListSchema = z.object({
  data: z.array(emailTemplateListItemSchema),
});

const emailTemplateOptionSchema = emailTemplateSchema.omit({ createdAt: true, updatedAt: true });

export const applicationEmailTemplateOptionsSchema = z.object({
  data: z.array(emailTemplateOptionSchema),
});

// --- Activity feed ---

const activityEventTypeSchema = z.enum([
  'member_added',
  'member_removed',
  'member_deactivated',
  'member_reactivated',
  'role_changed',
  'vault_access_granted',
  'vault_access_revoked',
  'tag_created',
  'tag_renamed',
  'tag_archived',
  'tag_restored',
  'tag_assigned',
  'tag_unassigned',
  'interview_plan_created',
  'interview_plan_updated',
  'interview_plan_archived',
  'stage_activity_created',
  'stage_activity_updated',
  'stage_activity_deleted',
  'hiring_team_added',
  'hiring_team_removed',
  'interview_template_created',
  'interview_template_updated',
  'interview_template_archived',
  'interview_template_restored',
  'job_published',
  'job_unpublished',
  'job_closed',
  'job_reopened_as_draft',
  'stage_changed',
  'archived',
  'unarchived',
  'transferred',
  'interview_scheduled',
  'interview_rescheduled',
  'interview_cancelled',
  'interview_started',
  'interview_completed',
  'interview_no_show',
  'scheduling_link_sent',
  'feedback_submitted',
  'feedback_requested',
  'feedback_edited',
  'feedback_deleted',
  'note_added',
  'note_deleted',
  'email_sent',
  'email_received',
  'email_sent_from_activity',
  'email_bounced',
  'application_created',
  'application_responded',
  'application_outcome_recorded',
  'application_outcome_reopened',
  'candidate_created',
  'candidate_linked',
  'candidate_profile_updated',
  'candidate_file_added',
  'candidate_file_updated',
  'candidate_file_removed',
]);

export type ActivityEventType = z.infer<typeof activityEventTypeSchema>;

const activityStageTypeSchema = stageTypeSchema;

const stagePayloadSchema = z.object({
  kind: z.literal('stage'),
  transitionId: z.string(),
  fromStageId: z.string().nullable(),
  fromStageName: z.string().nullable(),
  fromStageType: activityStageTypeSchema.nullable(),
  toStageId: z.string().nullable(),
  toStageName: z.string().nullable(),
  toStageType: activityStageTypeSchema.nullable(),
  durationSeconds: z.number().nullable(),
  archiveReason: z
    .object({
      id: z.string(),
      label: z.string(),
      type: archiveReasonTypeSchema,
    })
    .nullable(),
});

const emailPayloadSchema = z.object({
  kind: z.literal('email'),
  emailId: z.string(),
  content: encryptedEnvelopeSchema,
});

export type EmailPayload = z.infer<typeof emailPayloadSchema>;

const notePayloadSchema = z.object({
  kind: z.literal('note'),
  noteId: z.string(),
  content: encryptedEnvelopeSchema,
  isPrivate: z.boolean(),
});

export type NotePayload = z.infer<typeof notePayloadSchema>;

const feedbackPayloadSchema = z.object({
  kind: z.literal('feedback'),
  submissionId: z.string(),
  formDefinitionId: z.string().nullable(),
  isDeleted: z.boolean(),
});

const genericPayloadSchema = z.object({
  kind: z.literal('generic'),
});

const activityPayloadSchema = z.discriminatedUnion('kind', [
  stagePayloadSchema,
  emailPayloadSchema,
  notePayloadSchema,
  feedbackPayloadSchema,
  genericPayloadSchema,
]);

const activityFeedMetadataSchema = z.object({
  previousScheduledAt: z.string().nullable().optional(),
  reasonText: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  title: z.string().optional(),
  recipientEmail: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  cleared: z.boolean().optional(),
});

export const activityFeedRowSchema = z.object({
  id: z.string(),
  type: activityEventTypeSchema,
  createdAt: z.string(),
  scope: z.enum(['candidate', 'application']),
  applicationId: z.string().nullable(),
  jobId: z.string().nullable(),
  jobTitle: z.string().nullable(),
  actor: z.object({
    userId: uuidSchema.nullable(),
    externalWallet: walletAddressSchema.nullable(),
    name: z.string().nullable(),
  }),
  metadata: activityFeedMetadataSchema,
  payload: activityPayloadSchema,
});

export type ActivityFeedRow = z.infer<typeof activityFeedRowSchema>;

export const activityFeedResponseSchema = z.object({
  data: z.array(activityFeedRowSchema),
  pagination: paginationSchema,
});

export type ActivityFeedResponse = z.infer<typeof activityFeedResponseSchema>;

// --- Request body: email templates ---

const emailTemplateBodySchema = z.object({
  name: z.string(),
  subject: z.string(),
  body: tipTapDocSchema,
  useCase: emailTemplateUseCaseSchema,
});

export type EmailTemplateBody = z.infer<typeof emailTemplateBodySchema>;

const emailTemplateUpdateBodySchema = z.object({
  name: z.string().optional(),
  subject: z.string().optional(),
  body: tipTapDocSchema.optional(),
  useCase: emailTemplateUseCaseSchema.optional(),
});

export type EmailTemplateUpdateBody = z.infer<typeof emailTemplateUpdateBodySchema>;

// --- Decrypted email (client-side, after vault decryption) ---

const decryptedEmailContentSchema = z.object({
  subject: z.string(),
  to: z.string(),
  body: tipTapDocSchema,
});

export type DecryptedEmailContent = z.infer<typeof decryptedEmailContentSchema>;

const decryptedEmailSchema = z.object({
  id: z.string(),
  senderRole: senderRoleSchema,
  senderName: z.string().nullable(),
  content: decryptedEmailContentSchema,
  createdAt: z.string(),
});

export type DecryptedEmail = z.infer<typeof decryptedEmailSchema>;

// --- Compose output (shared between dialogs, hooks, workflows) ---

/** Base output from email compose dialogs. */
export interface ComposeEmailData {
  messageDoc: TipTapDoc;
  messageHtml: string;
  subject: string;
  emailTemplateId?: string;
}

export interface EmailDeliveryGrantSubmission {
  deliveryGrantId: string;
  deliveryGrantKey: EnvelopeKey;
}
