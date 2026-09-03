import type { EncryptedEnvelope } from '@comitium/crypto/schemas';
import type { FinalizeApplicationInput } from '@comitium/schemas/applications';
import {
  applicantStakeReturnAvailabilitySchema,
  applicationFileReservationSchema,
  applicationFileUploadSchema,
  applicationPreparationResultSchema,
  applicationSubmitDispositionSchema,
  myApplicationSchema,
} from '@comitium/schemas/applications';
import { dataSchema, paginatedSchema } from '@comitium/schemas/public';

import { api } from './client';

export function getMyApplications() {
  return api.get('/applications/me', paginatedSchema(myApplicationSchema)).then((res) => res.data);
}

export function getApplicantStakeReturnAvailability() {
  return api
    .get('/applications/me/stake-return', dataSchema(applicantStakeReturnAvailabilitySchema))
    .then((res) => res.data);
}

export function prepareApplication(body: { jobPostingId: string; formId: string }) {
  return api.post('/applications/prepare', body, applicationPreparationResultSchema);
}

export function reserveApplicationFile(
  applicationId: string,
  body: {
    fileId: string;
    kind: 'resume' | 'attachment';
    questionId: string;
    visibility: 'standard' | 'private';
    encryptedMetadata: EncryptedEnvelope;
    declaredMimeType: string;
    expectedEncryptedBytes: number;
  },
) {
  return api.post(`/applications/${applicationId}/files`, body, applicationFileReservationSchema);
}

export function uploadApplicationFile(applicationId: string, fileId: string, uploadToken: string, body: Blob) {
  return api.putBlob(
    `/applications/${applicationId}/files/${fileId}/content`,
    body,
    uploadToken,
    applicationFileUploadSchema,
  );
}

export function finalizeApplication(applicationId: string, body: FinalizeApplicationInput) {
  return api.post(`/applications/${applicationId}/finalize`, body, applicationSubmitDispositionSchema);
}

export function retryApplicationOnchainOperation(applicationId: string, operationId: string, stake: string) {
  return api.post(
    `/applications/${applicationId}/onchain-operation/retry`,
    { operationId, stake },
    applicationSubmitDispositionSchema,
  );
}
