import {
  type BatchWriteCandidateCustomFieldValuesBody,
  batchWriteCandidateCustomFieldValuesResponseSchema,
  listCandidateCustomFieldValuesResponseSchema,
  type ProjectCandidateCustomFieldValueBody,
  projectCandidateCustomFieldValueResponseSchema,
} from '@/lib/schemas/candidate-custom-field-values';

import { api } from './client';

export function getCandidateCustomFieldValues(candidateId: string) {
  return api.get(`/candidates/${candidateId}/custom-field-values`, listCandidateCustomFieldValuesResponseSchema);
}

export function projectCandidateCustomFieldValue(candidateId: string, body: ProjectCandidateCustomFieldValueBody) {
  return api.post(
    `/candidates/${candidateId}/form-field-projections`,
    body,
    projectCandidateCustomFieldValueResponseSchema,
  );
}

export function batchWriteCandidateCustomFieldValues(
  candidateId: string,
  body: BatchWriteCandidateCustomFieldValuesBody,
) {
  return api.put(
    `/candidates/${candidateId}/custom-field-values`,
    body,
    batchWriteCandidateCustomFieldValuesResponseSchema,
  );
}
