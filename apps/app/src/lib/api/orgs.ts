import { dataArraySchema, dataSchema, successSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import type { PrepareOrgContentUriUpdateData, UpdateMemberProfileData } from '@/lib/schemas/org';
import {
  myOrgSchema,
  orgDetailsSchema,
  orgMeSchema,
  orgTreasuryStatusSchema,
  prepareOrgContentUriUpdateResponseSchema,
  workspaceSetupSchema,
} from '@/lib/schemas/org';

import { api } from './client';

const memberAvatarResponseSchema = z.object({ avatarUrl: z.string() });

export interface MemberAvatarCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MemberAvatarUpload {
  file: File;
  crop: MemberAvatarCrop;
}

export function getMyOrgs() {
  return api.get('/orgs', dataArraySchema(myOrgSchema));
}

export function getOrg(orgId: string) {
  return api.get(`/orgs/${orgId}`, orgDetailsSchema);
}

export function getOrgMe(orgId: string) {
  return api.get(`/orgs/${orgId}/member`, orgMeSchema);
}

export function getWorkspaceSetup(orgId: string) {
  return api.get(`/orgs/${orgId}/workspace-setup`, dataSchema(workspaceSetupSchema));
}

export function getOrgTreasuryStatus(orgId: string) {
  return api.get(`/orgs/${orgId}/treasury`, orgTreasuryStatusSchema);
}

export function updateMemberProfile(orgId: string, data: UpdateMemberProfileData) {
  return api.patch(`/orgs/${orgId}/member/profile`, data, successSchema);
}

export function uploadMemberAvatar(orgId: string, { file, crop }: MemberAvatarUpload) {
  const formData = new FormData();
  formData.set('file', file);
  formData.set('crop', JSON.stringify(crop));

  return api.upload(`/orgs/${orgId}/member/avatar`, formData, memberAvatarResponseSchema);
}

export async function deleteMemberAvatar(orgId: string) {
  await api.delete(`/orgs/${orgId}/member/avatar`, successSchema);

  return { avatarUrl: null };
}

export function prepareOrgContentUriUpdate(orgId: string, data: PrepareOrgContentUriUpdateData) {
  return api.post(`/orgs/${orgId}/profile/prepare`, data, prepareOrgContentUriUpdateResponseSchema);
}
