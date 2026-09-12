import type { ProofResult, Query, QueryResult } from '@zkpassport/sdk';
import { z } from 'zod';

const zkIdentityFailureCodeSchema = z.enum(['proof_invalid', 'identity_already_linked', 'verifier_unavailable']);

export type ZkIdentityFailureCode = 'proof_invalid' | 'identity_already_linked' | 'verifier_unavailable';

export type ZkIdentityStatus =
  | { status: 'not_started' }
  | { status: 'pending'; expiresAt: string }
  | { status: 'failed'; failureCode: ZkIdentityFailureCode }
  | { status: 'expired' }
  | { status: 'verified'; verificationMode: 'live' | 'mock'; verifiedAt: string };

export interface ZkIdentityAttempt {
  attemptId: string;
  challenge: string;
  expiresAt: string;
  request: {
    devMode: boolean;
    domain: string;
    minimumAge: 18;
    proofMode: 'compressed';
    purpose: string;
    scope: 'comitium-account-identity-v1';
    validitySeconds: number;
  };
}

export const zkIdentityStatusSchema: z.ZodType<ZkIdentityStatus> = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not_started') }).strict(),
  z.object({ status: z.literal('pending'), expiresAt: z.iso.datetime({ offset: true }) }).strict(),
  z.object({ status: z.literal('failed'), failureCode: zkIdentityFailureCodeSchema }).strict(),
  z.object({ status: z.literal('expired') }).strict(),
  z
    .object({
      status: z.literal('verified'),
      verificationMode: z.enum(['live', 'mock']),
      verifiedAt: z.iso.datetime({ offset: true }),
    })
    .strict(),
]);

export const zkIdentityAttemptSchema: z.ZodType<ZkIdentityAttempt> = z
  .object({
    attemptId: z.guid(),
    challenge: z.string().regex(/^[a-f0-9]{64}$/),
    expiresAt: z.iso.datetime({ offset: true }),
    request: z
      .object({
        devMode: z.boolean(),
        domain: z.string().min(1),
        minimumAge: z.literal(18),
        proofMode: z.literal('compressed'),
        purpose: z.string().min(1),
        scope: z.literal('comitium-account-identity-v1'),
        validitySeconds: z.number().int().positive(),
      })
      .strict(),
  })
  .strict();

export interface CompleteZkIdentityAttemptInput {
  originalQuery: Query;
  proofs: ProofResult[];
  queryResult: QueryResult;
}

export interface ZkIdentityApi {
  completeZkIdentityAttempt(attemptId: string, input: CompleteZkIdentityAttemptInput): Promise<ZkIdentityStatus>;
  createZkIdentityAttempt(): Promise<ZkIdentityAttempt>;
  getZkIdentityStatus(): Promise<ZkIdentityStatus>;
}
