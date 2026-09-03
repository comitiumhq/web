import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { qk } from '@/hooks/query-keys';
import {
  archiveOrgDepartment,
  archiveOrgLocation,
  createOrgDepartment,
  createOrgLocation,
  restoreOrgDepartment,
  restoreOrgLocation,
  updateOrgDepartment,
  updateOrgLocation,
} from '@/lib/api/org-structure';
import type {
  CreateOrgDepartmentBody,
  CreateOrgLocationBody,
  UpdateOrgDepartmentBody,
  UpdateOrgLocationBody,
} from '@/lib/schemas/org-structure';
import { useContractAuthorityMutation } from './use-contract-authority-mutation';

function invalidateOrgStructure(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({ queryKey: qk.org.departmentsRoot(orgId) });
  queryClient.invalidateQueries({ queryKey: qk.org.locationsRoot(orgId) });
}

function invalidateDepartmentCoverage(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  invalidateOrgStructure(queryClient, orgId);
  queryClient.invalidateQueries({ queryKey: qk.org.team(orgId) });
}

interface DepartmentCreateParams {
  orgId: string;
  body: CreateOrgDepartmentBody;
}

interface DepartmentUpdateParams {
  orgId: string;
  departmentId: string;
  body: UpdateOrgDepartmentBody;
}

interface LocationCreateParams {
  orgId: string;
  body: CreateOrgLocationBody;
}

interface LocationUpdateParams {
  orgId: string;
  locationId: string;
  body: UpdateOrgLocationBody;
}

interface IdParams {
  orgId: string;
  id: string;
}

export function useCreateOrgDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, body }: DepartmentCreateParams) => createOrgDepartment(orgId, body),

    onSuccess: (_, { orgId }) => {
      toast.success('Department created');
      invalidateOrgStructure(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useUpdateOrgDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, departmentId, body }: DepartmentUpdateParams) =>
      updateOrgDepartment(orgId, departmentId, body),

    onSuccess: (_, { orgId }) => {
      toast.success('Department updated');
      invalidateOrgStructure(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useArchiveOrgDepartment() {
  const queryClient = useQueryClient();
  const executeAuthorityMutation = useContractAuthorityMutation();

  return useMutation({
    mutationFn: async ({ orgId, id }: IdParams) => {
      await executeAuthorityMutation((authorityProof) => archiveOrgDepartment(orgId, id, authorityProof));
    },

    onSuccess: (_, { orgId }) => {
      toast.success('Department archived');

      invalidateDepartmentCoverage(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useRestoreOrgDepartment() {
  const queryClient = useQueryClient();
  const executeAuthorityMutation = useContractAuthorityMutation();

  return useMutation({
    mutationFn: async ({ orgId, id }: IdParams) => {
      await executeAuthorityMutation((authorityProof) => restoreOrgDepartment(orgId, id, authorityProof));
    },

    onSuccess: (_, { orgId }) => {
      toast.success('Department restored');

      invalidateDepartmentCoverage(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useCreateOrgLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, body }: LocationCreateParams) => createOrgLocation(orgId, body),

    onSuccess: (_, { orgId }) => {
      toast.success('Location created');
      invalidateOrgStructure(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useUpdateOrgLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, locationId, body }: LocationUpdateParams) => updateOrgLocation(orgId, locationId, body),

    onSuccess: (_, { orgId }) => {
      toast.success('Location updated');
      invalidateOrgStructure(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useArchiveOrgLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => archiveOrgLocation(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Location archived');
      invalidateOrgStructure(queryClient, orgId);
    },

    onError: showMutationError,
  });
}

export function useRestoreOrgLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, id }: IdParams) => restoreOrgLocation(orgId, id),

    onSuccess: (_, { orgId }) => {
      toast.success('Location restored');
      invalidateOrgStructure(queryClient, orgId);
    },

    onError: showMutationError,
  });
}
