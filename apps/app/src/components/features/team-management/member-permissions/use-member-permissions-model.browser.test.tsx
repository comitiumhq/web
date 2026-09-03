import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import type { OrgTeamMember } from '@/lib/schemas/org';
import type { VaultGrant } from '@/lib/schemas/org-structure';
import { useMemberPermissionsModel } from './use-member-permissions-model';

const MEMBER_USER_ID = '11111111-1111-4111-8111-111111111111';
const CALLER_USER_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ADDRESS = '0x1111111111111111111111111111111111111111';

const mocks = vi.hoisted(() => ({
  callerUserId: '22222222-2222-4222-8222-222222222222',
  changeRole: {
    isPending: false,
    mutate: vi.fn(),
  },
  createGrant: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  deactivate: vi.fn(),
  ensureVaultGrant: vi.fn(),
  member: null as OrgTeamMember | null,
  replaceGrant: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  revokeGrant: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ can: () => true, role: 'org_admin' }),
  useQueryOrgMe: () => ({ data: { userId: mocks.callerUserId } }),
}));

vi.mock('@/hooks/queries/use-query-org-structure', () => ({
  useQueryOrgDepartments: () => ({ data: { data: [] } }),
}));

vi.mock('@/hooks/queries/use-query-org-team', () => ({
  useQueryOrgTeamMap: () => new Map(mocks.member ? [[mocks.member.userId, mocks.member]] : []),
  useQueryOrgTeamMember: () => ({ data: mocks.member }),
}));

vi.mock('./hooks/use-member-access-query', () => ({
  useQueryMemberAccess: () => ({
    data: { departmentGrants: [], directJobAssignments: [] },
    isError: false,
    isLoading: false,
  }),
}));

vi.mock('./hooks/use-member-access-mutations', () => ({
  useCreateMemberDepartmentGrant: () => mocks.createGrant,
  useReplaceMemberDepartmentGrant: () => mocks.replaceGrant,
  useRevokeMemberDepartmentGrant: () => mocks.revokeGrant,
}));

vi.mock('./hooks/use-member-vault-grant', () => ({
  useEnsureMemberVaultGrant: () => mocks.ensureVaultGrant,
}));

vi.mock('./hooks/use-team-member-lifecycle', () => ({
  useDeactivateMember: () => ({ mutate: mocks.deactivate, isPending: false }),
  useReactivateMember: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('./hooks/use-team-member-role', () => ({
  useChangeRole: () => mocks.changeRole,
}));

const org = { id: 'org-1' } as MyOrg;
const vaultGrant: VaultGrant = {
  wrappedVaultKey: {
    v: 1,
    ek: 'vault-key',
    epk: 'ephemeral-key',
    kemCt: 'kem-ciphertext',
    iv: 'vault-key-iv',
  },
};

function member(overrides: Partial<OrgTeamMember> = {}): OrgTeamMember {
  return {
    userId: MEMBER_USER_ID,
    walletAddress: MEMBER_ADDRESS,
    email: 'member@example.com',
    name: 'Member',
    jobTitle: null,
    role: 'org_member',
    timezone: null,
    isActive: true,
    hasVaultAccess: false,
    hasScopedAccess: false,
    accessSummary: { departmentGrants: [], directJobAssignments: [] },
    invitedBy: null,
    createdAt: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mocks.callerUserId = CALLER_USER_ID;
  mocks.changeRole.isPending = false;
  mocks.changeRole.mutate.mockReset();
  mocks.createGrant.isPending = false;
  mocks.createGrant.mutateAsync.mockReset();
  mocks.createGrant.mutateAsync.mockResolvedValue(undefined);
  mocks.deactivate.mockReset();
  mocks.ensureVaultGrant.mockReset();
  mocks.ensureVaultGrant.mockResolvedValue(vaultGrant);
  mocks.member = member();
  mocks.replaceGrant.isPending = false;
  mocks.replaceGrant.mutateAsync.mockReset();
  mocks.revokeGrant.isPending = false;
  mocks.revokeGrant.mutateAsync.mockReset();
  mocks.toastError.mockReset();
});

describe('useMemberPermissionsModel mutation ordering', () => {
  it('prepares Vault Access before promoting a member to organization admin', async () => {
    const hook = await renderHook(() =>
      useMemberPermissionsModel({ org, userId: MEMBER_USER_ID, currentTreasury: null }),
    );

    await hook.result.current.actions.handleRoleChange('org_admin');

    expect(mocks.ensureVaultGrant).toHaveBeenCalledExactlyOnceWith('org-1', MEMBER_ADDRESS, false);
    expect(mocks.changeRole.mutate).toHaveBeenCalledExactlyOnceWith({
      orgId: 'org-1',
      userId: MEMBER_USER_ID,
      role: 'org_admin',
      vaultGrant,
    });
    expect(mocks.ensureVaultGrant.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.changeRole.mutate.mock.invocationCallOrder[0],
    );
  });

  it('aborts role mutation when Vault Access preparation fails', async () => {
    mocks.ensureVaultGrant.mockRejectedValue(new Error('vault unavailable'));
    const hook = await renderHook(() =>
      useMemberPermissionsModel({ org, userId: MEMBER_USER_ID, currentTreasury: null }),
    );

    await hook.result.current.actions.handleRoleChange('org_admin');

    expect(mocks.changeRole.mutate).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith('vault unavailable');
  });

  it('prepares Vault Access before creating department access', async () => {
    const hook = await renderHook(() =>
      useMemberPermissionsModel({ org, userId: MEMBER_USER_ID, currentTreasury: null }),
    );

    await expect(hook.result.current.actions.handleAddGrant('department-1', 'hiring_member')).resolves.toBe(true);

    expect(mocks.createGrant.mutateAsync).toHaveBeenCalledExactlyOnceWith({
      orgId: 'org-1',
      userId: MEMBER_USER_ID,
      body: { departmentId: 'department-1', roleSlug: 'hiring_member', vaultGrant },
    });
    expect(mocks.ensureVaultGrant.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createGrant.mutateAsync.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ['self', () => ({ callerUserId: MEMBER_USER_ID, member: member() })],
    ['last organization admin', () => ({ callerUserId: CALLER_USER_ID, member: member({ role: 'org_admin' }) })],
    ['treasury admin', () => ({ callerUserId: CALLER_USER_ID, member: member({ role: 'org_admin' }) })],
  ])('does not deactivate the protected %s', async (scenario, arrange) => {
    const state = arrange();
    mocks.callerUserId = state.callerUserId;
    mocks.member = state.member;
    const currentTreasury =
      scenario === 'treasury admin' ? MEMBER_ADDRESS : '0x2222222222222222222222222222222222222222';
    const hook = await renderHook(() => useMemberPermissionsModel({ org, userId: MEMBER_USER_ID, currentTreasury }));

    hook.result.current.actions.handleDeactivate();

    expect(mocks.deactivate).not.toHaveBeenCalled();
  });
});
