import type { HiringTeamEntry, HiringTeamRole } from '@comitium/schemas/jobs';
import { useCallback, useMemo } from 'react';
import { HiringTeamEditor, type HiringTeamEditorMember } from '@/components/features/hiring-team-editor';
import { useQueryOrgTeam } from '@/hooks/queries/use-query-org-team';
import type { OrgTeamMember } from '@/lib/schemas/org';

interface HiringTeamTabProps {
  orgId: string;
  hiringTeam: HiringTeamEntry[];
  onChangeHiringTeam: (team: HiringTeamEntry[]) => void;
}

export function HiringTeamTab({ orgId, hiringTeam, onChangeHiringTeam }: HiringTeamTabProps) {
  const { data: orgMembers, isLoading, isError } = useQueryOrgTeam(orgId);

  const availableMembers = useMemo(
    () =>
      (orgMembers ?? []).filter((member) => {
        if (!member.isActive) {
          return false;
        }

        return !hiringTeam.some((hiringMember) => hiringMember.userId === member.userId);
      }),
    [orgMembers, hiringTeam],
  );

  const members = useMemo<HiringTeamEditorMember[]>(
    () =>
      hiringTeam.map((entry) => {
        const match = (orgMembers ?? []).find((member) => member.userId === entry.userId);

        return {
          userId: entry.userId,
          name: match?.name ?? entry.name ?? null,
          email: match?.email ?? entry.email ?? null,
          role: entry.role,
        };
      }),
    [hiringTeam, orgMembers],
  );

  const handleAddMember = useCallback(
    (member: OrgTeamMember, role: HiringTeamRole) => {
      onChangeHiringTeam([...hiringTeam, { userId: member.userId, role, email: member.email, name: member.name }]);
    },
    [hiringTeam, onChangeHiringTeam],
  );

  const handleChangeRole = useCallback(
    (userId: string, role: HiringTeamRole) => {
      onChangeHiringTeam(hiringTeam.map((entry) => (entry.userId === userId ? { ...entry, role } : entry)));
    },
    [hiringTeam, onChangeHiringTeam],
  );

  const handleRemoveMember = useCallback(
    (userId: string) => {
      onChangeHiringTeam(hiringTeam.filter((entry) => entry.userId !== userId));
    },
    [hiringTeam, onChangeHiringTeam],
  );

  return (
    <HiringTeamEditor
      members={members}
      availableMembers={availableMembers}
      isLoading={isLoading}
      isError={isError}
      onAddMember={handleAddMember}
      onChangeRole={handleChangeRole}
      onRemoveMember={handleRemoveMember}
    />
  );
}
