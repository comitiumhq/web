import { z } from 'zod';
import { candidateProfileValuesSchema } from '../candidate-profile';
import { ENVELOPE_MAX_DECOMPRESSED_BYTES } from '../payload-compression';
import {
  candidateCorpusBootstrapResponseSchema,
  candidateCorpusChangesResponseSchema,
  candidateSearchCursorSchema,
  candidateSearchDisplaySchema,
  candidateSearchIdSchema,
  candidateSearchPositionSchema,
  candidateSearchProfileDocumentSchema,
  candidateSearchReferenceSchema,
  candidateSearchScopeSchema,
} from './candidate-search';
import { aesGcmIvSchema, sha256FingerprintSchema } from './encoding';
import { wrappedKeySchema } from './keys';

export const CANDIDATE_SEARCH_CACHE_VERSION = 5;
export const CANDIDATE_SEARCH_POSTING_BUCKET_SIZE = 1024;
export const CANDIDATE_SEARCH_REFERENCE_CHUNK_SIZE = 64;

export const CANDIDATE_SEARCH_CACHE_LIMITS = {
  maxPostingReadBatch: 32,
  maxQueryAddresses: CANDIDATE_SEARCH_REFERENCE_CHUNK_SIZE * 12,
  maxBucketBytes: 20 * 1024,
  maxRecordBytes: 64 * 1024,
  maxPostingBytes: ENVELOPE_MAX_DECOMPRESSED_BYTES,
  maxQueryBytes: 16 * 1024 * 1024,
  maxCommitBytes: 64 * 1024 * 1024,
  maxBatchTermPostings: 100_000,
  maxRecordExpandedBytes: 1024 * 1024,
  maxBatchExpandedBytes: 16 * 1024 * 1024,
} as const;

const candidateSearchFieldsSchema = candidateSearchDisplaySchema
  .extend({ email: candidateProfileValuesSchema.shape.email })
  .strict();

const candidateSearchDataSchema = z
  .object({
    v: z.literal(2),
    ct: z
      .instanceof(Uint8Array)
      .refine((value) => value.byteLength <= CANDIDATE_SEARCH_CACHE_LIMITS.maxPostingBytes + 16),
    iv: aesGcmIvSchema,
    zip: z.enum(['none', 'gzip']),
    plaintextBytes: z.number().int().nonnegative().max(CANDIDATE_SEARCH_CACHE_LIMITS.maxPostingBytes),
  })
  .strict();

export const candidateSearchPayloadSchema = z
  .object({
    fields: candidateSearchFieldsSchema.nullable(),
    unreadable: z.boolean(),
  })
  .strict();

export const candidateSearchPostingSchema = z
  .array(z.array(z.number().int().positive().safe()).max(CANDIDATE_SEARCH_POSTING_BUCKET_SIZE))
  .max(1);

export const candidateSearchRegistrySchema = z
  .object({
    id: z.number().int().positive().safe(),
    terms: z.array(z.string().max(16 * 1024)).max(CANDIDATE_SEARCH_CACHE_LIMITS.maxBatchTermPostings),
  })
  .strict();

export const candidateSearchLibraryCommitSchema = z.object({
  map: z.map(z.string(), candidateSearchPostingSchema),
  reg: z.set(z.number().int().positive().safe()).max(200),
  ctx: z.map(z.unknown(), z.unknown()).refine((value) => value.size === 0),
  commit_task: z
    .array(
      z
        .object({
          del: z.number().int().positive().safe().optional(),
          ins: z.number().int().positive().safe().optional(),
        })
        .strict(),
    )
    .max(400),
});

export const candidateSearchCacheContextSchema = candidateSearchScopeSchema
  .extend({
    corpusVersion: z.literal(1),
    userId: candidateSearchIdSchema,
    keyVersion: z.number().int().positive(),
    encryptedKeyFingerprint: sha256FingerprintSchema,
  })
  .strict();

export const candidateSearchCacheBindingSchema = z
  .object({
    key: sha256FingerprintSchema,
    generation: candidateSearchIdSchema,
    context: candidateSearchCacheContextSchema,
    wrappedKey: wrappedKeySchema.nullable(),
  })
  .strict();

const namespaceSchema = candidateSearchCacheBindingSchema
  .extend({
    phase: z.enum(['bootstrap', 'catchup', 'complete']),
    bootstrapCursor: candidateSearchCursorSchema,
    bootstrapHead: candidateSearchPositionSchema.nullable(),
    appliedCursor: candidateSearchPositionSchema,
    recordCount: z.number().int().nonnegative().safe(),
    unreadableCount: z.number().int().nonnegative().safe(),
    indexRevision: z.number().int().nonnegative().safe(),
    nextDocumentId: z.number().int().positive().safe(),
    accountedBytes: z.number().int().nonnegative().safe(),
    lastUsedAt: z.number().int().nonnegative().safe(),
  })
  .strict();

export const catalogHeaderSchema = z.object({ version: z.number().int() });
export const catalogSchema = z
  .object({
    version: z.literal(CANDIDATE_SEARCH_CACHE_VERSION),
    fence: candidateSearchIdSchema,
    namespaces: z.array(namespaceSchema).max(8),
  })
  .strict();

export const storedProfileSchema = candidateSearchReferenceSchema
  .extend({
    localId: z.number().int().positive().safe(),
    unreadable: z.boolean(),
    searchData: candidateSearchDataSchema,
    accountedBytes: z.number().int().nonnegative().safe(),
  })
  .strict();

export const optionalStoredProfileSchema = storedProfileSchema.optional();
export const storedPostingSchema = z
  .object({
    data: candidateSearchDataSchema,
    accountedBytes: z.number().int().nonnegative().safe(),
  })
  .strict();

export const optionalStoredPostingSchema = storedPostingSchema.optional();

export const candidateSearchCommitSchema = z.discriminatedUnion('kind', [
  candidateCorpusBootstrapResponseSchema.omit({ projectionWorkAvailable: true }).extend({
    kind: z.literal('bootstrap'),
    expectedCursor: candidateSearchCursorSchema,
  }),
  candidateCorpusChangesResponseSchema
    .omit({ projectionWorkAvailable: true })
    .extend({ kind: z.literal('changes'), since: candidateSearchPositionSchema }),
  z
    .object({
      kind: z.literal('hydrate'),
      head: candidateSearchPositionSchema,
      profiles: z.array(candidateSearchProfileDocumentSchema).max(200),
    })
    .strict(),
]);

const candidateSearchCacheErrorCodeSchema = z.enum([
  'changed',
  'capacity',
  'unavailable',
  'quota',
  'invalid',
  'unsupported',
  'blocked',
]);

export const serializedCandidateSearchCacheErrorSchema = z
  .object({
    kind: z.literal('comitium.candidate-search-cache-error'),
    code: candidateSearchCacheErrorCodeSchema,
  })
  .strict();

export type CandidateSearchFields = z.infer<typeof candidateSearchFieldsSchema>;
export type CandidateSearchData = z.infer<typeof candidateSearchDataSchema>;
export type CandidateSearchPayload = z.infer<typeof candidateSearchPayloadSchema>;
export type CandidateSearchPosting = z.infer<typeof candidateSearchPostingSchema>;
export type CandidateSearchCacheContext = z.infer<typeof candidateSearchCacheContextSchema>;
export type CandidateSearchCacheBinding = z.infer<typeof candidateSearchCacheBindingSchema>;
export type CandidateSearchCacheNamespace = z.infer<typeof namespaceSchema>;
export type CandidateSearchCacheHandle = Pick<CandidateSearchCacheNamespace, 'key' | 'generation'>;
export type CandidateSearchCacheErrorCode = z.infer<typeof candidateSearchCacheErrorCodeSchema>;
export type CandidateSearchCommit = z.infer<typeof candidateSearchCommitSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
export type StoredProfile = z.infer<typeof storedProfileSchema>;
export type StoredPosting = z.infer<typeof storedPostingSchema>;

export type CandidateSearchRegistry = z.infer<typeof candidateSearchRegistrySchema>;
export type CandidateSearchLibraryCommit = z.infer<typeof candidateSearchLibraryCommitSchema>;
