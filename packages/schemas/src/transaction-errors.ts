import { getErrorMessageOrNull } from './error';
import { isRecord } from './guards';

const WALLET_REJECTION_CODES = new Set<unknown>([4001, 5000, '4001', '5000', 'ACTION_REJECTED']);
const WALLET_REJECTION_NAMES = new Set<unknown>(['UserRejectedRequestError']);

export type ProductTransactionStage = 'approval' | 'preflight' | 'submission';

export class ProductTransactionStageError extends Error {
  constructor(
    public readonly stage: ProductTransactionStage,
    cause: unknown,
  ) {
    super(getErrorMessageOrNull(cause) ?? 'Wallet transaction failed', { cause });
    this.name = 'ProductTransactionStageError';
  }
}

export class ProductTransactionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductTransactionFailedError';
  }
}

function didProductSubmissionStart(error: unknown): boolean {
  return hasNestedErrorRecord(
    error,
    (current) => current instanceof ProductTransactionStageError && current.stage === 'submission',
  );
}

export function isProductSubmissionUncertain(error: unknown): boolean {
  return (
    didProductSubmissionStart(error) &&
    !isWalletRejectedError(error) &&
    !hasNestedErrorRecord(error, (current) => current instanceof ProductTransactionFailedError)
  );
}

function isWalletRejectedError(error: unknown): boolean {
  return hasNestedErrorRecord(
    error,
    (current) => WALLET_REJECTION_CODES.has(current.code) || WALLET_REJECTION_NAMES.has(current.name),
  );
}

function hasNestedErrorRecord(error: unknown, predicate: (current: Record<string, unknown>) => boolean): boolean {
  const pending: unknown[] = [error];
  const visited = new Set<object>();

  while (pending.length > 0) {
    const current = pending.pop();

    if (!isRecord(current) || visited.has(current)) {
      continue;
    }

    if (predicate(current)) {
      return true;
    }

    visited.add(current);
    pending.push(current.cause, current.data, current.error, current.originalError);
  }

  return false;
}
