import {
  answerEnvelopeSchema,
  formSnapshotSchema,
  formSubmissionFieldValueSchema,
} from '@comitium/schemas/forms/form-submission';
import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import { isDefined } from '@/lib/utils';

const feedbackSubmissionSchema = z.object({
  id: uuidSchema,
  formId: uuidSchema,
  applicationId: uuidSchema.nullable(),
  activityId: uuidSchema.nullable(),
  interviewEventId: uuidSchema.nullable(),
  isAdhoc: z.boolean(),
  formSnapshot: formSnapshotSchema,
  answerEnvelopes: z.array(answerEnvelopeSchema),
  canReadPrivate: z.boolean(),
  submittedByUserId: uuidSchema.nullable(),
  submittedAt: z.string(),
  isDeleted: z.boolean(),
  deletedAt: z.string().nullable(),
  deletedBy: uuidSchema.nullable(),
  sourceLabel: z.string().nullable(),
});

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;

export const feedbackSubmissionListResponseSchema = z.object({
  data: z.array(feedbackSubmissionSchema),
  total: z.number().int().nonnegative(),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export const feedbackSubmissionItemResponseSchema = z.object({
  data: feedbackSubmissionSchema,
});

const sourceShape = {
  activityId: uuidSchema.optional(),
  interviewEventId: uuidSchema.optional(),
};

const sourceRefine = (data: { activityId?: string; interviewEventId?: string }) =>
  isDefined(data.activityId) || isDefined(data.interviewEventId);

const sourceRefineMessage = { message: 'activityId or interviewEventId required' };

const createFeedbackSubmissionBodySchema = z
  .object({
    ...sourceShape,
    formId: uuidSchema,
    answerEnvelopes: z.array(answerEnvelopeSchema),
    fieldValues: z.array(formSubmissionFieldValueSchema).max(500),
  })
  .refine(sourceRefine, sourceRefineMessage);

export type CreateFeedbackSubmissionBody = z.infer<typeof createFeedbackSubmissionBodySchema>;

const updateFeedbackSubmissionBodySchema = z.object({
  answerEnvelopes: z.array(answerEnvelopeSchema),
  fieldValues: z.array(formSubmissionFieldValueSchema).max(500),
});

export type UpdateFeedbackSubmissionBody = z.infer<typeof updateFeedbackSubmissionBodySchema>;

const resolveFeedbackFormBodySchema = z.object(sourceShape).refine(sourceRefine, sourceRefineMessage);

export type ResolveFeedbackFormBody = z.infer<typeof resolveFeedbackFormBodySchema>;

export const resolvedFeedbackFormResponseSchema = z.object({
  data: z.object({
    formSnapshot: formSnapshotSchema,
    canReadPrivate: z.boolean(),
  }),
});
