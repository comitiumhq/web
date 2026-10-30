import {
  candidateSearchPositionSchema,
  candidateSearchReferenceSchema,
} from '@comitium/crypto/candidate-search-protocol';
import { z } from 'zod';
import { applicationTerminalOutcomeSchema } from './applications';
import { encryptedEnvelopeSchema } from './common';
import { isDefined } from './guards';
import { COUNTRY_CODE_REGEX, EXCESS_TIMESTAMP_PRECISION_REGEX } from './patterns';
import { uuidSchema } from './public';

const ids = z.array(uuidSchema).min(1).max(100);

const date = z.iso
  .datetime({ offset: true })
  .refine((value) => !EXCESS_TIMESTAMP_PRECISION_REGEX.test(value), 'Search dates support up to six fractional digits');

export const candidateServerPredicateSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal('candidate.tags'), op: z.literal('containsAll'), value: ids.max(20) }).strict(),
  z.object({ field: z.literal('candidate.sourceId'), op: z.literal('in'), value: ids }).strict(),
  z.object({ field: z.literal('candidate.firstSeenAt'), op: z.enum(['gte', 'lt']), value: date }).strict(),
  z
    .object({ field: z.literal('candidate.hasAccessibleApplication'), op: z.literal('eq'), value: z.boolean() })
    .strict(),
]);

export const candidatePrivatePredicateSchema = z.discriminatedUnion('field', [
  z
    .object({ field: z.literal('candidate.profileText'), op: z.literal('allTerms'), value: z.string().max(200) })
    .strict(),
  z.object({ field: z.literal('candidate.email'), op: z.literal('eq'), value: z.string().max(320) }).strict(),
  z
    .object({
      field: z.literal('candidate.cityId'),
      op: z.literal('in'),
      value: z.array(z.number().int().positive()).min(1).max(20),
    })
    .strict(),
  z
    .object({
      field: z.literal('candidate.country'),
      op: z.literal('in'),
      value: z.array(z.string().regex(COUNTRY_CODE_REGEX)).min(1).max(20),
    })
    .strict(),
]);

export const applicationSearchPredicateSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal('application.jobId'), op: z.literal('in'), value: ids }).strict(),
  z.object({ field: z.literal('application.departmentId'), op: z.literal('in'), value: ids }).strict(),
  z.object({ field: z.literal('application.stageId'), op: z.literal('in'), value: ids }).strict(),
  z
    .object({
      field: z.literal('application.outcome'),
      op: z.literal('in'),
      value: z
        .array(z.enum(['active', 'hired', 'archived', 'imported_unknown']))
        .min(1)
        .max(4),
    })
    .strict(),
  z.object({ field: z.literal('application.skillIds'), op: z.literal('containsAll'), value: ids }).strict(),
  z
    .object({ field: z.literal('application.occupationIds'), op: z.literal('containsAll'), value: ids.max(30) })
    .strict(),
  z.object({ field: z.literal('application.sourceId'), op: z.literal('in'), value: ids }).strict(),
  z
    .object({
      field: z.literal('application.sourceType'),
      op: z.literal('in'),
      value: z
        .array(z.enum(['applied', 'referral', 'sourced', 'agency', 'imported', 'other']))
        .min(1)
        .max(10),
    })
    .strict(),
  z.object({ field: z.literal('application.appliedAt'), op: z.enum(['gte', 'lt']), value: date }).strict(),
]);

const definitionFields = {
  version: z.literal(1),
  applicationAny: z
    .object({ all: z.array(applicationSearchPredicateSchema).min(1).max(20) })
    .strict()
    .optional(),
  retrieval: z
    .object({ kind: z.literal('semantic'), query: z.string().trim().min(1).max(200) })
    .strict()
    .optional(),
  sort: z.enum(['first_seen_desc', 'semantic_distance']),
};

export const candidateSearchDefinitionSchema = z
  .object({
    subject: z.literal('candidate'),
    ...definitionFields,
    candidateAll: z.array(z.union([candidateServerPredicateSchema, candidatePrivatePredicateSchema])).max(20),
  })
  .strict()
  .superRefine((definition, ctx) => {
    if (isDefined(definition.retrieval) !== (definition.sort === 'semantic_distance')) {
      ctx.addIssue({ code: 'custom', path: ['sort'], message: 'Retrieval and sort must agree' });
    }

    for (const predicates of [definition.candidateAll, definition.applicationAny?.all ?? []]) {
      const keys = predicates.map((predicate) => `${predicate.field}:${predicate.op}`);

      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({ code: 'custom', message: 'Duplicate predicate' });
      }
    }
  });

export type CandidateSearchDefinition = z.infer<typeof candidateSearchDefinitionSchema>;
export type CandidateServerPredicate = z.infer<typeof candidateServerPredicateSchema>;
export type CandidatePrivatePredicate = z.infer<typeof candidatePrivatePredicateSchema>;
export type ApplicationSearchPredicate = z.infer<typeof applicationSearchPredicateSchema>;

export const serverCandidateQuerySchema = z
  .object({
    ...definitionFields,
    candidateAll: z.array(candidateServerPredicateSchema).max(20),
    cursor: z.string().min(1).max(4096).optional(),
    limit: z.number().int().min(1).max(200).default(50),
    localEvaluation: z
      .object({
        corpusVersion: z.literal(1),
        scopeToken: z.string().min(1).max(512),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((query, ctx) => {
    if (isDefined(query.retrieval) !== (query.sort === 'semantic_distance')) {
      ctx.addIssue({ code: 'custom', path: ['sort'], message: 'Retrieval and sort must agree' });
    }
  });

export type ServerCandidateQuery = z.infer<typeof serverCandidateQuerySchema>;

const matchedApplicationSchema = z
  .object({
    applicationId: uuidSchema,
    jobId: uuidSchema,
    jobTitle: z.string().max(255),
    stageId: uuidSchema.nullable(),
    stageName: z.string().max(255).nullable(),
    terminalOutcome: applicationTerminalOutcomeSchema.nullable(),
  })
  .strict();

export const candidateSearchReferenceRowSchema = candidateSearchReferenceSchema
  .extend({
    firstSeenAt: date,
    matchedApplication: matchedApplicationSchema.nullable(),
    matchedEvidence: z.object({ applicationId: uuidSchema, sourceFileId: uuidSchema }).strict().optional(),
    tagIds: z.array(uuidSchema).max(20),
  })
  .strict();

const candidateSearchListRowSchema = candidateSearchReferenceRowSchema
  .extend({ profile: encryptedEnvelopeSchema.nullable() })
  .refine((row) => (row.profile === null) === (row.profileFingerprint === null));

const responseFields = {
  pagination: z
    .object({ nextCursor: z.string().max(4096).nullable(), hasMore: z.boolean() })
    .strict()
    .refine((pagination) => pagination.hasMore === (pagination.nextCursor !== null)),
  queryScopeToken: z.string().min(1).max(512),
  retrieval: z.enum(['exact', 'approximate']),
  coverage: z
    .object({
      professional: z.enum(['not_requested', 'complete', 'incomplete']),
    })
    .strict(),
  exhaustive: z.boolean(),
  consistency: z.literal('live_batches'),
};

export const candidateQueryResponseSchema = z.discriminatedUnion('mode', [
  z
    .object({ ...responseFields, mode: z.literal('list'), data: z.array(candidateSearchListRowSchema).max(200) })
    .strict(),
  z
    .object({
      ...responseFields,
      mode: z.literal('scan'),
      data: z.array(candidateSearchReferenceRowSchema).max(200),
      profileCorpus: z.object({ scopeToken: z.string().min(1).max(512), head: candidateSearchPositionSchema }).strict(),
    })
    .strict(),
]);

export type CandidateQueryResponse = z.infer<typeof candidateQueryResponseSchema>;
export type CandidateSearchReferenceRow = z.infer<typeof candidateSearchReferenceRowSchema>;
export type CandidateSearchListRow = z.infer<typeof candidateSearchListRowSchema>;

export const candidateFilterOptionsInputSchema = z
  .object({
    field: z.enum(['job', 'department', 'source', 'stage']),
    search: z.string().trim().max(100).default(''),
    after: uuidSchema.optional(),
    jobId: uuidSchema.optional(),
  })
  .strict();

export const candidateFilterOptionsResponseSchema = z
  .object({
    data: z.array(z.object({ id: uuidSchema, label: z.string().max(255) }).strict()).max(40),
    nextAfter: uuidSchema.nullable(),
  })
  .strict();

export type CandidateFilterOptionsInput = z.infer<typeof candidateFilterOptionsInputSchema>;
