import { successSchema } from '@comitium/schemas/public';
import {
  type CreateCloseReasonBody,
  closeReasonRowSchema,
  listCloseReasonsResponseSchema,
  type UpdateCloseReasonBody,
} from '@/lib/schemas/close-reasons';

import { api } from './client';

interface ListParams {
  includeArchived?: boolean;
}

export function getCloseReasonsList(orgId: string, params: ListParams = {}) {
  const search = new URLSearchParams();

  if (params.includeArchived) {
    search.set('includeArchived', 'true');
  }

  const qs = search.toString();
  const path = `/orgs/${orgId}/close-reasons${qs ? `?${qs}` : ''}`;

  return api.get(path, listCloseReasonsResponseSchema);
}

export function createCloseReason(orgId: string, body: CreateCloseReasonBody) {
  return api.post(`/orgs/${orgId}/close-reasons`, body, closeReasonRowSchema);
}

export function updateCloseReason(orgId: string, id: string, body: UpdateCloseReasonBody) {
  return api.patch(`/orgs/${orgId}/close-reasons/${id}`, body, closeReasonRowSchema);
}

export function archiveCloseReason(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/close-reasons/${id}/archive`, undefined, successSchema);
}

export function restoreCloseReason(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/close-reasons/${id}/restore`, undefined, successSchema);
}
