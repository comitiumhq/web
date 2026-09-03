import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
import { useContractAuthorityMutation } from '@/hooks/mutations/use-contract-authority-mutation';
import { qk } from '@/hooks/query-keys';
import {
  createMemberDepartmentGrant,
  replaceMemberDepartmentGrant,
  revokeMemberDepartmentGrant,
} from '@/lib/api/org-structure';
import type { CreateMemberDepartmentGrantBody, ReplaceMemberDepartmentGrantBody } from '@/lib/schemas/org-structure';

interface MemberDepartmentGrantCreateParams {
  orgId: string;
  userId: string;
  body: CreateMemberDepartmentGrantBody;
}

interface MemberDepartmentGrantRevokeParams {
  orgId: string;
  userId: string;
  departmentId: string;
  grantId: string;
}

interface MemberDepartmentGrantReplaceParams {
  orgId: string;
  userId: string;
  departmentId: string;
  grantId: string;
  body: ReplaceMemberDepartmentGrantBody;
}

function invalidateDepartmentGrants(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
  departmentId: string,
) {
  queryClient.invalidateQueries({ queryKey: qk.org.departmentGrants(orgId, departmentId) });
  queryClient.invalidateQueries({ queryKey: qk.org.team(orgId) });
  queryClient.invalidateQueries({ queryKey: qk.org.permissions(orgId) });
  queryClient.invalidateQueries({ queryKey: qk.jobs.accessMeRoot() });
}

function invalidateMemberAccess(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
  userId: string,
  departmentId: string,
) {
  invalidateDepartmentGrants(queryClient, orgId, departmentId);
  queryClient.invalidateQueries({ queryKey: qk.org.teamMember(orgId, userId) });
  queryClient.invalidateQueries({ queryKey: qk.org.memberAccess(orgId, userId) });
}

export function useCreateMemberDepartmentGrant() {
  const queryClient = useQueryClient();
  const executeAuthorityMutation = useContractAuthorityMutation();

  return useMutation({
    mutationFn: async ({ orgId, userId, body }: MemberDepartmentGrantCreateParams) => {
      await executeAuthorityMutation((authorityProof) =>
        createMemberDepartmentGrant(orgId, userId, body, authorityProof),
      );
    },

    onSuccess: (_, { orgId, userId, body }) => {
      toast.success('Department Access granted');

      invalidateMemberAccess(queryClient, orgId, userId, body.departmentId);
    },

    onError: showMutationError,
  });
}

export function useReplaceMemberDepartmentGrant() {
  const queryClient = useQueryClient();
  const executeAuthorityMutation = useContractAuthorityMutation();

  return useMutation({
    mutationFn: async ({ orgId, userId, grantId, body }: MemberDepartmentGrantReplaceParams) => {
      await executeAuthorityMutation((authorityProof) =>
        replaceMemberDepartmentGrant(orgId, userId, grantId, body, authorityProof),
      );
    },

    onSuccess: (_, { orgId, userId, departmentId }) => {
      toast.success('Access role updated');

      invalidateMemberAccess(queryClient, orgId, userId, departmentId);
    },

    onError: showMutationError,
  });
}

export function useRevokeMemberDepartmentGrant() {
  const queryClient = useQueryClient();
  const executeAuthorityMutation = useContractAuthorityMutation();

  return useMutation({
    mutationFn: async ({ orgId, userId, grantId }: MemberDepartmentGrantRevokeParams) => {
      await executeAuthorityMutation((authorityProof) =>
        revokeMemberDepartmentGrant(orgId, userId, grantId, authorityProof),
      );
    },

    onSuccess: (_, { orgId, userId, departmentId }) => {
      toast.success('Department Access revoked');

      invalidateMemberAccess(queryClient, orgId, userId, departmentId);
    },

    onError: showMutationError,
  });
}
