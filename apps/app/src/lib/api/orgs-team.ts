import { dataArraySchema, dataSchema, successSchema } from '@comitium/schemas/public';
import { type OrgRole, orgTeamMemberSchema, teamCalendarStatusSchema } from '@/lib/schemas/org';

import { api } from './client';

export function getOrgTeam(orgId: string) {
  return api.get(`/orgs/${orgId}/team`, dataArraySchema(orgTeamMemberSchema));
}

export function getOrgTeamMember(orgId: string, userId: string) {
  return api.get(`/orgs/${orgId}/team/${userId}`, dataSchema(orgTeamMemberSchema));
}

export function getTeamCalendarStatus(orgId: string) {
  return api.get(`/orgs/${orgId}/team/calendar-status`, dataArraySchema(teamCalendarStatusSchema));
}

export function changeTeamMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole,
  vaultGrant?: { wrappedVaultKey: unknown },
) {
  return api.patch(`/orgs/${orgId}/team/${userId}/role`, { role, vaultGrant }, successSchema);
}

export function deactivateTeamMember(orgId: string, userId: string) {
  return api.patch(`/orgs/${orgId}/team/${userId}/deactivate`, {}, successSchema);
}

export function reactivateTeamMember(orgId: string, userId: string) {
  return api.patch(`/orgs/${orgId}/team/${userId}/reactivate`, {}, successSchema);
}
