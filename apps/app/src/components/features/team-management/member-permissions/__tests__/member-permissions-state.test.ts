import { describe, expect, it } from 'vitest';

import type { OrgTeamMember } from '@/lib/schemas/org';

import { getMemberPermissionsState } from '../member-permissions-state';

const MEMBER_ADDRESS = '0x1111111111111111111111111111111111111111';
const MEMBER_USER_ID = '11111111-1111-4111-8111-111111111111';
const CALLER_USER_ID = '22222222-2222-4222-8222-222222222222';

function makeMember(overrides: Partial<OrgTeamMember> = {}): OrgTeamMember {
  return {
    userId: MEMBER_USER_ID,
    walletAddress: MEMBER_ADDRESS,
    email: 'member@example.com',
    name: 'Member',
    jobTitle: null,
    avatarUrl: null,
    role: 'org_member',
    timezone: null,
    isActive: true,
    hasVaultAccess: true,
    hasScopedAccess: false,
    accessSummary: {
      departmentGrants: [],
      directJobAssignments: [],
    },
    invitedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getMemberPermissionsState', () => {
  it('locks self-management even when caller has write permissions', () => {
    const state = getMemberPermissionsState({
      member: makeMember(),
      callerId: MEMBER_USER_ID,
      callerRole: 'org_admin',
      canManageAccess: true,
      canManageRole: true,
      activeOrgAdminCount: 2,
      isMemberMutationPending: false,
    });

    expect(state.isSelf).toBe(true);
    expect(state.canDeactivate).toBe(false);
    expect(state.canManageRole).toBe(true);
  });

  it('marks the last active organization admin as protected', () => {
    const state = getMemberPermissionsState({
      member: makeMember({ role: 'org_admin' }),
      callerId: CALLER_USER_ID,
      callerRole: 'org_admin',
      canManageAccess: true,
      canManageRole: true,
      activeOrgAdminCount: 1,
      isMemberMutationPending: false,
    });

    expect(state.isLastActiveAdmin).toBe(true);
    expect(state.canDeactivate).toBe(false);
  });

  it('disables edits for inactive members', () => {
    const state = getMemberPermissionsState({
      member: makeMember({ isActive: false }),
      callerId: CALLER_USER_ID,
      callerRole: 'org_admin',
      canManageAccess: true,
      canManageRole: true,
      activeOrgAdminCount: 2,
      isMemberMutationPending: false,
    });

    expect(state.editsDisabled).toBe(true);
  });

  it('allows an organization admin to deactivate another organization admin', () => {
    const state = getMemberPermissionsState({
      member: makeMember({ role: 'org_admin' }),
      callerId: CALLER_USER_ID,
      callerRole: 'org_admin',
      canManageAccess: true,
      canManageRole: true,
      activeOrgAdminCount: 2,
      isMemberMutationPending: false,
    });

    expect(state.canDeactivate).toBe(true);
  });
});
