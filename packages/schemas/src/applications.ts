import { envelopeKeySchema, publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { z } from 'zod';
import { archiveReasonTypeSchema } from './archive-reason-type';
import { encryptedEnvelopeSchema } from './common';
import { interviewStatusEnum } from './interview-status';
import { PROCESSOR_RECIPIENT_REGEX } from './patterns';
import { bytes32HexSchema, uuidSchema } from './public';
import { companyInfoSchema, jobStatusSchema, locationEntrySchema } from './public-jobs';
import { vaultKeySchema } from './vault';

const criterionAssessmentVerdictSchema = z.enum(['met', 'not_met', 'undecided']);

export const criterionEvidenceSchema = z
  .object({
    rationale: z.string().trim().min(1).max(1200),
    citations: z
      .array(
        z
          .object({
            source: z.literal('resume'),
            questionId: z.null(),
            excerpt: z.string().trim().min(1).max(500),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();

const criteriaAssessmentItemSchema = z.object({
  applicationId: uuidSchema,
  criterionId: uuidSchema,
  titleSnapshot: z.string(),
  assessment: criterionAssessmentVerdictSchema,
  evidence: encryptedEnvelopeSchema.nullable(),
});

export type CriteriaAssessment = z.infer<typeof criteriaAssessmentItemSchema>;
export type CriterionEvidence = z.infer<typeof criterionEvidenceSchema>;

const taxonomyConceptIdSchema = z.uuid();

export const applicationSearchProjectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    skillIds: z.array(taxonomyConceptIdSchema).max(100),
    occupationIds: z.array(taxonomyConceptIdSchema).max(30),
  })
  .strict();

export const criterionSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  metCount: z.number().int().nonnegative(),
  notMetCount: z.number().int().nonnegative(),
  undecidedCount: z.number().int().nonnegative(),
});

export type CriterionSummary = z.infer<typeof criterionSummarySchema>;

const applicationProcessingStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'complete', 'retryable_failed', 'terminal_failed']),
  criteriaEvaluationMode: z.enum(['enabled', 'disabled', 'candidate_opt_out']).nullable(),
  safeErrorCode: z.string().nullable(),
  attemptCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
  canRetry: z.boolean(),
});

export type ApplicationProcessingStatus = z.infer<typeof applicationProcessingStatusSchema>;

export const applicationTerminalOutcomeSchema = z.enum([
  'hired',
  'employer_rejected',
  'candidate_withdrew',
  'candidate_unresponsive',
  'transferred',
  'imported_terminal_unknown',
]);

export type ApplicationTerminalOutcome = z.infer<typeof applicationTerminalOutcomeSchema>;

// --- Other applications (cross-job sidebar) ---

const otherApplicationSummarySchema = z.object({
  id: z.string(),
  jobId: z.string(),
  jobTitle: z.string().nullable(),
  appliedAt: z.string(),
  currentStageId: z.string().nullable(),
  terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  terminalOutcomeAt: z.string().nullable(),
  currentStageName: z.string().nullable(),
  archivedAt: z.string().nullable(),
});

export type OtherApplicationSummary = z.infer<typeof otherApplicationSummarySchema>;

// --- Full application (detail view) ---

const candidateSheetNextActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('review_application'), activityId: uuidSchema }),
  z.object({ kind: z.literal('schedule_interview'), activityId: uuidSchema }),
  z.object({ kind: z.literal('view_interview'), activityId: uuidSchema, interviewId: uuidSchema }),
  z.object({ kind: z.literal('submit_feedback'), activityId: uuidSchema, interviewId: uuidSchema.nullable() }),
  z.object({ kind: z.literal('make_stage_decision'), activityId: uuidSchema }),
  z.object({ kind: z.literal('send_email'), activityId: uuidSchema }),
  z.object({ kind: z.literal('reopen_consideration'), targetStageId: uuidSchema.nullable() }),
  z.object({ kind: z.literal('open_offer'), offerId: uuidSchema }),
]);

const candidateSheetCapabilitiesSchema = z.object({
  candidate: z.object({
    canEditProfile: z.boolean(),
    canManageFiles: z.boolean(),
    canManageTags: z.boolean(),
    canCreateNote: z.boolean(),
    canViewPrivateData: z.boolean(),
    canConsiderForJob: z.boolean(),
  }),
  consideration: z.object({
    canMoveStage: z.boolean(),
    canMarkHired: z.boolean(),
    canArchive: z.boolean(),
    canReopen: z.boolean(),
    canTransfer: z.boolean(),
    canSchedule: z.boolean(),
    canSendEmail: z.boolean(),
    canSubmitFeedback: z.boolean(),
    canModerateFeedback: z.boolean(),
  }),
});

const candidateSheetActionStateSchema = z.object({
  status: z.enum([
    'action_required',
    'waiting_candidate_booking',
    'waiting_interview',
    'waiting_feedback',
    'waiting_decision',
    'read_only',
    'complete',
    'no_action',
  ]),
  blockedReason: z.enum(['terminal_consideration', 'identity_processing']).nullable(),
  nextAction: candidateSheetNextActionSchema.nullable(),
});

const candidateSheetFeedbackProgressSchema = z.object({
  requiredCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  currentUserRequired: z.boolean(),
  currentUserSubmitted: z.boolean(),
});

const candidateSheetActivityMemberSchema = z.object({
  userId: uuidSchema,
  name: z.string().nullable(),
  email: z.string().nullable(),
  isActive: z.boolean(),
});

export const candidateSheetStageActivitySchema = z.discriminatedUnion('activityType', [
  z.object({
    id: uuidSchema,
    stageId: uuidSchema,
    activityType: z.literal('schedule_interview'),
    activityOrder: z.number().int().nonnegative(),
    interviewId: uuidSchema,
    interviewTitle: z.string(),
    durationMinutes: z.number().int().positive(),
    defaultInterviewers: z.array(
      candidateSheetActivityMemberSchema.extend({ role: z.enum(['interviewer', 'shadow', 'lead']) }),
    ),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  z.object({
    id: uuidSchema,
    stageId: uuidSchema,
    activityType: z.literal('send_email'),
    activityOrder: z.number().int().nonnegative(),
    emailTemplateId: uuidSchema,
    emailTemplateName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  z.object({
    id: uuidSchema,
    stageId: uuidSchema,
    activityType: z.literal('application_review'),
    activityOrder: z.number().int().nonnegative(),
    reviewers: z.array(candidateSheetActivityMemberSchema),
    feedbackFormId: uuidSchema.nullable(),
    feedbackFormTitle: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
]);

export type CandidateSheetStageActivity = z.infer<typeof candidateSheetStageActivitySchema>;

const candidateSheetCurrentActivitySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('schedule_interview'),
    activityId: uuidSchema,
    canAct: z.boolean(),
  }),
  z.object({
    kind: z.literal('send_email'),
    activityId: uuidSchema,
    canAct: z.boolean(),
  }),
  z.object({
    kind: z.literal('application_review'),
    activityId: uuidSchema,
    canAct: z.boolean(),
    feedback: candidateSheetFeedbackProgressSchema,
  }),
  z.object({
    kind: z.literal('interview_feedback'),
    activityId: uuidSchema.nullable(),
    interviewEventId: uuidSchema,
    title: z.string(),
    scheduledAt: z.string().nullable(),
    canAct: z.boolean(),
    feedback: candidateSheetFeedbackProgressSchema,
  }),
]);

export const candidateSheetConsiderationContextSchema = z.object({
  job: z.object({
    id: uuidSchema,
    title: z.string(),
    status: jobStatusSchema,
  }),
  stage: z
    .object({
      id: uuidSchema,
      name: z.string(),
      enteredAt: z.string().nullable(),
    })
    .nullable(),
  attribution: z.object({
    origin: z.enum(['public_apply', 'recruiter_add', 'api_import', 'transfer']),
    sourceId: uuidSchema.nullable(),
    sourceName: z.string().nullable(),
    creditedTo: uuidSchema.nullable(),
  }),
  hiringTeam: z.array(
    z.object({
      userId: uuidSchema,
      name: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      role: z.enum(['hiring_manager', 'hiring_member']),
    }),
  ),
  lineage: z.object({
    rootApplicationId: uuidSchema,
    currentApplicationId: uuidSchema,
    applicationIds: z.array(uuidSchema),
  }),
  capabilities: candidateSheetCapabilitiesSchema,
  actionState: candidateSheetActionStateSchema,
  stageActivities: z.array(candidateSheetStageActivitySchema),
  currentActivities: z.array(candidateSheetCurrentActivitySchema),
});

export type CandidateSheetNextAction = z.infer<typeof candidateSheetNextActionSchema>;
export type CandidateSheetCapabilities = z.infer<typeof candidateSheetCapabilitiesSchema>;
export type CandidateSheetActionState = z.infer<typeof candidateSheetActionStateSchema>;
export type CandidateSheetCurrentActivity = z.infer<typeof candidateSheetCurrentActivitySchema>;
export type CandidateSheetConsiderationContext = z.infer<typeof candidateSheetConsiderationContextSchema>;

export const reviewStatusSchema = z.object({
  totalReviewers: z.number(),
  submittedReviewers: z.number(),
  currentUserHasPendingReview: z.boolean(),
  currentUserHasSubmittedReview: z.boolean(),
  needsDecision: z.boolean(),
});

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const applicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  candidateId: z.string().nullable(),
  searchProjection: applicationSearchProjectionSchema.nullable(),
  processing: applicationProcessingStatusSchema.nullable(),
  criterionSummary: criterionSummarySchema.nullable(),
  criterionAssessments: z.array(criteriaAssessmentItemSchema),
  appliedAt: z.string(),
  currentStageId: z.string().nullable(),
  currentStageEnteredAt: z.string().nullable(),
  interviewStatus: interviewStatusEnum.nullable(),
  interviewScheduledAt: z.string().nullable(),
  reviewStatus: reviewStatusSchema,
  terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  terminalOutcomeAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  archivedAtStageId: z.string().nullable(),
  archiveReasonId: z.string().nullable(),
  archiveReasonLabel: z.string().nullable(),
  archiveReasonType: archiveReasonTypeSchema.nullable(),
  hasResume: z.boolean(),
  resumeFileId: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tagIds: z.array(uuidSchema),
  considerationContext: candidateSheetConsiderationContextSchema,
});

export type ApplicationApiResponse = z.infer<typeof applicationSchema>;

export const otherApplicationsResponseSchema = z.object({
  data: z.array(otherApplicationSummarySchema),
  total: z.number().int().nonnegative(),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type OtherApplicationsResponse = z.infer<typeof otherApplicationsResponseSchema>;

const myApplicationJobSchema = z.object({
  id: z.string(),
  orgSlug: z.string().nullable(),
  postingSlug: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  title: z.string().nullable(),
  company: companyInfoSchema.nullable(),
  location: z.array(locationEntrySchema).nullable(),
  locationType: z.string().nullable(),
  status: z.string().nullable(),
});

const candidateApplicationStatusSchema = z.object({
  state: z.enum(['submitted', 'application_closed']),
  reason: z.enum([
    'application_submitted',
    'application_archived',
    'hired',
    'candidate_withdrew',
    'candidate_unresponsive',
    'rejected_by_org',
    'transferred',
  ]),
  needsAction: z.boolean(),
});

export const myApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  archivedAt: z.string().nullable().optional().default(null),
  archiveReasonType: archiveReasonTypeSchema.nullable().optional().default(null),
  appliedAt: z.string().nullable(),
  terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  terminalOutcomeAt: z.string().nullable(),
  candidateStatus: candidateApplicationStatusSchema,
  createdAt: z.string(),
  job: myApplicationJobSchema.nullable(),
});

export type MyApplicationResponse = z.infer<typeof myApplicationSchema>;

export const myApplicationStatusSchema = z.object({
  hasApplied: z.boolean(),
});

// --- Stage change ---

const stageChangeActivitySchema = z.object({
  id: uuidSchema,
  interviewId: uuidSchema,
  interviewTitle: z.string(),
  durationMinutes: z.number(),
  defaultInterviewers: z.array(z.object({ userId: uuidSchema, role: z.string() })).nullable(),
  activityOrder: z.number(),
});

export const stageChangeSchema = z.object({
  id: z.string(),
  currentStageId: z.string(),
  stage: z.object({
    id: z.string(),
    name: z.string(),
  }),
  activities: z.array(stageChangeActivitySchema).optional().default([]),
});

// --- Public apply orchestration ---

const processingGrantWrappedKeySchema = z
  .object({
    slot: z.enum(['identity', 'profile', 'resume']),
    purpose: z.enum(['candidate_identity_input', 'candidate_profile_input', 'encrypted_file']),
    subjectId: uuidSchema,
    fieldId: z.string().min(1).max(255),
    wrappedKey: envelopeKeySchema,
  })
  .strict();

export type ProcessingGrantWrappedKey = z.infer<typeof processingGrantWrappedKeySchema>;

const applicationFilePolicySchema = z
  .object({
    kinds: z
      .object({
        resume: z
          .object({
            maxPlaintextBytes: z.number().int().positive(),
            mimeTypes: z.array(z.string()),
          })
          .strict(),
        attachment: z
          .object({
            maxPlaintextBytes: z.number().int().positive(),
            mimeTypes: z.array(z.string()),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export const applicationPrepareSchema = z
  .object({
    kind: z.literal('prepared'),
    applicationId: uuidSchema,
    formSnapshotHash: bytes32HexSchema,
    processingGrant: z
      .object({
        id: uuidSchema,
        processorPublicKey: publicEncryptionKeySchema,
      })
      .strict(),
    filePolicy: applicationFilePolicySchema,
    vaultKey: vaultKeySchema,
  })
  .strict();

export type ApplicationPrepare = z.infer<typeof applicationPrepareSchema>;

export const applicationSubmitDispositionSchema = z
  .object({ state: z.literal('completed'), applicationId: uuidSchema })
  .strict();

export type ApplicationSubmitDisposition = z.infer<typeof applicationSubmitDispositionSchema>;

export const applicationPreparationResultSchema = z.discriminatedUnion('kind', [
  applicationPrepareSchema,
  z
    .object({
      kind: z.literal('existing'),
      applicationId: uuidSchema,
      disposition: applicationSubmitDispositionSchema,
    })
    .strict(),
]);

const finalizeIdentityInputSchema = z
  .object({
    questionId: uuidSchema,
    envelope: encryptedEnvelopeSchema.refine(
      (envelope) => envelope.purpose === 'candidate_identity_input',
      'Expected candidate identity input envelope',
    ),
  })
  .strict();

const finalizeCandidateProfileInputSchema = encryptedEnvelopeSchema.refine(
  (envelope) => envelope.purpose === 'candidate_profile_input',
  'Expected candidate profile input envelope',
);

const aiCriteriaEvaluationChoiceSchema = z
  .object({
    policyEnabled: z.boolean(),
    optOut: z.boolean(),
  })
  .strict();

const finalizeApplicationBaseSchema = z
  .object({
    formSnapshotHash: bytes32HexSchema,
    candidateIdentityInputs: z.array(finalizeIdentityInputSchema).min(1).max(10),
    candidateProfileInput: finalizeCandidateProfileInputSchema,
    answerEnvelopes: z
      .array(
        z
          .object({
            visibility: z.enum(['standard', 'private']),
            questionIds: z.array(uuidSchema).min(1),
            answers: encryptedEnvelopeSchema,
          })
          .strict(),
      )
      .max(8),
    uploadedFileIds: z.array(uuidSchema).max(20),
    aiCriteriaEvaluation: aiCriteriaEvaluationChoiceSchema,
    processingGrantId: uuidSchema,
    wrappedKeys: z.array(processingGrantWrappedKeySchema).min(2).max(12),
  })
  .strict();

export const finalizeApplicationInputSchema = finalizeApplicationBaseSchema;
export type FinalizeApplicationInput = z.infer<typeof finalizeApplicationInputSchema>;

export const applicationFileReservationSchema = z
  .object({ fileId: uuidSchema, uploadToken: z.string(), expiresAt: z.string() })
  .strict();
export const applicationFileUploadSchema = z.object({ fileId: uuidSchema, status: z.literal('uploaded') }).strict();

export const emailDeliveryGrantSchema = z.object({
  id: uuidSchema,
  recipient: z.string().regex(PROCESSOR_RECIPIENT_REGEX),
  processorPublicKey: publicEncryptionKeySchema,
  applicationId: uuidSchema,
  expiresAt: z.string(),
});

// --- Recipient key ---

export const recipientKeySchema = z.object({
  publicKey: publicEncryptionKeySchema.nullable(),
  userKeyVersion: z.number().int().positive().nullable(),
});

// --- Decrypted application (client-side, after vault decryption) ---
