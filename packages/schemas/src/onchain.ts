import { type Address, isAddress } from 'viem';
import { z } from 'zod';

import { DECIMAL_INTEGER_REGEX } from './patterns';

const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export const onchainUintSchema = z
  .union([z.bigint(), z.number().int().nonnegative(), z.string().regex(DECIMAL_INTEGER_REGEX)])
  .transform((value) => BigInt(value));

export const onchainSafeIntegerSchema = onchainUintSchema
  .refine((value) => value <= MAX_SAFE_INTEGER_BIGINT, 'Value exceeds Number.MAX_SAFE_INTEGER')
  .transform((value) => Number(value));

const onchainAddressSchema = z
  .string()
  .refine((value) => isAddress(value), 'Expected EVM address')
  .transform((value) => value as Address);

export function tupleField(tuple: unknown, index: number, key: string): unknown {
  if (tuple && typeof tuple === 'object') {
    const record = tuple as Record<string, unknown>;

    if (key in record) {
      return record[key];
    }
  }

  if (Array.isArray(tuple) && index in tuple) {
    return tuple[index];
  }

  throw new Error(`Missing on-chain tuple field: ${key}`);
}

export function parseOnchainUint(value: unknown, label: string): bigint {
  const parsed = onchainUintSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`Invalid ${label}: expected uint-like value`);
  }

  return parsed.data;
}

export function parseOnchainSafeInteger(value: unknown, label: string): number {
  const parsed = onchainSafeIntegerSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`Invalid ${label}: expected safe integer`);
  }

  return parsed.data;
}

export function parseOnchainAddress(value: unknown, label: string): Address {
  const parsed = onchainAddressSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`Invalid ${label}: expected EVM address`);
  }

  return parsed.data;
}
