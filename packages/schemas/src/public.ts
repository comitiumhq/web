import type { Address, Hex } from 'viem';
import { z } from 'zod';

import { BYTES32_HEX_REGEX, DECIMAL_INTEGER_REGEX, ECDSA_SIGNATURE_HEX_REGEX, EVM_ADDRESS_REGEX } from './patterns';

const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;

export const addressSchema = z.string().transform((value) => value as Address);

export const walletAddressSchema = z
  .string()
  .regex(EVM_ADDRESS_REGEX, 'Invalid wallet address')
  .transform((value) => value.toLowerCase());

export const decimalIntegerStringSchema = z.string().regex(DECIMAL_INTEGER_REGEX, 'Expected decimal integer string');

export const uuidSchema = z.guid();

export const bytes32HexSchema = z
  .string()
  .regex(BYTES32_HEX_REGEX, 'Expected bytes32 hex string')
  .transform((value) => value as Hex);

export const nonZeroBytes32HexSchema = bytes32HexSchema.refine(
  (value) => value.toLowerCase() !== ZERO_BYTES32,
  'Expected non-zero bytes32 hex string',
);

export const ecdsaSignatureHexSchema = z
  .string()
  .regex(ECDSA_SIGNATURE_HEX_REGEX, 'Expected ECDSA signature hex string')
  .transform((value) => value as Hex);

export const successSchema = z.object({ success: z.literal(true) });

export function dataArraySchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({ data: z.array(itemSchema) });
}

export function dataSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({ data: itemSchema });
}

export const paginationSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export function paginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: paginationSchema,
  });
}

export function paginatedWithTotalSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: paginationSchema.extend({ total: z.number().optional() }),
  });
}
