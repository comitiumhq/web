import { z } from 'zod';
import { tipTapDocSchema } from './common';
import type { PublicJobSort } from './job-enums';
import { paginatedWithTotalSchema, uuidSchema } from './public';
import { skillDisplaySchema } from './skills';

const compensationTierSchema = z.object({
  title: z.string().optional(),
  currency: z.string(),
  period: z.string(),
  base_min: z.number().nullable().optional(),
  base_max: z.number().nullable().optional(),
});

export type CompensationTier = z.infer<typeof compensationTierSchema>;

export const compensationConfigSchema = z.object({
  tiers: z.array(compensationTierSchema),
});

export type CompensationConfig = z.infer<typeof compensationConfigSchema>;

export const locationEntrySchema = z.object({
  name: z.string(),
  cityId: z.number(),
});

export type LocationEntry = z.infer<typeof locationEntrySchema>;

export const companyInfoSchema = z.object({
  name: z.string().nullable(),
  website: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
});

export type CompanyInfo = z.infer<typeof companyInfoSchema>;

export const jobStatusSchema = z.enum(['draft', 'open', 'closed']);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const responseCommitmentStatusSchema = z.enum(['active', 'stopped', 'settled']);

const jobLifecycleActionSchema = z.enum([
  'open_job',
  'publish_posting',
  'activate_commitment',
  'settle_commitment',
  'close_job',
  'reopen_as_draft',
]);

export type JobLifecycleAction = z.infer<typeof jobLifecycleActionSchema>;

export const jobLifecycleSchema = z.object({
  commitmentFinalizationPending: z.boolean(),
  activeApplications: z.number().int().nonnegative(),
  allowedActions: z.array(jobLifecycleActionSchema),
});

export type JobLifecycle = z.infer<typeof jobLifecycleSchema>;

export const jobListItemSchema = z.object({
  id: z.string(),
  postingId: uuidSchema,
  postingSlug: z.string(),
  orgSlug: z.string(),
  canonicalUrl: z.string(),
  applicationCapacityAvailable: z.boolean(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  skills: z.array(skillDisplaySchema),
  socialDescription: z.string().nullable(),
  status: jobStatusSchema,
  responseDeadlineDays: z.number().nullable(),
  createdAt: z.string(),
  location: z.array(locationEntrySchema).nullable(),
  locationType: z.string().nullable(),
  employmentType: z.string().nullable(),
  category: z.string().nullable(),
  compensation: compensationConfigSchema.nullable(),
  companyInfo: companyInfoSchema.nullable(),
});

export type JobListItem = z.infer<typeof jobListItemSchema>;

export const jobsResponseSchema = paginatedWithTotalSchema(jobListItemSchema);
export type JobsResponse = z.infer<typeof jobsResponseSchema>;

const jobSchema = z.object({
  id: z.string(),
  postingId: uuidSchema,
  postingSlug: z.string(),
  orgSlug: z.string(),
  canonicalUrl: z.string(),
  applicationCapacityAvailable: z.boolean(),
  orgId: z.string(),
  responseDeadlineDays: z.number().nullable(),
  status: jobStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string().nullable(),
  description: tipTapDocSchema.nullable(),
  skills: z.array(skillDisplaySchema),
  location: z.array(locationEntrySchema).nullable(),
  employmentType: z.string().nullable(),
  locationType: z.string().nullable(),
  category: z.string().nullable(),
  compensation: compensationConfigSchema.nullable(),
  companyInfo: companyInfoSchema.nullable(),
  interviewPlanId: z.string().nullable(),
});

export type Job = z.infer<typeof jobSchema>;

export const locationItemSchema = z.object({
  name: z.string(),
  cityId: z.number().nullable(),
  count: z.number(),
});

export type LocationItem = z.infer<typeof locationItemSchema>;

export type GetJobsParams = {
  limit?: number;
  cursor?: string | null;
  status?: 'open' | 'closed';
  category?: string;
  location?: string;
  employmentType?: string;
  search?: string;
  locationType?: string;
  salaryMin?: number;
  salaryMax?: number;
  sort?: PublicJobSort;
  skills?: string[];
};
