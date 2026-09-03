import { dataPrivacySettingsResponseSchema, type UpdateDataPrivacySettingsInput } from '@/lib/schemas/data-privacy';

import { api } from './client';

export function getDataPrivacySettings(orgId: string) {
  return api.get(`/orgs/${orgId}/data-privacy`, dataPrivacySettingsResponseSchema);
}

export function updateDataPrivacySettings(orgId: string, body: UpdateDataPrivacySettingsInput) {
  return api.patch(`/orgs/${orgId}/data-privacy`, body, dataPrivacySettingsResponseSchema);
}
