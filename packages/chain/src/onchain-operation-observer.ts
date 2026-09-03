import type { OnchainOperationStatus } from '@comitium/schemas/onchain-operations';

type ConfirmedOnchainTransaction = { kind: 'confirmed' };
export type OnchainTransactionDisposition = ConfirmedOnchainTransaction | { kind: 'confirming' };
export type OnchainOperationSettlement = 'completed' | 'failed' | 'background';
export interface ReceiptObservationOptions {
  continueUntilSettlement?: boolean;
}

const RECEIPT_OBSERVATION_TIMEOUT_MS = 30_000;
const SETTLEMENT_OBSERVATION_TIMEOUT_MS = 60_000;
const INITIAL_POLL_DELAY_MS = 1_000;
const MAX_POLL_DELAY_MS = 5_000;

interface OnchainOperationTransport {
  getStatus: (operationId: string, signal: AbortSignal) => Promise<OnchainOperationStatus>;
  isTransientError: (error: unknown) => boolean;
}

let transport: OnchainOperationTransport | null = null;

export function registerOnchainOperationTransport(nextTransport: OnchainOperationTransport): () => void {
  transport = nextTransport;

  return () => {
    if (transport === nextTransport) {
      transport = null;
    }
  };
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

type OnchainOperationObserver = {
  receipt: Deferred<OnchainTransactionDisposition>;
  settlement: Deferred<OnchainOperationSettlement>;
  receiptSettled: boolean;
  settlementSettled: boolean;
  executionConfirmedSeen: boolean;
  continueUntilSettlement: boolean;
};

const operationObservers = new Map<string, OnchainOperationObserver>();

export function waitForOperationReceipt(
  operationId: string,
  options: ReceiptObservationOptions = {},
): Promise<OnchainTransactionDisposition> {
  return getOnchainOperationObserver(operationId, options.continueUntilSettlement ?? true).receipt.promise;
}

export function refreshAfterOnchainOperationSettles(
  operationId: string,
  refresh: () => void,
): Promise<OnchainOperationSettlement> {
  const settlement = getOnchainOperationObserver(operationId, true).settlement.promise;

  settlement.then(
    (stage) => {
      if (stage !== 'background') {
        refresh();
      }
    },
    () => undefined,
  );

  return settlement;
}

function getOnchainOperationObserver(operationId: string, continueUntilSettlement: boolean): OnchainOperationObserver {
  const existing = operationObservers.get(operationId);

  if (existing) {
    existing.continueUntilSettlement ||= continueUntilSettlement;

    return existing;
  }

  const observer: OnchainOperationObserver = {
    receipt: createDeferred<OnchainTransactionDisposition>(),
    settlement: createDeferred<OnchainOperationSettlement>(),
    receiptSettled: false,
    settlementSettled: false,
    executionConfirmedSeen: false,
    continueUntilSettlement,
  };

  observer.receipt.promise.catch(() => undefined);
  observer.settlement.promise.catch(() => undefined);
  operationObservers.set(operationId, observer);
  observeOnchainOperation(operationId, observer);

  return observer;
}

async function observeOnchainOperation(operationId: string, observer: OnchainOperationObserver): Promise<void> {
  const startedAt = Date.now();
  const receiptDeadline = startedAt + RECEIPT_OBSERVATION_TIMEOUT_MS;
  const settlementDeadline = startedAt + SETTLEMENT_OBSERVATION_TIMEOUT_MS;
  let pollAttempt = 0;
  let retainTerminalResult = false;

  try {
    while (Date.now() <= settlementDeadline) {
      settleReceiptObservationTimeout(observer, receiptDeadline);

      if (observationIsComplete(observer)) {
        return;
      }

      const activeDeadline = observer.receiptSettled ? settlementDeadline : receiptDeadline;
      const requestTimeoutMs = Math.max(1, activeDeadline - Date.now());
      const operation = await readOnchainOperationStatus(operationId, AbortSignal.timeout(requestTimeoutMs));

      settleReceiptObservationTimeout(observer, receiptDeadline);
      if (operation !== null) {
        const executionWasConfirmed = observer.executionConfirmedSeen;

        if (operation.execution.status === 'confirmed') {
          observer.executionConfirmedSeen = true;
        }

        settleReceipt(observer, operation);
        settleProductState(observer, operation);

        if (observationIsComplete(observer)) {
          retainTerminalResult = observer.settlementSettled;

          return;
        }

        if (!executionWasConfirmed && observer.executionConfirmedSeen) {
          pollAttempt = 0;

          continue;
        }
      }

      const nextDeadline = observer.receiptSettled ? settlementDeadline : receiptDeadline;
      const remainingMs = nextDeadline - Date.now();

      if (remainingMs <= 0) {
        break;
      }

      await delay(Math.min(pollDelay(pollAttempt), remainingMs));
      pollAttempt += 1;
    }

    settleSettlementObservationTimeout(observer);
  } catch {
    settleSettlementObservationTimeout(observer);
  } finally {
    if (retainTerminalResult) {
      releaseObserverAfterSubscribersRun(operationId, observer);
    } else if (operationObservers.get(operationId) === observer) {
      operationObservers.delete(operationId);
    }
  }
}

function observationIsComplete(observer: OnchainOperationObserver): boolean {
  return observer.receiptSettled && (!observer.continueUntilSettlement || observer.settlementSettled);
}

function settleReceipt(observer: OnchainOperationObserver, operation: OnchainOperationStatus): void {
  if (observer.receiptSettled) {
    return;
  }

  if (operation.execution.status === 'confirmed') {
    observer.receiptSettled = true;
    observer.receipt.resolve({ kind: 'confirmed' });

    return;
  }

  if (operation.execution.status === 'background_confirming') {
    observer.receiptSettled = true;
    observer.receipt.resolve({ kind: 'confirming' });

    return;
  }

  if (operation.execution.status === 'reverted') {
    observer.receiptSettled = true;
    observer.receipt.reject(new Error('Transaction reverted'));

    return;
  }

  if (operation.execution.status === 'failed') {
    observer.receiptSettled = true;
    observer.receipt.reject(new Error('Transaction was not submitted'));
  }
}

function settleProductState(observer: OnchainOperationObserver, operation: OnchainOperationStatus): void {
  if (observer.settlementSettled) {
    return;
  }

  if (operation.state === 'try_again') {
    observer.settlementSettled = true;
    observer.settlement.resolve('failed');

    return;
  }

  if (operation.state === 'completed') {
    observer.settlementSettled = true;
    observer.settlement.resolve('completed');
  }
}

function releaseObserverAfterSubscribersRun(operationId: string, observer: OnchainOperationObserver): void {
  setTimeout(() => {
    if (operationObservers.get(operationId) === observer) {
      operationObservers.delete(operationId);
    }
  }, 0);
}

function settleReceiptObservationTimeout(observer: OnchainOperationObserver, deadline: number): void {
  if (!observer.receiptSettled && Date.now() >= deadline) {
    observer.receiptSettled = true;
    observer.receipt.resolve({ kind: 'confirming' });
  }
}

function settleSettlementObservationTimeout(observer: OnchainOperationObserver): void {
  if (!observer.receiptSettled) {
    observer.receiptSettled = true;
    observer.receipt.resolve({ kind: 'confirming' });
  }

  if (!observer.settlementSettled) {
    observer.settlementSettled = true;
    observer.settlement.resolve('background');
  }
}

async function readOnchainOperationStatus(
  operationId: string,
  signal: AbortSignal,
): Promise<OnchainOperationStatus | null> {
  const currentTransport = transport;

  if (!currentTransport) {
    throw new Error('On-chain operation transport is not configured');
  }

  try {
    return await currentTransport.getStatus(operationId, signal);
  } catch (error) {
    if (currentTransport.isTransientError(error)) {
      return null;
    }

    throw error;
  }
}

function pollDelay(attempt: number): number {
  return Math.min(INITIAL_POLL_DELAY_MS * 2 ** attempt, MAX_POLL_DELAY_MS);
}

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason: unknown) => void = () => undefined;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
