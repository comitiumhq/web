import type { JobAccessRole } from '@comitium/schemas/jobs';
import { getMemberDisplayName, truncateAddress } from '@comitium/ui/display-name';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrgDepartments } from '@/hooks/queries/use-query-org-structure';
import { useQueryOrgTeamMap, useQueryOrgTeamMember } from '@/hooks/queries/use-query-org-team';
import { usePermissions, useQueryOrgMe } from '@/hooks/use-permissions';
import { type OrgRole, Permission } from '@/lib/schemas/org';
import type { DepartmentGrant, VaultGrant } from '@/lib/schemas/org-structure';
import { getErrorMessage } from '@/lib/utils';

import {
  useCreateMemberDepartmentGrant,
  useReplaceMemberDepartmentGrant,
  useRevokeMemberDepartmentGrant,
} from './hooks/use-member-access-mutations';
import { useQueryMemberAccess } from './hooks/use-member-access-query';
import { useEnsureMemberVaultGrant } from './hooks/use-member-vault-grant';
import { useDeactivateMember, useReactivateMember } from './hooks/use-team-member-lifecycle';
import { useChangeRole } from './hooks/use-team-member-role';
import { getMemberPermissionsState } from './member-permissions-state';

interface UseMemberPermissionsModelParams {
  org: MyOrg;
  userId: string;
  currentTreasury: string | null;
}

export function useMemberPermissionsModel({ org, userId, currentTreasury }: UseMemberPermissionsModelParams) {
  const { can, role: callerRole } = usePermissions();
  const { data: caller } = useQueryOrgMe(org.id);
  const canManageAccess = can(Permission.ACCESS_ROLE_WRITE);
  const canManageRole = can(Permission.ORG_MEMBER_WRITE);

  const teamMap = useQueryOrgTeamMap(org.id);
  const { data: liveMember } = useQueryOrgTeamMember(org.id, userId);
  const member = liveMember ?? teamMap.get(userId) ?? null;
  const {
    data: memberAccess,
    isError: isMemberAccessError,
    isLoading: isMemberAccessLoading,
  } = useQueryMemberAccess(org.id, userId);
  const { data: departmentsData } = useQueryOrgDepartments(org.id);

  const changeRole = useChangeRole();
  const createGrant = useCreateMemberDepartmentGrant();
  const replaceGrant = useReplaceMemberDepartmentGrant();
  const revokeGrant = useRevokeMemberDepartmentGrant();
  const ensureVaultGrant = useEnsureMemberVaultGrant();
  const { mutate: deactivateMutate, isPending: isDeactivating } = useDeactivateMember();
  const { mutate: reactivateMutate, isPending: isReactivating } = useReactivateMember();
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  const departments = departmentsData?.data ?? [];
  const grants = useMemo(() => memberAccess?.departmentGrants ?? [], [memberAccess]);
  const jobAssignments = useMemo(() => memberAccess?.directJobAssignments ?? [], [memberAccess]);
  const activeOrgAdminCount = useMemo(
    () => [...teamMap.values()].filter((teamMember) => teamMember.isActive && teamMember.role === 'org_admin').length,
    [teamMap],
  );
  const hasVaultAccess = member?.hasVaultAccess ?? false;
  const isMemberMutationPending =
    changeRole.isPending || createGrant.isPending || replaceGrant.isPending || revokeGrant.isPending;

  const memberState = useMemo(() => {
    if (member === null) {
      return null;
    }

    return getMemberPermissionsState({
      member,
      callerId: caller?.userId ?? null,
      callerRole,
      currentTreasury,
      canManageAccess,
      canManageRole,
      activeOrgAdminCount,
      isMemberMutationPending,
    });
  }, [
    member,
    caller?.userId,
    callerRole,
    currentTreasury,
    canManageAccess,
    canManageRole,
    activeOrgAdminCount,
    isMemberMutationPending,
  ]);

  const displayName = member === null ? 'Member' : getMemberDisplayName(member);
  const identityLine = member === null ? userId : (member.email ?? truncateAddress(member.walletAddress));

  const handleRoleChange = useCallback(
    async (nextRole: string) => {
      const role = nextRole as OrgRole;

      if (member === null || role === member.role) {
        return;
      }

      if (memberState?.isCurrentTreasuryAdmin && role !== 'org_admin') {
        toast.error('This admin controls the treasury wallet, so their role cannot be changed.');

        return;
      }

      if (memberState === null || !memberState.canManageRole) {
        return;
      }

      let vaultGrant: VaultGrant | undefined;

      if (role === 'org_admin') {
        try {
          vaultGrant = await ensureVaultGrant(org.id, member.walletAddress, hasVaultAccess);
        } catch (error) {
          toast.error(getErrorMessage(error, 'Could not prepare Vault Access'));

          return;
        }
      }

      changeRole.mutate({ orgId: org.id, userId, role, vaultGrant });
    },
    [member, memberState, ensureVaultGrant, org.id, hasVaultAccess, changeRole, userId],
  );

  const handleAddGrant = useCallback(
    async (departmentId: string, roleSlug: JobAccessRole): Promise<boolean> => {
      let vaultGrant: VaultGrant | undefined;

      if (member === null) {
        return false;
      }

      try {
        vaultGrant = await ensureVaultGrant(org.id, member.walletAddress, hasVaultAccess);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not prepare Vault Access'));

        return false;
      }

      try {
        await createGrant.mutateAsync({
          orgId: org.id,
          userId,
          body: { departmentId, roleSlug, vaultGrant },
        });

        return true;
      } catch {
        return false;
      }
    },
    [ensureVaultGrant, org.id, member, hasVaultAccess, createGrant, userId],
  );

  const handleReplaceGrantRole = useCallback(
    async (grant: DepartmentGrant, roleSlug: JobAccessRole): Promise<boolean> => {
      if (roleSlug === grant.role) {
        return true;
      }

      try {
        await replaceGrant.mutateAsync({
          orgId: org.id,
          userId,
          departmentId: grant.departmentId,
          grantId: grant.id,
          body: { roleSlug },
        });

        return true;
      } catch {
        return false;
      }
    },
    [replaceGrant, org.id, userId],
  );

  const handleRevokeGrant = useCallback(
    async (grant: DepartmentGrant): Promise<boolean> => {
      try {
        await revokeGrant.mutateAsync({
          orgId: org.id,
          userId,
          departmentId: grant.departmentId,
          grantId: grant.id,
        });

        return true;
      } catch {
        return false;
      }
    },
    [revokeGrant, org.id, userId],
  );

  const handleDeactivate = useCallback(() => {
    if (member === null) {
      return;
    }

    if (memberState?.isCurrentTreasuryAdmin) {
      toast.error('This admin controls the treasury wallet, so they cannot be deactivated.');

      return;
    }

    if (memberState === null || !memberState.canDeactivate) {
      return;
    }

    deactivateMutate(
      {
        orgId: org.id,
        userId: member.userId,
      },
      { onSuccess: () => setDeactivateDialogOpen(false) },
    );
  }, [member, memberState, org.id, deactivateMutate]);

  const handleReactivate = useCallback(() => {
    if (member === null) {
      return;
    }

    reactivateMutate({
      orgId: org.id,
      userId: member.userId,
    });
  }, [member, org.id, reactivateMutate]);

  const openDeactivateDialog = useCallback(() => {
    setDeactivateDialogOpen(true);
  }, []);

  const handleDeactivateDialogOpenChange = useCallback(
    (open: boolean) => {
      if (isDeactivating) {
        return;
      }

      setDeactivateDialogOpen(open);
    },
    [isDeactivating],
  );

  return {
    member,
    memberState,
    departments,
    displayName,
    grants,
    identityLine,
    jobAssignments,
    memberAccessState: {
      isError: isMemberAccessError,
      isLoading: isMemberAccessLoading,
    },
    deactivateDialogOpen,
    pending: {
      changeRole: changeRole.isPending,
      lifecycle: isDeactivating || isReactivating,
    },
    actions: {
      handleAddGrant,
      handleDeactivate,
      handleReactivate,
      handleReplaceGrantRole,
      handleRevokeGrant,
      handleRoleChange,
      handleDeactivateDialogOpenChange,
      openDeactivateDialog,
    },
  };
}
