import type { ProofResult } from '@zkpassport/sdk';
import { z } from 'zod';

const zkIdentityFailureCodeSchema = z.enum(['proof_invalid', 'identity_already_linked', 'document_expired']);

const verifiedZkIdentitySchema = z
  .object({
    status: z.literal('verified'),
    verifiedAt: z.iso.datetime({ offset: true }),
    documentExpiresOn: z.iso.date(),
    canReplace: z.boolean(),
  })
  .strict();

export const zkIdentityStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not_started') }).strict(),
  verifiedZkIdentitySchema,
]);

export const zkIdentityCompletionResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('failed'), failureCode: zkIdentityFailureCodeSchema }).strict(),
  verifiedZkIdentitySchema,
]);

export type ZkIdentityStatus = z.infer<typeof zkIdentityStatusSchema>;
export type ZkIdentityFailureCode = z.infer<typeof zkIdentityFailureCodeSchema>;
type ZkIdentityCompletionResult = z.infer<typeof zkIdentityCompletionResultSchema>;

const zkIdentityQuerySchema = z
  .object({
    age: z.object({ gte: z.number().int().min(0).max(99) }).strict(),
    expiry_date: z.object({ disclose: z.literal(true) }).strict(),
    facematch: z.object({ mode: z.literal('strict') }).strict(),
    sanctions: z.object({ countries: z.literal('all'), lists: z.literal('all'), strict: z.boolean() }).strict(),
  })
  .strict();

export const zkIdentityAttemptSchema = z
  .object({
    attemptId: z.guid(),
    challenge: z.string().regex(/^[a-f0-9]{64}$/),
    request: z
      .object({
        domain: z.string().min(1),
        oprfKeyId: z.string().min(1),
        proofMode: z.enum(['fast', 'compressed', 'compressed-evm']),
        purpose: z.string().min(1),
        query: zkIdentityQuerySchema,
        scope: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type ZkIdentityAttempt = z.infer<typeof zkIdentityAttemptSchema>;

export interface CompleteZkIdentityAttemptInput {
  challenge: string;
  proofs: ProofResult[];
  documentExpiresOn: string;
}

export interface ZkIdentityApi {
  completeZkIdentityAttempt(
    attemptId: string,
    input: CompleteZkIdentityAttemptInput,
  ): Promise<ZkIdentityCompletionResult>;
  createZkIdentityAttempt(): Promise<ZkIdentityAttempt>;
  getZkIdentityStatus(): Promise<ZkIdentityStatus>;
}
