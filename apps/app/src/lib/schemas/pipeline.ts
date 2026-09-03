import {
  applicationSearchProjectionSchema,
  applicationTerminalOutcomeSchema,
  criterionSummarySchema,
  reviewStatusSchema,
} from '@comitium/schemas/applications';
import { archiveReasonTypeSchema } from '@comitium/schemas/archive-reason-type';
import { encryptedEnvelopeSchema } from '@comitium/schemas/common';
import { uuidSchema } from '@comitium/schemas/public';
import { jobLifecycleSchema, jobStatusSchema, locationEntrySchema } from '@comitium/schemas/public-jobs';
import { z } from 'zod';
import { interviewStatusEnum } from './interviews';
import { jobTemplateStatusSchema } from './job-templates';
import { type StageType, stageTypeSchema } from './stages';

// --- Stage type ---

export type { StageType } from './stages';

const pipelineResponseStatusSchema = z.enum(['needs_response', 'overdue', 'due_soon', 'responded', 'no_commitment']);

type PipelineResponseStatus = z.infer<typeof pipelineResponseStatusSchema>;

// --- Pipeline stages & metadata ---

// Base stage (per-job pipeline — no stageType in response)
const interviewStageBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  stageOrder: z.number(),
});

export type InterviewStageBase = z.infer<typeof interviewStageBaseSchema>;

// Stage with type (kanban, global pipeline, templates)
const interviewStageSchema = interviewStageBaseSchema.extend({
  stageType: stageTypeSchema,
});

export type InterviewStage = z.infer<typeof interviewStageSchema>;

const pipelineMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const pipelineSchema = z.object({
  pipeline: pipelineMetadataSchema,
  stages: z.array(interviewStageSchema),
});

export type PipelineResponse = z.infer<typeof pipelineSchema>;

// --- Kanban ---

export type { ReviewStatus } from '@comitium/schemas/applications';

const kanbanApplicationSchema = z.object({
  id: z.string(),
  candidateId: z.string().nullable(),
  candidateProfile: encryptedEnvelopeSchema.nullable(),
  appliedAt: z.string(),
  responseDeadline: z.string().nullable(),
  isResponded: z.boolean(),
  terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  terminalOutcomeAt: z.string().nullable(),
  currentStageId: z.string(),
  currentStageEnteredAt: z.string().nullable(),
  searchProjection: applicationSearchProjectionSchema.nullable(),
  criterionSummary: criterionSummarySchema.nullable(),
  updatedAt: z.string().nullable(),
  tagIds: z.array(uuidSchema),
  interviewStatus: interviewStatusEnum.nullable(),
  interviewScheduledAt: z.string().nullable(),
  reviewStatus: reviewStatusSchema,
  duplicateAttemptCount: z.number().int().nonnegative(),
});

export type KanbanApplication = z.infer<typeof kanbanApplicationSchema>;

const kanbanStageSchema = interviewStageSchema.extend({
  applications: z.array(kanbanApplicationSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
});

export type KanbanStage = z.infer<typeof kanbanStageSchema>;

export const kanbanSchema = z.object({
  stages: z.array(kanbanStageSchema),
  archivedCount: z.number(),
});

export type KanbanResponse = z.infer<typeof kanbanSchema>;

// --- Archived ---

const archivedApplicationSchema = z.object({
  id: z.string(),
  candidateId: z.string().nullable(),
  candidateProfile: encryptedEnvelopeSchema.nullable(),
  appliedAt: z.string(),
  isResponded: z.boolean(),
  terminalOutcome: applicationTerminalOutcomeSchema,
  terminalOutcomeAt: z.string(),
  searchProjection: applicationSearchProjectionSchema.nullable(),
  criterionSummary: criterionSummarySchema.nullable(),
  archivedAt: z.string(),
  archivedAtStageName: z.string().nullable(),
  archiveReasonId: z.string().nullable(),
  archiveReasonLabel: z.string().nullable(),
  archiveReasonType: archiveReasonTypeSchema.nullable(),
  tagIds: z.array(uuidSchema),
  duplicateAttemptCount: z.number().int().nonnegative(),
});

export type ArchivedApplication = z.infer<typeof archivedApplicationSchema>;

export const archivedKanbanSchema = z.object({
  archived: z.array(archivedApplicationSchema),
  total: z.number().int().nonnegative(),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ArchivedResponse = z.infer<typeof archivedKanbanSchema>;

// --- Global pipeline summary ---

const stageTypeCountsSchema = z.object({
  lead: z.number(),
  review: z.number(),
  active: z.number(),
  offer: z.number(),
  hired: z.number(),
});

export type StageTypeCounts = z.infer<typeof stageTypeCountsSchema>;

export const pipelineSummarySchema = z.object({
  stageTypes: stageTypeCountsSchema,
  archived: z.number(),
  total: z.number(),
  jobCount: z.number(),
});

export type PipelineSummaryResponse = z.infer<typeof pipelineSummarySchema>;

// --- Pipeline jobs ---

const pipelineJobStageSchema = interviewStageSchema.extend({
  candidateCount: z.number(),
});

const cursorPaginationSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const pipelineJobSchema = z.object({
  id: z.string(),
  jobId: z.number().nullable(),
  status: jobStatusSchema,
  lifecycle: jobLifecycleSchema,
  title: z.string().nullable(),
  location: z.array(locationEntrySchema).nullable(),
  totalCandidates: z.number(),
  stages: z.array(pipelineJobStageSchema),
});

export type PipelineJob = z.infer<typeof pipelineJobSchema>;

export const pipelineJobsSchema = z.object({
  data: z.array(pipelineJobSchema),
  pagination: cursorPaginationSchema,
});

export type PipelineJobsResponse = z.infer<typeof pipelineJobsSchema>;

// --- Pipeline candidates ---

const pipelineCandidateSchema = z.object({
  id: z.string(),
  candidateId: z.string().nullable(),
  candidateProfile: encryptedEnvelopeSchema.nullable(),
  jobId: z.string(),
  jobOnChainId: z.number().nullable(),
  jobTitle: z.string().nullable(),
  appliedAt: z.string(),
  responseDeadline: z.string().nullable(),
  isResponded: z.boolean(),
  terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  terminalOutcomeAt: z.string().nullable(),
  currentStageId: z.string().nullable(),
  currentStageName: z.string().nullable(),
  currentStageEnteredAt: z.string().nullable(),
  interviewStatus: interviewStatusEnum.nullable(),
  interviewScheduledAt: z.string().nullable(),
  stageType: stageTypeSchema.nullable(),
  archivedAt: z.string().nullable(),
  archivedAtStageName: z.string().nullable(),
  archiveReasonId: z.string().nullable(),
  archiveReasonLabel: z.string().nullable(),
  archiveReasonType: archiveReasonTypeSchema.nullable(),
  searchProjection: applicationSearchProjectionSchema.nullable(),
  criterionSummary: criterionSummarySchema.nullable(),
  updatedAt: z.string().nullable(),
  tagIds: z.array(uuidSchema),
  reviewStatus: reviewStatusSchema,
  duplicateAttemptCount: z.number().int().nonnegative(),
});

export type PipelineCandidate = z.infer<typeof pipelineCandidateSchema>;

export const pipelineCandidatesSchema = z.object({
  data: z.array(pipelineCandidateSchema),
  pagination: cursorPaginationSchema,
});

export type PipelineCandidatesResponse = z.infer<typeof pipelineCandidatesSchema>;

// --- Interview plans (templates) ---

const interviewPlanSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  isArchived: z.boolean(),
  isDefault: z.boolean(),
  stageCount: z.number(),
  jobCount: z.number().int().nonnegative(),
  jobTemplateCount: z.number().int().nonnegative(),
  stageNames: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type InterviewPlanSummary = z.infer<typeof interviewPlanSummarySchema>;

export const interviewPlanUsageSchema = z.object({
  data: z.object({
    jobs: z.array(
      z.object({
        id: uuidSchema,
        title: z.string().nullable(),
        status: jobStatusSchema,
      }),
    ),
    jobTemplates: z.array(
      z.object({
        id: uuidSchema,
        title: z.string(),
        status: jobTemplateStatusSchema,
      }),
    ),
  }),
});

export type InterviewPlanUsage = z.infer<typeof interviewPlanUsageSchema>['data'];

const interviewPlanStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  stageOrder: z.number(),
  stageType: stageTypeSchema,
  stageGroupId: z.string().nullable(),
});

export type InterviewPlanStage = z.infer<typeof interviewPlanStageSchema>;

const interviewPlanGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  stageType: stageTypeSchema,
  groupOrder: z.number(),
});

export const interviewPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  isArchived: z.boolean(),
  isDefault: z.boolean(),
  stages: z.array(interviewPlanStageSchema),
  stageGroups: z.array(interviewPlanGroupSchema),
});

export type InterviewPlanDetail = z.infer<typeof interviewPlanSchema>;

export const interviewPlansSchema = z.object({
  data: z.array(interviewPlanSummarySchema),
});

export const createTemplateResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

// --- Filters (request params) ---

type PipelineView = 'active' | 'archived';
export type KanbanSort = 'date' | 'criteria';
export type PipelineCandidateSort = 'applied' | 'criteria' | 'inReview' | 'updated' | 'terminal';
export type PipelineSortDirection = 'asc' | 'desc';

export interface PipelineCandidateSorting {
  sort: PipelineCandidateSort;
  direction: PipelineSortDirection;
}

export interface KanbanFilters {
  stage?: string;
  cursor?: string;
  limit?: number;
  skill?: string;
  tagIds?: string[];
  minCriteriaMet?: number;
  q?: string;
  sort?: KanbanSort;
}

export interface PipelineJobsFilters extends Omit<KanbanFilters, 'stage' | 'sort'> {
  stageType?: StageType;
  limit?: number;
  cursor?: string;
}

export interface PipelineCandidatesFilters extends Omit<KanbanFilters, 'stage' | 'sort'> {
  stageType?: StageType;
  view?: PipelineView;
  assignedToMe?: boolean;
  responseStatus?: PipelineResponseStatus;
  sort?: PipelineCandidateSort;
  direction?: PipelineSortDirection;
  limit?: number;
  cursor?: string;
}

// --- Request body: template ---

const stageInputSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string(),
  stageOrder: z.number(),
  stageType: stageTypeSchema,
  stageGroupRef: z.string().optional(),
});

const stageGroupInputSchema = z.object({
  id: uuidSchema.optional(),
  ref: z.string(),
  name: z.string(),
  stageType: stageTypeSchema,
  groupOrder: z.number(),
});

const templateBodySchema = z.object({
  name: z.string(),
  stages: z.array(stageInputSchema),
  stageGroups: z.array(stageGroupInputSchema).optional(),
});

export type TemplateBody = z.infer<typeof templateBodySchema>;
