import { dataArraySchema, dataSchema } from '@comitium/schemas/public';
import { contractAuthorityMutationResultSchema } from '@/lib/schemas/contract-authority';
import { type OrgRole, orgTeamMemberSchema, teamCalendarStatusSchema } from '@/lib/schemas/org';

import { api } from './client';
import { type ContractAuthorityProofInput, withContractAuthorityProof } from './contract-authority';

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
  authorityProof: ContractAuthorityProofInput = null,
) {
  return api.patch(
    `/orgs/${orgId}/team/${userId}/role`,
    withContractAuthorityProof({ role, vaultGrant }, authorityProof),
    contractAuthorityMutationResultSchema,
  );
}

export function deactivateTeamMember(orgId: string, userId: string, authorityProof: ContractAuthorityProofInput) {
  return api.patch(
    `/orgs/${orgId}/team/${userId}/deactivate`,
    withContractAuthorityProof({}, authorityProof),
    contractAuthorityMutationResultSchema,
  );
}

export function reactivateTeamMember(orgId: string, userId: string, authorityProof: ContractAuthorityProofInput) {
  return api.patch(
    `/orgs/${orgId}/team/${userId}/reactivate`,
    withContractAuthorityProof({}, authorityProof),
    contractAuthorityMutationResultSchema,
  );
}
