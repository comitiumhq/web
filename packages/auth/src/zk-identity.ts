import type { ProofResult } from '@zkpassport/sdk';
import { z } from 'zod';

const zkIdentityFailureCodeSchema = z.enum(['proof_invalid', 'identity_already_linked']);

const verifiedZkIdentitySchema = z
  .object({
    status: z.literal('verified'),
    verifiedAt: z.iso.datetime({ offset: true }),
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
type ZkIdentityCompletionResult = z.infer<typeof zkIdentityCompletionResultSchema>;

export const zkIdentityAttemptSchema = z
  .object({
    attemptId: z.guid(),
    challenge: z.string().regex(/^[a-f0-9]{64}$/),
    request: z
      .object({
        domain: z.literal('comitium.co'),
        oprfKeyId: z.literal('1'),
        policyId: z.literal('policy-1'),
        proofMode: z.literal('fast'),
      })
      .strict(),
  })
  .strict();

export type ZkIdentityAttempt = z.infer<typeof zkIdentityAttemptSchema>;

export interface CompleteZkIdentityAttemptInput {
  challenge: string;
  proofs: ProofResult[];
}

export interface ZkIdentityApi {
  completeZkIdentityAttempt(
    attemptId: string,
    input: CompleteZkIdentityAttemptInput,
  ): Promise<ZkIdentityCompletionResult>;
  createZkIdentityAttempt(): Promise<ZkIdentityAttempt>;
  getZkIdentityStatus(): Promise<ZkIdentityStatus>;
}
