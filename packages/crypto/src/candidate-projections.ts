import { z } from 'zod';
import { CANDIDATE_PROFILE_MAPPING_FIELDS } from './candidate-profile';
import { encryptedEnvelopeSchema } from './schemas';
import { cryptoContextInputSchema } from './schemas/context';
import {
  type CandidateProfileSearchProjection,
  type FormSubmissionFieldProjection,
  hmacSha256HexSchema,
} from './schemas/search';

export const CANDIDATE_PROJECTOR_VERSIONS = {
  profile_search: 1,
  form_reporting: 1,
  form_profile: 1,
  form_custom_field: 1,
  resume_profile: 1,
} as const;

const revision = z.number().int().positive().max(2_147_483_647);
const uuid = z.uuid();
const digest = hmacSha256HexSchema;
const encryptedInput = z.object({ envelope: encryptedEnvelopeSchema, context: cryptoContextInputSchema });

export const projectionSnapshotSchema = z.object({
  v: z.literal(1),
  formId: uuid,
  formClass: z.string(),
  title: z.string(),
  capturedAt: z.string(),
  sections: z.array(
    z.object({
      id: uuid,
      position: z.number(),
      title: z.string(),
      questions: z.array(
        z.object({
          id: uuid,
          questionType: z.string(),
          prompt: z.string(),
          isRequired: z.boolean(),
          isPrivate: z.boolean(),
          visibility: z.enum(['standard', 'private']),
          isLocked: z.boolean().optional(),
          config: z.object({ candidateProfileField: z.enum(CANDIDATE_PROFILE_MAPPING_FIELDS).optional() }).nullable(),
          reusableField: z
            .object({
              fieldId: uuid,
              valueKind: z.enum(['boolean', 'option', 'number', 'timestamp']),
              optionValueMap: z.record(z.string(), z.number()).optional(),
            })
            .nullable(),
        }),
      ),
    }),
  ),
});

export type ProjectionSnapshot = z.infer<typeof projectionSnapshotSchema>;

const header = {
  workId: uuid,
  generation: revision,
  claimToken: uuid,
  claimedUntil: z.iso.datetime({ offset: true }),
  candidateId: uuid,
  applicationId: uuid.nullable(),
  source: z.object({ id: uuid, revision, visibility: z.enum(['standard', 'private']) }),
  mappingRevision: revision,
  projectorVersion: revision,
};

const formInputs = { snapshot: projectionSnapshotSchema, answers: encryptedInput.nullable() };

export const candidateProjectionItemSchema = z.discriminatedUnion('kind', [
  z.object({
    ...header,
    kind: z.literal('profile_search'),
    expectedProfileRevision: revision,
    inputs: z.object({ profile: encryptedInput.nullable() }),
  }),
  z.object({
    ...header,
    kind: z.literal('form_profile'),
    expectedProfileRevision: revision,
    inputs: z.object({
      ...formInputs,
      profile: encryptedInput.nullable(),
      identityInputs: z.array(encryptedInput.extend({ questionId: uuid })),
    }),
  }),
  z.object({
    ...header,
    kind: z.literal('resume_profile'),
    expectedProfileRevision: revision,
    inputs: z.object({
      profile: encryptedInput.nullable(),
      enrichment: encryptedInput,
      visibility: z.enum(['standard', 'private']),
    }),
  }),
  z.object({ ...header, kind: z.literal('form_reporting'), inputs: z.object(formInputs) }),
  z.object({
    ...header,
    kind: z.literal('form_custom_field'),
    expectedTargetFingerprint: digest,
    inputs: z.object({
      ...formInputs,
      connector: z.object({
        id: uuid,
        questionId: uuid,
        sourceType: z.string(),
        fieldId: uuid,
        fieldType: z.string(),
        optionMapping: z.record(z.string(), z.string()).nullable(),
        unmappedFallback: z.string().nullable(),
      }),
    }),
  }),
]);

export const candidateProjectionClaimResponseSchema = z.object({
  items: z.array(candidateProjectionItemSchema).max(25),
  hasMore: z.boolean(),
  retryAfterMs: z.number().int().nonnegative().max(60_000),
});

export const candidateProjectionApplyResponseSchema = z.object({
  results: z.array(
    z.object({
      workId: uuid,
      status: z.enum(['applied', 'already_current', 'stale', 'forbidden', 'retry_scheduled', 'failed']),
      profileRevision: revision.optional(),
    }),
  ),
  hasMore: z.boolean(),
});

export type CandidateProjectionItem = z.infer<typeof candidateProjectionItemSchema>;
export type CandidateProjectionClaimResponse = z.infer<typeof candidateProjectionClaimResponseSchema>;

export type CandidateProjectionOutput =
  | { kind: 'profile_search'; searchProjection: CandidateProfileSearchProjection }
  | {
      kind: 'profile_merge';
      profile: z.infer<typeof encryptedEnvelopeSchema>;
      searchProjection: CandidateProfileSearchProjection;
    }
  | { kind: 'form_reporting'; fieldValues: FormSubmissionFieldProjection[] }
  | { kind: 'form_custom_field'; encryptedValue: z.infer<typeof encryptedEnvelopeSchema>; valueHash?: string }
  | { kind: 'no_change' }
  | { kind: 'policy_skipped' }
  | { kind: 'retryable_error'; code: 'INPUT_UNREADABLE' | 'WORKER_ERROR' };

export type CandidateProjectionResult = {
  workId: string;
  generation: number;
  claimToken: string;
  sourceRevision: number;
  mappingRevision: number;
  projectorVersion: number;
  expectedProfileRevision?: number;
  expectedTargetFingerprint?: string;
  result: CandidateProjectionOutput;
};

export function projectionResultHeader(item: CandidateProjectionItem): Omit<CandidateProjectionResult, 'result'> {
  return {
    workId: item.workId,
    generation: item.generation,
    claimToken: item.claimToken,
    sourceRevision: item.source.revision,
    mappingRevision: item.mappingRevision,
    projectorVersion: item.projectorVersion,
    ...('expectedProfileRevision' in item ? { expectedProfileRevision: item.expectedProfileRevision } : {}),
    ...('expectedTargetFingerprint' in item ? { expectedTargetFingerprint: item.expectedTargetFingerprint } : {}),
  };
}
