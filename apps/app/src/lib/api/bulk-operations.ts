import {
  type BulkOperationEmailPayload,
  bulkOperationCapabilitiesSchema,
  bulkOperationSchema,
  type CommitBulkOperationInput,
  type CreateBulkOperationDraftInput,
} from '@/lib/schemas/bulk-operations';
import { api } from './client';

const bulkOperationsPath = (orgId: string) => `/orgs/${orgId}/bulk-operations`;

export function getBulkOperationCapabilities(orgId: string) {
  return api.get(`${bulkOperationsPath(orgId)}/capabilities`, bulkOperationCapabilitiesSchema);
}

export function createBulkOperationDraft(orgId: string, input: CreateBulkOperationDraftInput) {
  return api.post(`${bulkOperationsPath(orgId)}/drafts`, input, bulkOperationSchema);
}

export function getBulkOperation(orgId: string, operationId: string) {
  return api.get(`${bulkOperationsPath(orgId)}/${operationId}`, bulkOperationSchema);
}

export function attachBulkOperationPayloads(orgId: string, operationId: string, payloads: BulkOperationEmailPayload[]) {
  return api.put(
    `${bulkOperationsPath(orgId)}/${operationId}/payloads`,
    {
      payloads: payloads.map(({ itemId, ...data }) => ({
        itemId,
        payloadType: 'application.email.v1' as const,
        data,
      })),
    },
    bulkOperationSchema,
  );
}

export function commitBulkOperation(orgId: string, operationId: string, input: CommitBulkOperationInput) {
  return api.post(`${bulkOperationsPath(orgId)}/${operationId}/commit`, input, bulkOperationSchema);
}
