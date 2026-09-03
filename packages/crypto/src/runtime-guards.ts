import { type Address, isAddress } from 'viem';
import { z } from 'zod';

const stringSchema = z.string();

export function isDefined<T>(value?: T | null): value is T {
  return value !== null && value !== undefined;
}

export function isCanonicalAddress(value: unknown): value is Address {
  const parsed = stringSchema.safeParse(value);

  return parsed.success && parsed.data === parsed.data.toLowerCase() && isAddress(parsed.data);
}

export function isCanonicalIsoDateString(value: unknown): value is string {
  const parsed = stringSchema.safeParse(value);

  if (!parsed.success) {
    return false;
  }

  const timestamp = Date.parse(parsed.data);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return new Date(timestamp).toISOString() === parsed.data;
}

export function isCryptoKey(value: unknown): value is CryptoKey {
  const cryptoKeyConstructor = globalThis.CryptoKey;

  return isDefined(cryptoKeyConstructor) && value instanceof cryptoKeyConstructor;
}
