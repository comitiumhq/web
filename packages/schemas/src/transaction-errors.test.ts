import { describe, expect, it } from 'vitest';
import {
  isProductSubmissionUncertain,
  ProductTransactionFailedError,
  ProductTransactionStageError,
} from './transaction-errors';

describe('isProductSubmissionUncertain', () => {
  it('does not classify failures before wallet submission as uncertain', () => {
    expect(isProductSubmissionUncertain(new ProductTransactionStageError('preflight', new Error('failed')))).toBe(
      false,
    );
  });

  it.each([
    { code: 4001 },
    { data: { code: '5000' } },
    { error: { code: 'ACTION_REJECTED' } },
    { originalError: { name: 'UserRejectedRequestError' } },
    { cause: { code: '4001' } },
  ])('recognizes nested deterministic wallet rejection %#', (cause) => {
    expect(isProductSubmissionUncertain(new ProductTransactionStageError('submission', cause))).toBe(false);
  });

  it('classifies a transport failure after submission starts as uncertain', () => {
    const transportError = { cause: { data: { error: new Error('network timeout') } } };

    expect(isProductSubmissionUncertain(new ProductTransactionStageError('submission', transportError))).toBe(true);
  });

  it('does not classify a confirmed revert as uncertain', () => {
    const revert = new ProductTransactionFailedError('Transaction reverted');

    expect(isProductSubmissionUncertain(new ProductTransactionStageError('submission', revert))).toBe(false);
  });

  it('terminates safely when provider error links contain a cycle', () => {
    const providerError: Record<string, unknown> = { message: 'timeout' };
    providerError.cause = providerError;
    providerError.data = { originalError: providerError };

    expect(isProductSubmissionUncertain(new ProductTransactionStageError('submission', providerError))).toBe(true);
  });
});
