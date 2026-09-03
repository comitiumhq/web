import { getProductErrorMessage } from '@comitium/ui/product-error-messages';
import { useCallback, useEffect, useState } from 'react';
import {
  useAttachBulkOperationPayloads,
  useCommitBulkOperation,
  useCreateBulkOperationDraft,
} from '@/hooks/mutations/use-bulk-operation';
import { useQueryBulkOperation } from '@/hooks/queries/use-query-bulk-operation';
import { getErrorStatus, hasApiErrorStatus } from '@/lib/api/client';
import { isBulkOperationInProgress, isBulkOperationTerminal } from '@/lib/schemas/bulk-operations';
import type { BulkOperationCommit, UseBulkOperationParams } from '../types';
import { type BulkOperationReference, useBulkOperationLifecycle } from './use-bulk-operation-lifecycle';

export function useBulkOperation({ orgId, operationType, targetIds, open, onSettled }: UseBulkOperationParams) {
  const scopeKey = `${orgId}:${operationType}`;
  const requestKey = `${scopeKey}:${targetIds.join(':')}`;
  const lifecycle = useBulkOperationLifecycle(requestKey);

  const [reference, setReference] = useState<BulkOperationReference | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const createDraft = useCreateBulkOperationDraft();
  const attachPayloads = useAttachBulkOperationPayloads();
  const commitDraft = useCommitBulkOperation();

  const operationId = reference?.scopeKey === scopeKey ? reference.operationId : null;
  const operationQuery = useQueryBulkOperation(orgId, operationId);
  const operation = operationQuery.data ?? null;

  const resetRequest = useCallback(
    (nextRequestKey: string) => {
      lifecycle.reset(nextRequestKey);

      setReference(null);
      setOperationError(null);
    },
    [lifecycle],
  );

  useEffect(() => {
    if (lifecycle.isCurrentRequest(requestKey)) return;

    const referenceMatchesScope = reference?.scopeKey === scopeKey;
    const preservesAcceptedOperation =
      referenceMatchesScope && (lifecycle.mayHaveAcceptedCommit() || operation?.status !== 'draft');

    if (preservesAcceptedOperation) return;

    resetRequest(requestKey);
  }, [lifecycle, operation?.status, reference, requestKey, resetRequest, scopeKey]);

  useEffect(() => {
    const cannotCreate = !open || targetIds.length === 0 || operationId !== null || operationError !== null;

    if (cannotCreate || createDraft.isPending) return;

    const attempt = lifecycle.beginDraftCreation();

    createDraft
      .mutateAsync({
        orgId,
        input: {
          operationType,
          targetIds: [...targetIds],
          idempotencyKey: lifecycle.idempotencyKey,
        },
      })
      .then((created) => {
        const nextReference = { scopeKey, operationId: created.id };

        if (!lifecycle.acceptDraftCreation(attempt, nextReference)) return;

        setReference(nextReference);
      })
      .catch((error) => {
        if (!lifecycle.isCurrentDraftCreation(attempt)) return;

        setOperationError(getProductErrorMessage(error, 'The selected applications could not be reviewed.'));
      });
  }, [
    createDraft.isPending,
    createDraft.mutateAsync,
    lifecycle,
    open,
    operationError,
    operationId,
    operationType,
    orgId,
    scopeKey,
    targetIds,
  ]);

  useEffect(() => {
    if (!operation) return;

    if (operation.status !== 'draft') {
      lifecycle.markCommitResolved();
      setOperationError(null);
    }

    const hasSettled = isBulkOperationTerminal(operation) && operation.committedAt !== null;

    if (!hasSettled || !lifecycle.markSettled(operation.id)) return;

    onSettled?.(operation);
  }, [lifecycle, onSettled, operation]);

  useEffect(() => {
    if (open || !isBulkOperationTerminal(operation)) return;

    resetRequest(requestKey);
  }, [open, operation, requestKey, resetRequest]);

  const discardDraft = useCallback(() => {
    if (isBulkOperationInProgress(operation) || lifecycle.mayHaveAcceptedCommit()) return;

    resetRequest(requestKey);
  }, [lifecycle, operation, requestKey, resetRequest]);

  const retryDraft = useCallback(() => {
    setOperationError(null);

    if (operationId && !hasApiErrorStatus(operationQuery.error, 404)) {
      operationQuery.refetch();
      return;
    }

    lifecycle.forgetOperation();
    setReference(null);
  }, [lifecycle, operationId, operationQuery.error, operationQuery.refetch]);

  const commit = useCallback<BulkOperationCommit>(
    async (input, payloads = []) => {
      if (!operationId || operation?.status !== 'draft') return null;

      const operationReference = { scopeKey, operationId };

      if (!lifecycle.isCurrentOperation(operationReference)) return null;

      setOperationError(null);

      try {
        if (payloads.length > 0) {
          await attachPayloads.mutateAsync({ orgId, operationId, input: [...payloads] });
        }

        if (!lifecycle.isCurrentOperation(operationReference)) return null;

        const { excludedItemIds, ...parameters } = input;
        lifecycle.markCommitMayBeAccepted();

        const committed = await commitDraft.mutateAsync({
          orgId,
          operationId,
          input: { parameters, excludedItemIds },
        });

        lifecycle.markCommitResolved();
        return committed;
      } catch (error) {
        const status = getErrorStatus(error);

        if (isDefinitiveCommitRejection(status)) {
          lifecycle.markCommitResolved();
        } else {
          operationQuery.refetch();
        }

        setOperationError(getProductErrorMessage(error, 'The bulk action could not be started.'));
        return null;
      }
    },
    [
      attachPayloads.mutateAsync,
      commitDraft.mutateAsync,
      lifecycle,
      operation?.status,
      operationId,
      operationQuery.refetch,
      orgId,
      scopeKey,
    ],
  );

  return {
    operation,
    isLoading: createDraft.isPending || (operationId !== null && operationQuery.isLoading),
    isSubmitting: attachPayloads.isPending || commitDraft.isPending,
    error: getBulkOperationError(operationError, operationQuery.isError),
    commit,
    discardDraft,
    retryDraft,
  };
}

function isDefinitiveCommitRejection(status: number | null) {
  const isNotClientError = status === null || status < 400 || status >= 500;

  if (isNotClientError) return false;

  return ![408, 409, 429].includes(status);
}

function getBulkOperationError(operationError: string | null, queryFailed: boolean) {
  if (operationError) return operationError;
  if (queryFailed) return 'The latest bulk action status could not be loaded.';

  return null;
}
