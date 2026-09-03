import { successSchema } from '@comitium/schemas/public';
import {
  archiveReasonRowSchema,
  type CreateArchiveReasonBody,
  listArchiveReasonsResponseSchema,
  type UpdateArchiveReasonBody,
} from '@/lib/schemas/archive-reasons';

import { api } from './client';

interface ListParams {
  includeArchived?: boolean;
}

export function getArchiveReasonsList(orgId: string, params: ListParams = {}) {
  const search = new URLSearchParams();

  if (params.includeArchived) {
    search.set('includeArchived', 'true');
  }

  const qs = search.toString();
  const path = `/orgs/${orgId}/archive-reasons${qs ? `?${qs}` : ''}`;

  return api.get(path, listArchiveReasonsResponseSchema);
}

export function createArchiveReason(orgId: string, body: CreateArchiveReasonBody) {
  return api.post(`/orgs/${orgId}/archive-reasons`, body, archiveReasonRowSchema);
}

export function updateArchiveReason(orgId: string, id: string, body: UpdateArchiveReasonBody) {
  return api.patch(`/orgs/${orgId}/archive-reasons/${id}`, body, archiveReasonRowSchema);
}

export function archiveArchiveReason(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/archive-reasons/${id}/archive`, undefined, successSchema);
}

export function restoreArchiveReason(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/archive-reasons/${id}/restore`, undefined, successSchema);
}
