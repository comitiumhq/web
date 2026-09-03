import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  operationId: null as string | null,
  refreshAfterOnchainOperationSettles: vi.fn(),
  setOperationId: vi.fn(),
}));

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useState: () => [mocks.operationId, mocks.setOperationId],
}));

vi.mock('./onchain-operation-observer', () => ({
  refreshAfterOnchainOperationSettles: mocks.refreshAfterOnchainOperationSettles,
}));

import { useOnchainSettlementObserver } from './use-onchain-settlement-observer';

const OPERATION_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_OPERATION_ID = '22222222-2222-4222-8222-222222222222';

describe('useOnchainSettlementObserver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.operationId = null;
  });

  it('releases the local lock only after an authoritative terminal stage', async () => {
    mocks.refreshAfterOnchainOperationSettles.mockResolvedValue('completed');
    const refresh = vi.fn();
    const onCompleted = vi.fn();
    const onFailed = vi.fn();
    const observer = useOnchainSettlementObserver();

    observer.observe({ operationId: OPERATION_ID, refresh, onCompleted, onFailed });

    expect(mocks.setOperationId).toHaveBeenCalledExactlyOnceWith(OPERATION_ID);
    await vi.waitFor(() => expect(onCompleted).toHaveBeenCalledOnce());
    const release = mocks.setOperationId.mock.calls.at(-1)?.[0] as (current: string) => string | null;

    expect(release(OPERATION_ID)).toBeNull();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('keeps the local lock while canonical follow-up work is still running', async () => {
    let finish = () => {};
    const followUp = new Promise<void>((resolve) => {
      finish = resolve;
    });
    mocks.refreshAfterOnchainOperationSettles.mockResolvedValue('completed');
    const observer = useOnchainSettlementObserver();

    observer.observe({
      operationId: OPERATION_ID,
      refresh: vi.fn(),
      onCompleted: () => followUp,
      onFailed: vi.fn(),
    });

    await vi.waitFor(() => expect(mocks.refreshAfterOnchainOperationSettles).toHaveBeenCalledOnce());
    expect(mocks.setOperationId).toHaveBeenCalledExactlyOnceWith(OPERATION_ID);

    finish();
    await vi.waitFor(() => expect(mocks.setOperationId).toHaveBeenCalledTimes(2));
  });

  it('releases the local lock without reporting failure at background handoff', async () => {
    mocks.refreshAfterOnchainOperationSettles.mockResolvedValue('background');
    const onCompleted = vi.fn();
    const onFailed = vi.fn();
    const observer = useOnchainSettlementObserver();

    observer.observe({
      operationId: OPERATION_ID,
      refresh: vi.fn(),
      onCompleted,
      onFailed,
    });

    await vi.waitFor(() => expect(mocks.setOperationId).toHaveBeenCalledTimes(2));
    const release = mocks.setOperationId.mock.calls.at(-1)?.[0] as (current: string) => string | null;

    expect(release(OPERATION_ID)).toBeNull();
    expect(onCompleted).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('releases the local lock and reports an authoritative failure', async () => {
    mocks.refreshAfterOnchainOperationSettles.mockResolvedValue('failed');
    const onCompleted = vi.fn();
    const onFailed = vi.fn();
    const observer = useOnchainSettlementObserver();

    observer.observe({
      operationId: OPERATION_ID,
      refresh: vi.fn(),
      onCompleted,
      onFailed,
    });

    await vi.waitFor(() => expect(onFailed).toHaveBeenCalledOnce());
    const release = mocks.setOperationId.mock.calls.at(-1)?.[0] as (current: string) => string | null;

    expect(release(OPERATION_ID)).toBeNull();
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('does not let an older operation completion release the newer operation lock', async () => {
    let finishFirst: (stage: 'completed') => void = () => undefined;
    let finishSecond: (stage: 'completed') => void = () => undefined;
    const firstSettlement = new Promise<'completed'>((resolve) => {
      finishFirst = resolve;
    });
    const secondSettlement = new Promise<'completed'>((resolve) => {
      finishSecond = resolve;
    });
    mocks.refreshAfterOnchainOperationSettles.mockImplementation((operationId: string) => {
      return operationId === OPERATION_ID ? firstSettlement : secondSettlement;
    });
    const observer = useOnchainSettlementObserver();

    observer.observe({
      operationId: OPERATION_ID,
      refresh: vi.fn(),
      onCompleted: vi.fn(),
      onFailed: vi.fn(),
    });
    observer.observe({
      operationId: SECOND_OPERATION_ID,
      refresh: vi.fn(),
      onCompleted: vi.fn(),
      onFailed: vi.fn(),
    });

    finishFirst('completed');
    await vi.waitFor(() => expect(mocks.setOperationId).toHaveBeenCalledTimes(3));
    const releaseFirst = mocks.setOperationId.mock.calls[2][0] as (current: string) => string | null;
    expect(releaseFirst(SECOND_OPERATION_ID)).toBe(SECOND_OPERATION_ID);

    finishSecond('completed');
    await vi.waitFor(() => expect(mocks.setOperationId).toHaveBeenCalledTimes(4));
    const releaseSecond = mocks.setOperationId.mock.calls[3][0] as (current: string) => string | null;
    expect(releaseSecond(SECOND_OPERATION_ID)).toBeNull();
  });
});
