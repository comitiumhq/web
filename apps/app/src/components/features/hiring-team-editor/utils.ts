import type { HiringTeamRole } from '@comitium/schemas/jobs';
import type { HiringTeamEditorMember } from './types';

export const HIRING_TEAM_ROLE_OPTIONS: { value: HiringTeamRole; label: string }[] = [
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'hiring_member', label: 'Hiring Member' },
];

const HIRING_TEAM_ROLE_LABELS: Record<string, string> = {
  hiring_manager: 'Hiring Manager',
  hiring_member: 'Hiring Member',
};

export function getHiringTeamRoleLabel(role: string | null): string {
  if (!role) {
    return 'Hiring Member';
  }

  return HIRING_TEAM_ROLE_LABELS[role] ?? role;
}

export function getHiringTeamMemberSecondaryLine(member: HiringTeamEditorMember): string | null {
  if (member.name) {
    return member.email;
  }

  return null;
}
