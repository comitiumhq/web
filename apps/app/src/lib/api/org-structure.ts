import { successSchema } from '@comitium/schemas/public';
import { contractAuthorityMutationResultSchema } from '@/lib/schemas/contract-authority';
import {
  type CreateMemberDepartmentGrantBody,
  type CreateOrgDepartmentBody,
  type CreateOrgLocationBody,
  listOrgDepartmentsResponseSchema,
  listOrgLocationsResponseSchema,
  memberAccessResponseSchema,
  orgDepartmentSchema,
  orgLocationSchema,
  type ReplaceMemberDepartmentGrantBody,
  type UpdateOrgDepartmentBody,
  type UpdateOrgLocationBody,
} from '@/lib/schemas/org-structure';

import { api } from './client';
import { type ContractAuthorityProofInput, withContractAuthorityProof } from './contract-authority';

interface ListParams {
  includeArchived?: boolean;
}

function withArchived(path: string, params: ListParams) {
  if (!params.includeArchived) {
    return path;
  }

  return `${path}?includeArchived=true`;
}

export function getOrgDepartments(orgId: string, params: ListParams = {}) {
  return api.get(withArchived(`/orgs/${orgId}/departments`, params), listOrgDepartmentsResponseSchema);
}

export function createOrgDepartment(orgId: string, body: CreateOrgDepartmentBody) {
  return api.post(`/orgs/${orgId}/departments`, body, orgDepartmentSchema);
}

export function updateOrgDepartment(orgId: string, departmentId: string, body: UpdateOrgDepartmentBody) {
  return api.patch(`/orgs/${orgId}/departments/${departmentId}`, body, orgDepartmentSchema);
}

export function archiveOrgDepartment(orgId: string, departmentId: string, authorityProof: ContractAuthorityProofInput) {
  return api.post(
    `/orgs/${orgId}/departments/${departmentId}/archive`,
    withContractAuthorityProof({}, authorityProof),
    contractAuthorityMutationResultSchema,
  );
}

export function restoreOrgDepartment(orgId: string, departmentId: string, authorityProof: ContractAuthorityProofInput) {
  return api.post(
    `/orgs/${orgId}/departments/${departmentId}/restore`,
    withContractAuthorityProof({}, authorityProof),
    contractAuthorityMutationResultSchema,
  );
}

export function getMemberAccess(orgId: string, userId: string) {
  return api.get(`/orgs/${orgId}/members/${userId}/access`, memberAccessResponseSchema);
}

export function createMemberDepartmentGrant(
  orgId: string,
  userId: string,
  body: CreateMemberDepartmentGrantBody,
  authorityProof: ContractAuthorityProofInput,
) {
  return api.post(
    `/orgs/${orgId}/members/${userId}/department-grants`,
    withContractAuthorityProof(body, authorityProof),
    contractAuthorityMutationResultSchema,
  );
}

export function replaceMemberDepartmentGrant(
  orgId: string,
  userId: string,
  grantId: string,
  body: ReplaceMemberDepartmentGrantBody,
  authorityProof: ContractAuthorityProofInput,
) {
  return api.patch(
    `/orgs/${orgId}/members/${userId}/department-grants/${grantId}`,
    withContractAuthorityProof(body, authorityProof),
    contractAuthorityMutationResultSchema,
  );
}

export function revokeMemberDepartmentGrant(
  orgId: string,
  userId: string,
  grantId: string,
  authorityProof: ContractAuthorityProofInput,
) {
  return api.delete(
    `/orgs/${orgId}/members/${userId}/department-grants/${grantId}`,
    withContractAuthorityProof({}, authorityProof),
    contractAuthorityMutationResultSchema,
  );
}

export function getOrgLocations(orgId: string, params: ListParams = {}) {
  return api.get(withArchived(`/orgs/${orgId}/locations`, params), listOrgLocationsResponseSchema);
}

export function createOrgLocation(orgId: string, body: CreateOrgLocationBody) {
  return api.post(`/orgs/${orgId}/locations`, body, orgLocationSchema);
}

export function updateOrgLocation(orgId: string, locationId: string, body: UpdateOrgLocationBody) {
  return api.patch(`/orgs/${orgId}/locations/${locationId}`, body, orgLocationSchema);
}

export function archiveOrgLocation(orgId: string, locationId: string) {
  return api.post(`/orgs/${orgId}/locations/${locationId}/archive`, undefined, successSchema);
}

export function restoreOrgLocation(orgId: string, locationId: string) {
  return api.post(`/orgs/${orgId}/locations/${locationId}/restore`, undefined, successSchema);
}
