import { evaluationCriterionSchema, hiringTeamEntrySchema } from '@comitium/schemas/jobs';
import { paginatedSchema, uuidSchema } from '@comitium/schemas/public';
import { compensationConfigSchema, locationEntrySchema } from '@comitium/schemas/public-jobs';
import { z } from 'zod';
import { MAX_EVALUATION_CRITERIA } from '@/lib/jobs/evaluation-criteria';

export const jobTemplateStatusSchema = z.enum(['active', 'inactive', 'archived']);
export type JobTemplateStatus = z.infer<typeof jobTemplateStatusSchema>;

export const jobTemplateSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  createdBy: uuidSchema,
  status: jobTemplateStatusSchema,
  isConfidential: z.boolean(),
  title: z.string(),
  description: z.unknown().nullable(),
  departmentId: uuidSchema.nullable(),
  locationId: uuidSchema.nullable(),
  location: z.array(locationEntrySchema).nullable(),
  locationType: z.string().nullable(),
  employmentType: z.string().nullable(),
  category: z.string().nullable(),
  compensation: compensationConfigSchema.nullable(),
  formId: uuidSchema.nullable(),
  criteria: z.array(evaluationCriterionSchema).nullable(),
  interviewPlanId: z.string().nullable(),
  hiringTeam: z.array(hiringTeamEntrySchema).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const jobTemplateListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: jobTemplateStatusSchema,
  departmentId: uuidSchema.nullable(),
  departmentName: z.string().nullable(),
  locationId: uuidSchema.nullable(),
  location: z.array(locationEntrySchema).nullable(),
  employmentType: z.string().nullable(),
  interviewPlanId: z.string().nullable(),
  createdBy: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type JobTemplateListItem = z.infer<typeof jobTemplateListItemSchema>;

export const jobTemplatesResponseSchema = paginatedSchema(jobTemplateListItemSchema);

export const createJobTemplateBodySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.unknown().optional(),
  departmentId: uuidSchema.nullable().optional(),
  locationId: uuidSchema.nullable().optional(),
  employmentType: z.string().optional(),
  category: z.string().optional(),
  compensation: compensationConfigSchema.optional(),
  criteria: z.array(evaluationCriterionSchema).max(MAX_EVALUATION_CRITERIA).optional(),
  formId: uuidSchema.nullable().optional(),
  interviewPlanId: uuidSchema.nullable().optional(),
  hiringTeam: z.array(hiringTeamEntrySchema).optional(),
});

export type CreateJobTemplateBody = z.infer<typeof createJobTemplateBodySchema>;

const updateJobTemplateBodySchema = createJobTemplateBodySchema.partial();
export type UpdateJobTemplateBody = z.infer<typeof updateJobTemplateBodySchema>;

export const createDraftFromTemplateResponseSchema = z.object({
  jobId: z.string(),
  title: z.string(),
});

const createDraftFromTemplateBodySchema = z.object({
  departmentId: uuidSchema,
  locationId: uuidSchema,
});

export type CreateDraftFromTemplateBody = z.infer<typeof createDraftFromTemplateBodySchema>;

export const createJobTemplateResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
});

export type GetJobTemplatesParams = {
  status?: JobTemplateStatus;
  limit?: number;
  cursor?: string | null;
};
