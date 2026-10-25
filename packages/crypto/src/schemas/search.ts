import { z } from 'zod';
import { HMAC_SHA256_HEX_REGEX } from '../patterns';

export const locationHashValueSchema = z.object({ cityId: z.number() });
export const hmacSha256HexSchema = z
  .string()
  .regex(HMAC_SHA256_HEX_REGEX, 'Expected hex-encoded HMAC-SHA256 (64 chars)');
export const CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION = 1;

export const candidateProfileSearchProjectionSchema = z
  .object({
    version: z.literal(CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION),
    contactEmailDigest: hmacSha256HexSchema.nullable(),
    locationCityDigest: hmacSha256HexSchema.nullable(),
    locationCountryDigest: hmacSha256HexSchema.nullable(),
  })
  .strict();

export type CandidateProfileSearchProjection = z.infer<typeof candidateProfileSearchProjectionSchema>;

const fieldValueIdentitySchema = z.object({
  questionId: z.uuid(),
  reusableFieldId: z.uuid(),
  ordinal: z.number().int().nonnegative(),
});

export const formSubmissionFieldProjectionSchema = z.discriminatedUnion('kind', [
  fieldValueIdentitySchema.extend({ kind: z.literal('digest'), value: hmacSha256HexSchema }),
  fieldValueIdentitySchema.extend({ kind: z.literal('number'), value: z.string() }),
  fieldValueIdentitySchema.extend({ kind: z.literal('timestamp'), value: z.string() }),
]);

export type FormSubmissionFieldProjection = z.infer<typeof formSubmissionFieldProjectionSchema>;
