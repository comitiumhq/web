import { dataArraySchema, dataSchema, successSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import type { UpdateMemberProfileData, UpdateOrgProfileData } from '@/lib/schemas/org';
import {
  myOrgSchema,
  orgDetailsSchema,
  orgMeSchema,
  updateOrgProfileResponseSchema,
  workspaceSetupSchema,
} from '@/lib/schemas/org';

import { api } from './client';

const orgLogoResponseSchema = z.object({ logo: z.url({ protocol: /^https?$/ }).max(150) });

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

export function updateOrgProfile(orgId: string, data: UpdateOrgProfileData) {
  return api.patch(`/orgs/${orgId}/profile`, data, updateOrgProfileResponseSchema);
}

export function uploadOrgLogo(orgId: string, file: File) {
  const formData = new FormData();

  formData.set('file', file);

  return api.upload(`/orgs/${orgId}/logo`, formData, orgLogoResponseSchema);
}
