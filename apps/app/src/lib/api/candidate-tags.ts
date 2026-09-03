import { successSchema } from '@comitium/schemas/public';
import {
  type AssignTagBody,
  type CreateCandidateTagBody,
  candidateTagResponseSchema,
  candidateTagsListSchema,
  type UpdateCandidateTagBody,
} from '@/lib/schemas/candidate-tags';

import { api } from './client';

export function getCandidateTags(orgId: string, includeArchived = false) {
  const params = includeArchived ? '?includeArchived=true' : '';

  return api.get(`/orgs/${orgId}/candidate-tags${params}`, candidateTagsListSchema);
}

export function createCandidateTag(orgId: string, body: CreateCandidateTagBody) {
  return api.post(`/orgs/${orgId}/candidate-tags`, body, candidateTagResponseSchema);
}

export function updateCandidateTag(orgId: string, tagId: string, body: UpdateCandidateTagBody) {
  return api.patch(`/orgs/${orgId}/candidate-tags/${tagId}`, body, candidateTagResponseSchema);
}

export function archiveCandidateTag(orgId: string, tagId: string) {
  return api.post(`/orgs/${orgId}/candidate-tags/${tagId}/archive`, undefined, candidateTagResponseSchema);
}

export function restoreCandidateTag(orgId: string, tagId: string) {
  return api.post(`/orgs/${orgId}/candidate-tags/${tagId}/restore`, undefined, candidateTagResponseSchema);
}

export function assignTagToCandidate(candidateId: string, body: AssignTagBody) {
  return api.post(`/candidates/${candidateId}/tags`, body, successSchema);
}

export function unassignTagFromCandidate(candidateId: string, tagId: string) {
  return api.delete(`/candidates/${candidateId}/tags/${tagId}`, successSchema);
}
