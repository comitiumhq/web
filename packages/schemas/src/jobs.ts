import { z } from 'zod';
import { preparedRelayedOnchainOperationSchema } from './onchain-operations';
import { addressSchema, paginatedSchema, uuidSchema, walletAddressSchema } from './public';
import {
  type CompensationConfig,
  compensationConfigSchema,
  jobCommitmentStatusSchema,
  jobLifecycleSchema,
  jobPostingApplyModeSchema,
  jobStatusSchema,
  type LocationEntry,
  locationEntrySchema,
} from './public-jobs';

// --- Evaluation criteria ---

export const MAX_EVALUATION_CRITERION_TITLE_LENGTH = 100;
export const MAX_EVALUATION_CRITERION_PROMPT_LENGTH = 300;

export const evaluationCriterionSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1).max(MAX_EVALUATION_CRITERION_TITLE_LENGTH),
  prompt: z.string().min(1).max(MAX_EVALUATION_CRITERION_PROMPT_LENGTH),
});

export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;

// --- Job status ---

const jobPostingStatusSchema = z.enum(['published', 'unpublished']);

export const jobSummarySchema = z.object({
  id: z.string(),
  jobCommitmentId: uuidSchema.nullable(),
  commitmentStatus: jobCommitmentStatusSchema.nullable(),
  postingStatus: jobPostingStatusSchema.nullable(),
  lifecycle: jobLifecycleSchema,
  postingApplyMode: jobPostingApplyModeSchema.nullable(),
  chainId: z.number().nullable(),
  commitmentContract: addressSchema.nullable(),
  jobId: z.number().nullable(),
  orgId: z.string(),
  orgOnChainId: z.number().nullable(),
  creatorAddress: walletAddressSchema.nullable(),
  stake: z.string().nullable(),
  responseDeadlineDays: z.number().nullable(),
  status: jobStatusSchema,
  version: z.number().int().min(0),
  totalApplications: z.number(),
  respondedApplications: z.number(),
  onTimeResponses: z.number(),
  txHash: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  location: z.array(locationEntrySchema).nullable(),
  locationType: z.string().nullable(),
  employmentType: z.string().nullable(),
  category: z.string().nullable(),
  interviewPlanId: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
});

export type JobSummary = z.infer<typeof jobSummarySchema>;

// --- Lifecycle operations ---

export const preparedOnchainOperationSchema = preparedRelayedOnchainOperationSchema;

export const prepareUnpublishSchema = preparedRelayedOnchainOperationSchema;

export const jobLifecycleMutationResponseSchema = z.object({
  version: z.number().int().min(0),
});

// --- Job access ---

export const jobAccessRoleSchema = z.enum(['hiring_member', 'hiring_manager', 'admin']);
export type JobAccessRole = z.infer<typeof jobAccessRoleSchema>;

export const hiringTeamMemberSchema = z.object({
  userId: uuidSchema,
  email: z.string().nullable(),
  name: z.string().nullable(),
  role: z.enum(['hiring_member', 'hiring_manager']).nullable(),
  effectiveAccessRole: z.string().nullable(),
  permissions: z.array(z.string()),
});

export type HiringTeamMember = z.infer<typeof hiringTeamMemberSchema>;

export const myJobAccessSchema = z.object({
  data: z.object({
    isOnHiringTeam: z.boolean(),
    effectiveAccessRole: z.string().nullable(),
    permissions: z.array(z.string()),
  }),
});

// --- Hiring team entry (job creation input) ---

const hiringTeamRoleSchema = z.enum(['hiring_member', 'hiring_manager']);

export type HiringTeamRole = z.infer<typeof hiringTeamRoleSchema>;

export const hiringTeamEntrySchema = z.object({
  userId: uuidSchema,
  role: hiringTeamRoleSchema.default('hiring_manager'),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
});

export type HiringTeamEntry = z.infer<typeof hiringTeamEntrySchema>;

// --- Job application data (contract interaction — frontend-only) ---

const jobApplicationDataSchema = z.object({
  id: uuidSchema,
  postingId: uuidSchema,
  chainId: z.number(),
  jobId: z.number(),
  commitmentContract: addressSchema,
  orgId: z.string(),
  creatorAddress: addressSchema,
});

export type JobApplicationData = z.infer<typeof jobApplicationDataSchema>;

// --- IPFS job metadata ---

// --- Org jobs list ---

const hiringTeamSummarySchema = z.object({
  members: z.array(
    z.object({
      name: z.string().nullable(),
    }),
  ),
  total: z.number(),
});

const orgJobListItemSchema = z.object({
  id: z.string(),
  jobCommitmentId: uuidSchema.nullable(),
  commitmentStatus: jobCommitmentStatusSchema.nullable(),
  postingStatus: jobPostingStatusSchema.nullable(),
  lifecycle: jobLifecycleSchema,
  chainId: z.number().nullable(),
  commitmentContract: addressSchema.nullable(),
  jobId: z.number().nullable(),
  title: z.string().nullable(),
  departmentId: uuidSchema.nullable(),
  departmentName: z.string().nullable(),
  locationId: uuidSchema.nullable(),
  locationName: z.string().nullable(),
  location: z.array(locationEntrySchema).nullable(),
  category: z.string().nullable(),
  employmentType: z.string().nullable(),
  stake: z.string().nullable(),
  status: jobStatusSchema,
  createdAt: z.string(),
  candidateCount: z.number(),
  hiringTeam: hiringTeamSummarySchema,
});

export type OrgJobListItem = z.infer<typeof orgJobListItemSchema>;

export const orgJobsResponseSchema = paginatedSchema(orgJobListItemSchema);

// --- Job drafts ---

export const jobDraftSchema = z.object({
  id: z.string(),
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
  sourceJobId: z.string().nullable(),
  version: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type JobDraft = z.infer<typeof jobDraftSchema>;

const jobDraftListItemSchema = z.object({
  id: z.string(),
  lifecycle: jobLifecycleSchema,
  status: z.literal('draft'),
  title: z.string(),
  departmentId: uuidSchema.nullable(),
  departmentName: z.string().nullable(),
  locationId: uuidSchema.nullable(),
  locationName: z.string().nullable(),
  location: z.array(locationEntrySchema).nullable(),
  category: z.string().nullable(),
  employmentType: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type JobDraftListItem = z.infer<typeof jobDraftListItemSchema>;

export const draftJobsResponseSchema = paginatedSchema(jobDraftListItemSchema);

export const createDraftResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
});

export const jobCreationContextSchema = z.object({
  orgWide: z.boolean(),
  departmentIds: z.array(uuidSchema),
});

export const publishDraftResponseSchema = preparedRelayedOnchainOperationSchema;

export const prepareJobContentUriUpdateResponseSchema = preparedRelayedOnchainOperationSchema;

// --- API input types ---

export type GetOrgJobsParams = {
  status?: 'draft' | 'open' | 'closed' | 'all';
  search?: string;
  departmentId?: string;
  locationId?: string;
  category?: string;
  limit?: number;
  cursor?: string | null;
};

export type CreateDraftParams = { title: string; departmentId: string; locationId: string } | { sourceJobId: string };

export type UpdateDraftData = {
  expectedVersion: number;
  title?: string;
  description?: unknown;
  departmentId?: string;
  locationId?: string;
  locationType?: string | null;
  location?: LocationEntry[] | null;
  employmentType?: string | null;
  category?: string | null;
  compensation?: CompensationConfig | null;
  formId?: string | null;
  criteria?: EvaluationCriterion[] | null;
  interviewPlanId?: string | null;
  hiringTeam?: { userId: string; role: HiringTeamRole }[];
};

export type PublishDraftParams = {
  expectedVersion: number;
  stake: string;
  feeTier: number;
  maxApplications?: number;
  descriptionMarkdown: string;
};

export type PrepareJobContentUriUpdateParams = {
  expectedVersion: number;
  descriptionMarkdown: string;
};

export const updateDraftResponseSchema = z.object({
  success: z.literal(true),
  version: z.number().int().min(0),
});

export const reopenJobAsDraftResponseSchema = z.object({
  version: z.number().int().min(0),
});
