import { successSchema } from '@comitium/schemas/public';
import {
  type CreateReasonBody,
  listReasonsResponseSchema,
  type ReasonAppliesTo,
  reasonRowSchema,
  type UpdateReasonBody,
} from '@/lib/schemas/cancel-reschedule-reasons';

import { api } from './client';

interface ListReasonsParams {
  includeArchived?: boolean;
  appliesTo?: ReasonAppliesTo;
}

export function getCancelRescheduleReasons(orgId: string, params: ListReasonsParams = {}) {
  const search = new URLSearchParams();

  if (params.includeArchived) {
    search.set('includeArchived', 'true');
  }

  if (params.appliesTo) {
    search.set('appliesTo', params.appliesTo);
  }

  const qs = search.toString();
  const path = `/orgs/${orgId}/cancel-reschedule-reasons${qs ? `?${qs}` : ''}`;

  return api.get(path, listReasonsResponseSchema);
}

export function createCancelRescheduleReason(orgId: string, body: CreateReasonBody) {
  return api.post(`/orgs/${orgId}/cancel-reschedule-reasons`, body, reasonRowSchema);
}

export function updateCancelRescheduleReason(orgId: string, id: string, body: UpdateReasonBody) {
  return api.patch(`/orgs/${orgId}/cancel-reschedule-reasons/${id}`, body, reasonRowSchema);
}

export function archiveCancelRescheduleReason(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/cancel-reschedule-reasons/${id}/archive`, undefined, successSchema);
}

export function restoreCancelRescheduleReason(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/cancel-reschedule-reasons/${id}/restore`, undefined, successSchema);
}
