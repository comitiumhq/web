import type { OnchainOperationStatus } from '@comitium/schemas/onchain-operations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  refreshAfterOnchainOperationSettles,
  registerOnchainOperationTransport,
  waitForOperationReceipt,
} from './onchain-operation-observer';

const getOnchainOperationStatus =
  vi.fn<(operationId: string, signal: AbortSignal) => Promise<OnchainOperationStatus>>();
let unregisterTransport: () => void = () => undefined;

const OPERATION_ID = '11111111-2222-4333-8444-555555555555';

function operationStatus(overrides: Partial<OnchainOperationStatus> = {}): OnchainOperationStatus {
  return {
    state: 'confirming',
    execution: { status: 'pending' },
    ...overrides,
  };
}

describe('on-chain operation observation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unregisterTransport = registerOnchainOperationTransport({
      getStatus: getOnchainOperationStatus,
      isTransientError: (error) => error instanceof TypeError,
    });
  });

  afterEach(async () => {
    unregisterTransport();
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();

      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('reuses a terminal observation when settlement subscribes after receipt confirmation', async () => {
    getOnchainOperationStatus.mockResolvedValue(
      operationStatus({
        state: 'completed',
        execution: { status: 'confirmed' },
      }),
    );
    const refresh = vi.fn();

    await expect(waitForOperationReceipt(OPERATION_ID)).resolves.toEqual({ kind: 'confirmed' });
    await expect(refreshAfterOnchainOperationSettles(OPERATION_ID, refresh)).resolves.toBe('completed');

    expect(getOnchainOperationStatus).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('stops after receipt confirmation when another product query owns settlement', async () => {
    vi.useFakeTimers();
    getOnchainOperationStatus.mockResolvedValue(
      operationStatus({
        execution: { status: 'confirmed' },
      }),
    );

    await expect(waitForOperationReceipt(OPERATION_ID, { continueUntilSettlement: false })).resolves.toEqual({
      kind: 'confirmed',
    });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(getOnchainOperationStatus).toHaveBeenCalledOnce();
  });

  it('rechecks product settlement immediately when background confirmation becomes verified', async () => {
    vi.useFakeTimers();
    getOnchainOperationStatus
      .mockResolvedValueOnce(
        operationStatus({
          execution: { status: 'background_confirming' },
        }),
      )
      .mockResolvedValueOnce(
        operationStatus({
          execution: { status: 'confirmed' },
        }),
      )
      .mockResolvedValue(
        operationStatus({
          state: 'completed',
          execution: { status: 'confirmed' },
        }),
      );
    const refresh = vi.fn();

    const receipt = waitForOperationReceipt(OPERATION_ID);
    const settlement = refreshAfterOnchainOperationSettles(OPERATION_ID, refresh);
    await Promise.resolve();

    expect(getOnchainOperationStatus).toHaveBeenCalledOnce();
    await expect(receipt).resolves.toEqual({ kind: 'confirming' });

    await vi.advanceTimersByTimeAsync(1_000);
    await expect(settlement).resolves.toBe('completed');
    expect(refresh).toHaveBeenCalledOnce();
    expect(getOnchainOperationStatus).toHaveBeenCalledTimes(3);
  });

  it('surfaces a rejected submission and refreshes optimistic product state', async () => {
    getOnchainOperationStatus.mockResolvedValue(
      operationStatus({
        state: 'try_again',
        execution: { status: 'failed' },
      }),
    );
    const refresh = vi.fn();

    const receipt = waitForOperationReceipt(OPERATION_ID);
    const settlement = refreshAfterOnchainOperationSettles(OPERATION_ID, refresh);

    await expect(receipt).rejects.toThrow('Transaction was not submitted');
    await expect(settlement).resolves.toBe('failed');
    expect(refresh).toHaveBeenCalledOnce();
    expect(getOnchainOperationStatus).toHaveBeenCalledOnce();
  });

  it('retries transient reads inside the same observer', async () => {
    vi.useFakeTimers();
    getOnchainOperationStatus.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(
      operationStatus({
        state: 'completed',
        execution: { status: 'confirmed' },
      }),
    );

    const receipt = waitForOperationReceipt(OPERATION_ID);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(receipt).resolves.toEqual({ kind: 'confirmed' });
    expect(getOnchainOperationStatus).toHaveBeenCalledTimes(2);
  });

  it('keeps one bounded observer alive for settlement after the foreground receipt timeout', async () => {
    vi.useFakeTimers();
    getOnchainOperationStatus.mockResolvedValue(operationStatus());
    const refresh = vi.fn();

    const receipt = waitForOperationReceipt(OPERATION_ID);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(receipt).resolves.toEqual({ kind: 'confirming' });
    const callsAtReceiptTimeout = getOnchainOperationStatus.mock.calls.length;
    const settlement = refreshAfterOnchainOperationSettles(OPERATION_ID, refresh);
    await Promise.resolve();

    expect(getOnchainOperationStatus).toHaveBeenCalledTimes(callsAtReceiptTimeout);

    await vi.advanceTimersByTimeAsync(30_000);
    await expect(settlement).resolves.toBe('background');
    expect(refresh).not.toHaveBeenCalled();
    expect(getOnchainOperationStatus.mock.calls.length).toBeLessThan(20);
  });

  it('hands off neutrally and releases the observer after a permanent read error', async () => {
    getOnchainOperationStatus.mockRejectedValue(new Error('Forbidden'));
    const firstRefresh = vi.fn();
    const secondRefresh = vi.fn();

    await expect(refreshAfterOnchainOperationSettles(OPERATION_ID, firstRefresh)).resolves.toBe('background');
    await expect(refreshAfterOnchainOperationSettles(OPERATION_ID, secondRefresh)).resolves.toBe('background');

    expect(firstRefresh).not.toHaveBeenCalled();
    expect(secondRefresh).not.toHaveBeenCalled();
    expect(getOnchainOperationStatus).toHaveBeenCalledTimes(2);
  });
});
