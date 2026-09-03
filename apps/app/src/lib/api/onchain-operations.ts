import {
  type OnchainRequestSignatureSubmit,
  onchainOperationStatusSchema,
  onchainRequestSignatureSubmitSchema,
  userWalletAuthorizationSubmitSchema,
} from '@comitium/schemas/onchain-operations';

import { api } from './client';

export function submitOnchainOperationSignature(
  orgId: string,
  operationId: string,
  submission: OnchainRequestSignatureSubmit,
) {
  return api.post<void>(
    `/orgs/${orgId}/onchain-operations/${operationId}/signature`,
    onchainRequestSignatureSubmitSchema.parse(submission),
    null,
  );
}

export function getOnchainOperationStatus(operationId: string, signal?: AbortSignal) {
  if (!signal) {
    return api.get(`/onchain-operations/${operationId}`, onchainOperationStatusSchema);
  }

  return api.get(`/onchain-operations/${operationId}`, onchainOperationStatusSchema, { signal });
}

export function submitUserWalletTransaction(
  operationId: string,
  authorization: { requestId: string; authorizationSignature: string },
) {
  return api.post<void>(
    `/onchain-operations/${operationId}/wallet-submit`,
    userWalletAuthorizationSubmitSchema.parse(authorization),
    null,
  );
}
