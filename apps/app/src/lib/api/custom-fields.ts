import type { ObjectType } from '@comitium/schemas/forms';
import { successSchema } from '@comitium/schemas/public';
import {
  type CreateCustomFieldBody,
  customFieldRowSchema,
  listCustomFieldsResponseSchema,
  type ReorderCustomFieldsBody,
  type UpdateCustomFieldBody,
} from '@/lib/schemas/custom-fields';

import { api } from './client';

interface ListParams {
  objectType?: ObjectType;
  includeArchived?: boolean;
}

export function getCustomFieldsList(orgId: string, params: ListParams = {}) {
  const search = new URLSearchParams();

  if (params.objectType) {
    search.set('objectType', params.objectType);
  }

  if (params.includeArchived) {
    search.set('includeArchived', 'true');
  }

  const qs = search.toString();
  const path = `/orgs/${orgId}/custom-fields${qs ? `?${qs}` : ''}`;

  return api.get(path, listCustomFieldsResponseSchema);
}

export function createCustomField(orgId: string, body: CreateCustomFieldBody) {
  return api.post(`/orgs/${orgId}/custom-fields`, body, customFieldRowSchema);
}

export function updateCustomField(orgId: string, id: string, body: UpdateCustomFieldBody) {
  return api.patch(`/orgs/${orgId}/custom-fields/${id}`, body, customFieldRowSchema);
}

export function archiveCustomField(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/custom-fields/${id}/archive`, undefined, successSchema);
}

export function restoreCustomField(orgId: string, id: string) {
  return api.post(`/orgs/${orgId}/custom-fields/${id}/restore`, undefined, successSchema);
}

export function reorderCustomFields(orgId: string, body: ReorderCustomFieldsBody) {
  return api.patch(`/orgs/${orgId}/custom-fields/reorder`, body, successSchema);
}
