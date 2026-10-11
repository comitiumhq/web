import type { OrgRole, OrgTeamMember } from '@/lib/schemas/org';

interface MemberPermissionsStateInput {
  member: OrgTeamMember;
  callerId: string | null;
  callerRole: OrgRole | null;
  canManageAccess: boolean;
  canManageRole: boolean;
  activeOrgAdminCount: number;
  isMemberMutationPending: boolean;
}

export interface MemberPermissionsState {
  canDeactivate: boolean;
  canManageAccess: boolean;
  canManageRole: boolean;
  editsDisabled: boolean;
  isLastActiveAdmin: boolean;
  isMemberOrgAdmin: boolean;
  isSelf: boolean;
}

export function getMemberPermissionsState(input: MemberPermissionsStateInput): MemberPermissionsState {
  const isSelf = input.callerId === input.member.userId;
  const isCallerOrgAdmin = input.callerRole === 'org_admin';
  const isMemberOrgAdmin = input.member.role === 'org_admin';
  const isLastActiveAdmin = isMemberOrgAdmin && input.member.isActive && input.activeOrgAdminCount <= 1;
  const editsDisabled = input.isMemberMutationPending || !input.member.isActive;
  const canDeactivate = input.canManageRole && !isSelf && !isLastActiveAdmin && (!isMemberOrgAdmin || isCallerOrgAdmin);

  return {
    canDeactivate,
    canManageAccess: input.canManageAccess,
    canManageRole: input.canManageRole,
    editsDisabled,
    isLastActiveAdmin,
    isMemberOrgAdmin,
    isSelf,
  };
}
