import { z } from 'zod';
import { candidateProfileValuesSchema } from '../candidate-profile';
import { UNSIGNED_BIGINT_DECIMAL_REGEX } from '../patterns';
import { sha256FingerprintSchema } from './encoding';
import { encryptedEnvelopeSchema } from './envelope';

export const CANDIDATE_SEARCH_SOURCE_BATCH_SIZE = 8;

export const candidateSearchDisplaySchema = candidateProfileValuesSchema.pick({
  firstName: true,
  lastName: true,
  location: true,
  currentTitle: true,
  currentCompany: true,
});

export type CandidateSearchDisplay = z.infer<typeof candidateSearchDisplaySchema>;

export const candidateSearchIdSchema = z.uuid();
const candidateSearchFirstSeenAtSchema = z.iso.datetime({ offset: true });

export const candidateSearchScopeSchema = z
  .object({ orgId: candidateSearchIdSchema, scopeToken: z.string().min(1).max(512) })
  .strict();

export const candidateSearchHandleSchema = candidateSearchScopeSchema
  .extend({ generation: z.number().int().positive() })
  .strict();

export const candidateSearchReferenceSchema = z
  .object({
    candidateId: candidateSearchIdSchema,
    profileRevision: z.number().int().positive(),
    profileFingerprint: sha256FingerprintSchema.nullable(),
  })
  .strict();

export const candidateSearchFilterSchema = z
  .object({
    profileText: z.string().max(200).optional(),
    email: z.string().max(320).optional(),
    cityIds: z.array(z.number().int().positive()).min(1).max(20).optional(),
    countries: z.array(z.string().length(2)).min(1).max(20).optional(),
  })
  .strict();

export const candidateSearchEncryptedDocumentSchema = candidateSearchReferenceSchema
  .extend({ profile: encryptedEnvelopeSchema.nullable() })
  .strict()
  .refine((document) => (document.profile === null) === (document.profileFingerprint === null));

export const candidateSearchProfileDocumentSchema = candidateSearchEncryptedDocumentSchema.safeExtend({
  firstSeenAt: candidateSearchFirstSeenAtSchema,
});

export const candidateSearchPositionSchema = z
  .string()
  .regex(UNSIGNED_BIGINT_DECIMAL_REGEX)
  .pipe(z.string().refine((value) => BigInt(value) <= 9223372036854775807n));

export const candidateSearchCursorSchema = z.string().min(1).max(4096).nullable();
const scopeTokenSchema = z.string().min(1).max(512);

export const candidateCorpusBootstrapResponseSchema = z
  .object({
    corpusVersion: z.literal(1),
    projectionWorkAvailable: z.boolean(),
    head: candidateSearchPositionSchema,
    upperCandidateId: candidateSearchIdSchema.nullable(),
    scopeToken: scopeTokenSchema,
    profiles: z.array(candidateSearchProfileDocumentSchema).max(200),
    nextCursor: candidateSearchCursorSchema,
  })
  .strict();

export const candidateCorpusChangeSchema = z.discriminatedUnion('operation', [
  candidateSearchProfileDocumentSchema.safeExtend({
    operation: z.literal('upsert'),
    sequence: candidateSearchPositionSchema,
  }),
  z
    .object({
      operation: z.literal('delete'),
      candidateId: candidateSearchIdSchema,
      sequence: candidateSearchPositionSchema,
    })
    .strict(),
]);

export const candidateCorpusChangesResponseSchema = z
  .object({
    scopeToken: scopeTokenSchema,
    events: z.array(candidateCorpusChangeSchema).max(200),
    nextCursor: candidateSearchPositionSchema,
    throughCursor: candidateSearchPositionSchema,
    head: candidateSearchPositionSchema,
    caughtUp: z.boolean(),
    projectionWorkAvailable: z.boolean(),
  })
  .strict();

export const candidateCorpusHydrateResponseSchema = z
  .object({
    scopeToken: scopeTokenSchema,
    head: candidateSearchPositionSchema,
    profiles: z.array(candidateSearchProfileDocumentSchema).max(200),
    unavailable: z.array(candidateSearchIdSchema).max(200),
  })
  .strict();

export const candidateSearchEncryptedBatchSchema = z.array(candidateSearchEncryptedDocumentSchema).max(200);

export type CandidateSearchScope = z.infer<typeof candidateSearchScopeSchema>;
export type CandidateSearchHandle = z.infer<typeof candidateSearchHandleSchema>;
export type CandidateSearchReference = z.infer<typeof candidateSearchReferenceSchema>;
export type CandidateSearchFilter = z.infer<typeof candidateSearchFilterSchema>;
export type CandidateSearchEncryptedDocument = z.infer<typeof candidateSearchEncryptedDocumentSchema>;
export type CandidateSearchProfileDocument = z.infer<typeof candidateSearchProfileDocumentSchema>;

export const candidateSearchIdsSchema = z.array(candidateSearchIdSchema).max(200);
export const candidateSearchReferencesSchema = z.array(candidateSearchReferenceSchema).max(200);
