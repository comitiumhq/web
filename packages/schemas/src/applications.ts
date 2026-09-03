import { envelopeKeySchema, publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { z } from 'zod';
import { archiveReasonTypeSchema } from './archive-reason-type';
import { encryptedEnvelopeSchema } from './common';
import { formSubmissionFieldValueSchema } from './forms/form-submission';
import { interviewStatusEnum } from './interview-status';
import { userWalletAuthorizationPayloadSchema } from './onchain-operations';
import { PROCESSOR_RECIPIENT_REGEX } from './patterns';
import {
  addressSchema,
  bytes32HexSchema,
  decimalIntegerStringSchema,
  nonZeroBytes32HexSchema,
  uuidSchema,
  walletAddressSchema,
} from './public';
import { companyInfoSchema, jobCommitmentStatusSchema, jobStatusSchema, locationEntrySchema } from './public-jobs';
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

const escoConceptUriSchema = z.url().startsWith('http://data.europa.eu/esco/');
const onetSoftwareSkillIdSchema = z.string().regex(/^urn:onet:software:[0-9a-f]{64}$/);
const skillConceptIdSchema = z.union([escoConceptUriSchema, onetSoftwareSkillIdSchema]);

export const applicationSearchProjectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    skillIds: z.array(skillConceptIdSchema).max(100),
    occupationIds: z.array(escoConceptUriSchema).max(30),
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

const applicationResponseKindSchema = z.enum([
  'rejection_sent',
  'interview_scheduled',
  'availability_requested',
  'assessment_requested',
]);

export const applicationTerminalOutcomeSchema = z.enum([
  'hired',
  'employer_rejected',
  'candidate_withdrew',
  'candidate_unresponsive',
  'transferred',
  'employer_deadline_expired',
  'imported_terminal_unknown',
]);

export type ApplicationTerminalOutcome = z.infer<typeof applicationTerminalOutcomeSchema>;

const applicationCommitmentStatusSchema = z.enum(['pending_signature', 'submitted', 'confirmed', 'failed', 'expired']);

// --- Other applications (cross-job sidebar) ---

const otherApplicationSummarySchema = z.object({
  id: z.string(),
  jobId: z.string(),
  jobOnChainId: z.number().nullable(),
  jobTitle: z.string().nullable(),
  appliedAt: z.string(),
  currentStageId: z.string().nullable(),
  terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  terminalOutcomeAt: z.string().nullable(),
  currentStageName: z.string().nullable(),
  isResponded: z.boolean(),
  archivedAt: z.string().nullable(),
  duplicateAttemptCount: z.number().int().nonnegative(),
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
  z.object({ kind: z.literal('respond_to_application'), responseDeadline: z.string().nullable() }),
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
  blockedReason: z.enum(['commitment_settling', 'terminal_consideration', 'identity_processing']).nullable(),
  nextAction: candidateSheetNextActionSchema.nullable(),
});

const candidateSheetFeedbackProgressSchema = z.object({
  requiredCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  currentUserRequired: z.boolean(),
  currentUserSubmitted: z.boolean(),
});

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
  responseDeadline: z.string().nullable(),
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
  isResponded: z.boolean(),
  respondedAt: z.string().nullable(),
  hasResume: z.boolean(),
  resumeFileId: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tagIds: z.array(uuidSchema),
  duplicateAttemptCount: z.number().int().nonnegative(),
  duplicateOfApplicationId: uuidSchema.nullable(),
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

const duplicateApplicationAttemptSchema = z.object({
  id: uuidSchema,
  candidateId: uuidSchema.nullable(),
  candidateProfile: encryptedEnvelopeSchema.nullable(),
  onchainApplicationId: bytes32HexSchema,
  applicantAddress: walletAddressSchema,
  jobCommitmentId: uuidSchema,
  commitmentStatus: applicationCommitmentStatusSchema,
  appliedAt: z.string(),
  responseDeadline: z.string().nullable(),
  isResponded: z.boolean(),
  respondedAt: z.string().nullable(),
  currentStageId: uuidSchema.nullable(),
  terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  terminalOutcomeAt: z.string().nullable(),
});

export type DuplicateApplicationAttempt = z.infer<typeof duplicateApplicationAttemptSchema>;

export const duplicateApplicationAttemptsResponseSchema = z.object({
  data: z.array(duplicateApplicationAttemptSchema),
  total: z.number().int().nonnegative(),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type DuplicateApplicationAttemptsResponse = z.infer<typeof duplicateApplicationAttemptsResponseSchema>;

// --- My applications (applicant view) ---

const myApplicationJobSchema = z.object({
  id: z.string(),
  jobId: z.number(),
  chainId: z.number(),
  commitmentContract: addressSchema,
  orgSlug: z.string().nullable(),
  postingSlug: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  title: z.string().nullable(),
  company: companyInfoSchema.nullable(),
  location: z.array(locationEntrySchema).nullable(),
  locationType: z.string().nullable(),
  status: z.string().nullable(),
  commitmentStatus: jobCommitmentStatusSchema.nullable(),
});

const candidateApplicationStatusSchema = z.object({
  state: z.enum(['submitted', 'in_process', 'action_needed', 'application_closed']),
  reason: z.enum([
    'application_archived',
    'awaiting_response',
    'candidate_withdrew',
    'candidate_unresponsive',
    'employer_deadline_expired',
    'hired',
    'job_closed',
    'rejected_by_org',
    'response_overdue',
    'response_received',
    'response_window_closed',
    'transferred',
  ]),
  needsAction: z.boolean(),
});

const applicantStakeReturnGroupSchema = z.object({
  chainId: z.number().int().positive(),
  commitmentContract: addressSchema,
  applicationIds: z.array(bytes32HexSchema).min(1),
});

export const applicantStakeReturnAvailabilitySchema = z.object({
  count: z.number().int().nonnegative(),
  totalAmount: decimalIntegerStringSchema,
  groups: z.array(applicantStakeReturnGroupSchema),
});

export type ApplicantStakeReturnAvailability = z.infer<typeof applicantStakeReturnAvailabilitySchema>;

export const myApplicationSchema = z.object({
  id: z.string(),
  applicationId: bytes32HexSchema,
  jobId: z.string(),
  archivedAt: z.string().nullable().optional().default(null),
  archiveReasonType: archiveReasonTypeSchema.nullable().optional().default(null),
  appliedAt: z.string().nullable(),
  isResponded: z.boolean(),
  respondedAt: z.string().nullable(),
  responseKind: applicationResponseKindSchema.nullable().optional().default(null),
  stakeAmount: z.string().nullable(),
  stakeWithdrawn: z.boolean(),
  withdrawnAt: z.string().nullable().optional().default(null),
  responseDeadline: z.string().nullable(),
  terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  terminalOutcomeAt: z.string().nullable(),
  candidateStatus: candidateApplicationStatusSchema,
  createdAt: z.string(),
  job: myApplicationJobSchema.nullable(),
});

export type MyApplicationResponse = z.infer<typeof myApplicationSchema>;

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

const userWalletApplicationRequestSchema = userWalletAuthorizationPayloadSchema.extend({
  operationId: uuidSchema,
});

export type UserWalletApplicationRequest = z.infer<typeof userWalletApplicationRequestSchema>;

export const applicationSubmitDispositionSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('wallet_confirmation'), operation: userWalletApplicationRequestSchema }).strict(),
  z.object({ state: z.literal('confirming'), operationId: uuidSchema }).strict(),
  z.object({ state: z.literal('completed'), operationId: uuidSchema }).strict(),
  z.object({ state: z.literal('try_again'), operationId: uuidSchema }).strict(),
]);

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

export const finalizeApplicationInputSchema = z
  .object({
    applicationId: bytes32HexSchema,
    applicationSalt: nonZeroBytes32HexSchema,
    stake: decimalIntegerStringSchema,
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
    fieldValues: z.array(formSubmissionFieldValueSchema).max(500),
    uploadedFileIds: z.array(uuidSchema).max(20),
    aiCriteriaEvaluation: aiCriteriaEvaluationChoiceSchema,
    processingGrantId: uuidSchema,
    wrappedKeys: z.array(processingGrantWrappedKeySchema).min(2).max(12),
  })
  .strict();

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
});

// --- Decrypted application (client-side, after vault decryption) ---
