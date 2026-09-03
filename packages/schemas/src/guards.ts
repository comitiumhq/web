import type { Hex } from 'viem';
import { z } from 'zod';
import { BYTES32_HEX_REGEX } from './patterns';

const nonEmptyStringSchema = z.string().min(1);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value instanceof Object && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return nonEmptyStringSchema.safeParse(value).success;
}

export function isBytes32Hex(value: unknown): value is Hex {
  const parsedValue = z.string().safeParse(value);

  return parsedValue.success && BYTES32_HEX_REGEX.test(parsedValue.data);
}

export function isDefined<T>(value?: T | null): value is T {
  return value !== null && value !== undefined;
}

export function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}
