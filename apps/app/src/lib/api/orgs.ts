import { dataArraySchema, successSchema } from '@comitium/schemas/public';
import type { PrepareOrgContentUriUpdateData, UpdateMemberProfileData } from '@/lib/schemas/org';
import {
  myOrgSchema,
  orgDetailsSchema,
  orgMeSchema,
  orgTreasuryStatusSchema,
  prepareOrgContentUriUpdateResponseSchema,
} from '@/lib/schemas/org';

import { api } from './client';

export function getMyOrgs() {
  return api.get('/orgs', dataArraySchema(myOrgSchema));
}

export function getOrg(orgId: string) {
  return api.get(`/orgs/${orgId}`, orgDetailsSchema);
}

export function getOrgMe(orgId: string) {
  return api.get(`/orgs/${orgId}/member`, orgMeSchema);
}

export function getOrgTreasuryStatus(orgId: string) {
  return api.get(`/orgs/${orgId}/treasury`, orgTreasuryStatusSchema);
}

export function updateMemberProfile(orgId: string, data: UpdateMemberProfileData) {
  return api.patch(`/orgs/${orgId}/member/profile`, data, successSchema);
}

export function prepareOrgContentUriUpdate(orgId: string, data: PrepareOrgContentUriUpdateData) {
  return api.post(`/orgs/${orgId}/profile/prepare`, data, prepareOrgContentUriUpdateResponseSchema);
}
