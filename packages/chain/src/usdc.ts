import { DECIMAL_INTEGER_REGEX, USDC_AMOUNT_REGEX } from '@comitium/schemas/patterns';
import { formatUnits, parseUnits } from 'viem';
import { z } from 'zod';

export const USDC_DECIMALS = 6;
export const USDC_UNIT = 1_000_000n;

export function parsePositiveUsdcInputToUnits(value: string): bigint | null {
  try {
    const amount = parseUsdcUnits(value);

    if (amount <= 0n) {
      return null;
    }

    return amount;
  } catch {
    return null;
  }
}

export function formatUsdcAmount(value: bigint): string {
  return `${trimTrailingZeros(formatUsdcUnits(value))} USDC`;
}

export function wholeUsdToUsdcUnits(value: string | number | bigint): bigint {
  const normalized = normalizeWholeUsd(value);

  return BigInt(normalized) * USDC_UNIT;
}

export function parseWholeUsdInputToNumber(value: string): number | null {
  const normalized = value.trim();

  if (!DECIMAL_INTEGER_REGEX.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isSafeInteger(amount)) {
    return null;
  }

  return amount;
}

function parseUsdcUnits(value: string): bigint {
  const normalized = value.trim();

  if (!USDC_AMOUNT_REGEX.test(normalized)) {
    throw new Error('Expected a non-negative USDC amount with up to 6 decimals');
  }

  return parseUnits(normalized, USDC_DECIMALS);
}

function formatUsdcUnits(value: bigint): string {
  return formatUnits(value, USDC_DECIMALS);
}

function normalizeWholeUsd(value: string | number | bigint): string {
  const bigintValue = z.bigint().safeParse(value);

  if (bigintValue.success) {
    if (bigintValue.data < 0n) {
      throw new Error('Expected non-negative whole-dollar amount');
    }

    return bigintValue.data.toString();
  }

  const numberValue = z.number().safe().int().nonnegative().safeParse(value);

  if (numberValue.success) {
    return String(numberValue.data);
  }

  const stringValue = z.string().safeParse(value);

  if (!stringValue.success) {
    throw new Error('Expected non-negative whole-dollar amount');
  }

  const normalized = stringValue.data.trim();

  if (!DECIMAL_INTEGER_REGEX.test(normalized)) {
    throw new Error('Expected non-negative whole-dollar amount');
  }

  return normalized;
}

function trimTrailingZeros(value: string): string {
  if (!value.includes('.')) {
    return value;
  }

  return value.replace(/\.?0+$/, '');
}
