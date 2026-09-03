import { useRef } from 'react';

export interface BulkOperationReference {
  scopeKey: string;
  operationId: string;
}

export function useBulkOperationLifecycle(initialRequestKey: string) {
  const lifecycleRef = useRef<ReturnType<typeof createBulkOperationLifecycle> | null>(null);

  if (!lifecycleRef.current) {
    lifecycleRef.current = createBulkOperationLifecycle(initialRequestKey);
  }

  return lifecycleRef.current;
}

function createBulkOperationLifecycle(initialRequestKey: string) {
  const state = {
    requestKey: initialRequestKey,
    idempotencyKey: crypto.randomUUID(),
    createAttempt: 0,
    currentReference: null as BulkOperationReference | null,
    commitMayBeAccepted: false,
    settledOperationId: null as string | null,
  };

  return {
    get idempotencyKey() {
      return state.idempotencyKey;
    },

    isCurrentRequest(requestKey: string) {
      return state.requestKey === requestKey;
    },

    reset(requestKey: string) {
      state.requestKey = requestKey;
      state.idempotencyKey = crypto.randomUUID();
      state.createAttempt += 1;
      state.currentReference = null;
      state.commitMayBeAccepted = false;
    },

    beginDraftCreation() {
      state.createAttempt += 1;
      return state.createAttempt;
    },

    isCurrentDraftCreation(attempt: number) {
      return state.createAttempt === attempt;
    },

    acceptDraftCreation(attempt: number, reference: BulkOperationReference) {
      if (state.createAttempt !== attempt) return false;

      state.currentReference = reference;
      return true;
    },

    forgetOperation() {
      state.createAttempt += 1;
      state.currentReference = null;
    },

    isCurrentOperation(reference: BulkOperationReference) {
      return referencesMatch(state.currentReference, reference);
    },

    mayHaveAcceptedCommit() {
      return state.commitMayBeAccepted;
    },

    markCommitMayBeAccepted() {
      state.commitMayBeAccepted = true;
    },

    markCommitResolved() {
      state.commitMayBeAccepted = false;
    },

    markSettled(operationId: string) {
      if (state.settledOperationId === operationId) return false;

      state.settledOperationId = operationId;
      return true;
    },
  };
}

function referencesMatch(left: BulkOperationReference | null, right: BulkOperationReference) {
  return left?.scopeKey === right.scopeKey && left.operationId === right.operationId;
}
