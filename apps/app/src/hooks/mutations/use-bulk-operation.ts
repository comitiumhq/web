import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { attachBulkOperationPayloads, commitBulkOperation, createBulkOperationDraft } from '@/lib/api/bulk-operations';
import type {
  BulkOperation,
  BulkOperationEmailPayload,
  CommitBulkOperationInput,
  CreateBulkOperationDraftInput,
} from '@/lib/schemas/bulk-operations';

type BulkOperationMutationContext<TInput> = {
  orgId: string;
  operationId: string;
  input: TInput;
};

export function useCreateBulkOperationDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, input }: { orgId: string; input: CreateBulkOperationDraftInput }) =>
      createBulkOperationDraft(orgId, input),
    onSuccess: (operation, { orgId }) => {
      cacheBulkOperation(queryClient, orgId, operation);
    },
  });
}

export function useAttachBulkOperationPayloads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, operationId, input }: BulkOperationMutationContext<BulkOperationEmailPayload[]>) =>
      attachBulkOperationPayloads(orgId, operationId, input),
    onSuccess: (operation, { orgId }) => {
      cacheBulkOperation(queryClient, orgId, operation);
    },
  });
}

export function useCommitBulkOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, operationId, input }: BulkOperationMutationContext<CommitBulkOperationInput>) =>
      commitBulkOperation(orgId, operationId, input),
    onSuccess: (operation, { orgId }) => {
      cacheBulkOperation(queryClient, orgId, operation);
    },
  });
}

function cacheBulkOperation(queryClient: QueryClient, orgId: string, operation: BulkOperation) {
  queryClient.setQueryData(qk.pipeline.bulkOperation(orgId, operation.id), operation);
}
