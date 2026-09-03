import { tipTapDocSchema } from '@comitium/schemas/common';
import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

// ── Shared field schemas ──

export const interviewTemplateTitleFieldSchema = z.string().trim().min(1, 'Title is required').max(255);
export const interviewTemplateExternalTitleFieldSchema = z.string().trim().max(255);
export const interviewTemplateDurationMinutesFieldSchema = z.number().int().min(15).max(180);

export const interviewTemplateInstructionsFieldSchema = tipTapDocSchema;

// ── Response schemas ──

const interviewTemplateSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  externalTitle: z.string().nullable(),
  durationMinutes: z.number().int(),
  instructions: interviewTemplateInstructionsFieldSchema.nullable(),
  feedbackFormId: uuidSchema.nullable(),
  isDebrief: z.boolean(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const interviewTemplateListItemSchema = interviewTemplateSchema.extend({
  jobCount: z.number().int().nonnegative(),
  jobTemplateCount: z.number().int().nonnegative(),
});

export type InterviewTemplate = z.infer<typeof interviewTemplateListItemSchema>;

export const interviewTemplatesListSchema = z.object({
  data: z.array(interviewTemplateListItemSchema),
});

export const interviewTemplateResponseSchema = z.object({
  data: interviewTemplateSchema,
});

// ── Request schemas ──

const createInterviewTemplateBodySchema = z.object({
  title: interviewTemplateTitleFieldSchema,
  externalTitle: interviewTemplateExternalTitleFieldSchema.optional(),
  durationMinutes: interviewTemplateDurationMinutesFieldSchema,
  instructions: interviewTemplateInstructionsFieldSchema.optional(),
  feedbackFormId: uuidSchema.nullable().optional(),
  isDebrief: z.boolean().optional(),
});

export type CreateInterviewTemplateBody = z.infer<typeof createInterviewTemplateBodySchema>;

const updateInterviewTemplateBodySchema = z.object({
  title: interviewTemplateTitleFieldSchema.optional(),
  externalTitle: interviewTemplateExternalTitleFieldSchema.nullable().optional(),
  durationMinutes: interviewTemplateDurationMinutesFieldSchema.optional(),
  instructions: interviewTemplateInstructionsFieldSchema.nullable().optional(),
  feedbackFormId: uuidSchema.nullable().optional(),
});

export type UpdateInterviewTemplateBody = z.infer<typeof updateInterviewTemplateBodySchema>;
