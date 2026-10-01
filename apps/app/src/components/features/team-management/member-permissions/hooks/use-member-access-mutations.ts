import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showMutationError } from '@/hooks/mutations/mutation-error';
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

  return useMutation({
    mutationFn: ({ orgId, userId, body }: MemberDepartmentGrantCreateParams) =>
      createMemberDepartmentGrant(orgId, userId, body),

    onSuccess: (_, { orgId, userId, body }) => {
      toast.success('Department Access granted');

      invalidateMemberAccess(queryClient, orgId, userId, body.departmentId);
    },

    onError: showMutationError,
  });
}

export function useReplaceMemberDepartmentGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId, grantId, body }: MemberDepartmentGrantReplaceParams) =>
      replaceMemberDepartmentGrant(orgId, userId, grantId, body),

    onSuccess: (_, { orgId, userId, departmentId }) => {
      toast.success('Access role updated');

      invalidateMemberAccess(queryClient, orgId, userId, departmentId);
    },

    onError: showMutationError,
  });
}

export function useRevokeMemberDepartmentGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId, grantId }: MemberDepartmentGrantRevokeParams) =>
      revokeMemberDepartmentGrant(orgId, userId, grantId),

    onSuccess: (_, { orgId, userId, departmentId }) => {
      toast.success('Department Access revoked');

      invalidateMemberAccess(queryClient, orgId, userId, departmentId);
    },

    onError: showMutationError,
  });
}
