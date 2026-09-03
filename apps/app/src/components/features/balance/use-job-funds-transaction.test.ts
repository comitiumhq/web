import { TransactionError } from '@comitium/schemas/product-errors';
import { errAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProductErrorMessage: vi.fn(() => 'Product-safe error'),
  isProductSubmissionUncertain: vi.fn(() => false),
  isPending: false,
  setIsPending: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastLoading: vi.fn(() => 'toast-id'),
  toastSuccess: vi.fn(),
}));

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useState: () => [mocks.isPending, mocks.setIsPending],
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}));

vi.mock('@comitium/auth/send-calls', () => ({
  isProductSubmissionUncertain: mocks.isProductSubmissionUncertain,
}));

vi.mock('@comitium/ui/product-error-messages', () => ({
  getProductErrorMessage: mocks.getProductErrorMessage,
}));

import { useJobFundsTransaction } from './use-job-funds-transaction';

const UNCERTAIN_SUBMISSION_REFRESH_DELAY_MS = 5_000;

describe('useJobFundsTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.isPending = false;
    mocks.isProductSubmissionUncertain.mockReturnValue(false);
  });

  it('returns an uncertain submission to a calm retryable state', async () => {
    vi.useFakeTimers();
    const error = new TransactionError('withdraw', new Error('provider disconnected'));
    mocks.isProductSubmissionUncertain.mockReturnValue(true);
    const onRefresh = vi.fn();
    const onClose = vi.fn();
    const onConfirmed = vi.fn();
    const action = useJobFundsTransaction({ action: 'withdraw', onConfirmed, onRefresh, onClose });

    await action.submit(() => errAsync(error), 10_000_000n, '$10.00');

    expect(mocks.setIsPending).toHaveBeenNthCalledWith(1, true);
    expect(mocks.setIsPending).toHaveBeenNthCalledWith(2, false);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.toastInfo).toHaveBeenCalledWith(
      'Withdrawal is taking longer than expected. Check your balance in a moment.',
      { id: 'toast-id' },
    );
    expect(mocks.toastError).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(UNCERTAIN_SUBMISSION_REFRESH_DELAY_MS);

    expect(onRefresh).toHaveBeenCalledExactlyOnceWith();
  });

  it('keeps deterministic failures retryable', async () => {
    const error = new TransactionError('withdraw', new Error('wallet rejected'));
    const onRefresh = vi.fn();
    const action = useJobFundsTransaction({
      action: 'withdraw',
      onConfirmed: vi.fn(),
      onRefresh,
      onClose: vi.fn(),
    });

    await action.submit(() => errAsync(error), 10_000_000n, '$10.00');

    expect(mocks.setIsPending).toHaveBeenNthCalledWith(1, true);
    expect(mocks.setIsPending).toHaveBeenNthCalledWith(2, false);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith('Product-safe error', { id: 'toast-id' });
  });
});
