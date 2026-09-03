import { base64StringSchema } from '@comitium/crypto/schemas';
import { z } from 'zod';
import { EVM_HEX_DATA_REGEX } from './patterns';
import { addressSchema, decimalIntegerStringSchema, ecdsaSignatureHexSchema, uuidSchema } from './public';

export const onchainOperationStageSchema = z.enum([
  'awaiting_signature',
  'pending',
  'completed',
  'failed',
  'expired',
  'repair_required',
]);

const onchainOperationProductStateSchema = z.enum(['wallet_confirmation', 'confirming', 'completed', 'try_again']);

export type OnchainOperationProductState = z.infer<typeof onchainOperationProductStateSchema>;

export function getOnchainOperationProductState(
  stage: z.infer<typeof onchainOperationStageSchema>,
  failureCode: string | null = null,
): OnchainOperationProductState {
  if (failureCode === 'submission_rejected') {
    return 'try_again';
  }

  switch (stage) {
    case 'awaiting_signature':
      return 'wallet_confirmation';

    case 'pending':
    case 'repair_required':
      return 'confirming';

    case 'completed':
      return 'completed';

    case 'failed':
    case 'expired':
      return 'try_again';
  }
}

export const onchainExecutionStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('background_confirming') }),
  z.object({ status: z.literal('confirmed') }),
  z.object({ status: z.literal('reverted') }),
  z.object({ status: z.literal('failed') }),
]);

export const onchainOperationStatusSchema = z.object({
  state: onchainOperationProductStateSchema,
  execution: onchainExecutionStatusSchema,
});

export type OnchainOperationStatus = z.infer<typeof onchainOperationStatusSchema>;

export const userWalletAuthorizationPayloadSchema = z.object({
  requestId: uuidSchema,
  authorizationPayload: base64StringSchema,
});

export const userWalletAuthorizationSubmitSchema = z.object({
  requestId: uuidSchema,
  authorizationSignature: base64StringSchema,
});

export const onchainForwardRequestMessageSchema = z.object({
  from: addressSchema,
  to: addressSchema,
  value: decimalIntegerStringSchema,
  gas: decimalIntegerStringSchema,
  nonce: decimalIntegerStringSchema,
  deadline: decimalIntegerStringSchema,
  data: z.string().regex(EVM_HEX_DATA_REGEX),
});

export const onchainForwardRequestSignatureSchema = z.object({
  domain: z.object({
    name: z.string(),
    version: z.string(),
    chainId: z.number(),
    verifyingContract: addressSchema,
  }),
  types: z.object({
    ForwardRequest: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
      }),
    ),
  }),
  primaryType: z.literal('ForwardRequest'),
  message: onchainForwardRequestMessageSchema,
});

export type OnchainForwardRequestSignature = z.infer<typeof onchainForwardRequestSignatureSchema>;

const onchainRequestSignatureRequestSchema = onchainForwardRequestSignatureSchema.extend({
  requestId: uuidSchema,
});

export type OnchainRequestSignatureRequest = z.infer<typeof onchainRequestSignatureRequestSchema>;

export const preparedRelayedOnchainOperationSchema = z.object({
  operationId: uuidSchema,
  state: onchainOperationProductStateSchema,
  signatureRequest: onchainRequestSignatureRequestSchema.nullable(),
});

export const onchainRequestSignatureSubmitSchema = z.object({
  requestId: uuidSchema,
  signature: ecdsaSignatureHexSchema,
});

export type OnchainRequestSignatureSubmit = z.infer<typeof onchainRequestSignatureSubmitSchema>;
