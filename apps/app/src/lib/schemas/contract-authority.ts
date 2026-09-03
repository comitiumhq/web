import {
  onchainForwardRequestMessageSchema,
  onchainForwardRequestSignatureSchema,
} from '@comitium/schemas/onchain-operations';
import { bytes32HexSchema, ecdsaSignatureHexSchema } from '@comitium/schemas/public';
import { z } from 'zod';

const contractAuthorityRequestSchema = onchainForwardRequestSignatureSchema;
export type ContractAuthorityRequest = z.infer<typeof contractAuthorityRequestSchema>;

const contractAuthorityProofSchema = z.object({
  bundleHash: bytes32HexSchema,
  requests: z
    .array(
      z.object({
        message: onchainForwardRequestMessageSchema,
        signature: ecdsaSignatureHexSchema,
      }),
    )
    .min(1),
});

export type ContractAuthorityProof = z.infer<typeof contractAuthorityProofSchema>;

const contractAuthorityAppliedSchema = z.object({ state: z.literal('applied') }).strict();

const contractAuthoritySignatureRequiredSchema = z
  .object({
    state: z.literal('signature_required'),
    authority: z
      .object({
        bundleHash: bytes32HexSchema,
        requests: z.array(contractAuthorityRequestSchema).min(1),
      })
      .strict(),
  })
  .strict();

const contractAuthorityAcceptedSchema = z.object({ state: z.literal('accepted') }).strict();

export const contractAuthorityMutationResultSchema = z.discriminatedUnion('state', [
  contractAuthorityAppliedSchema,
  contractAuthoritySignatureRequiredSchema,
  contractAuthorityAcceptedSchema,
]);

export type ContractAuthorityMutationResult = z.infer<typeof contractAuthorityMutationResultSchema>;
