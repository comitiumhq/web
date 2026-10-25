import {
  type BatchWriteCandidateCustomFieldValuesBody,
  batchWriteCandidateCustomFieldValuesResponseSchema,
  listCandidateCustomFieldValuesResponseSchema,
} from '@/lib/schemas/candidate-custom-field-values';

import { api } from './client';

export function getCandidateCustomFieldValues(candidateId: string) {
  return api.get(`/candidates/${candidateId}/custom-field-values`, listCandidateCustomFieldValuesResponseSchema);
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
