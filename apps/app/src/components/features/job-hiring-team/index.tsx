import type { HiringTeamRole } from '@comitium/schemas/jobs';
import { useCallback, useMemo } from 'react';
import { HiringTeamEditor, type HiringTeamEditorMember } from '@/components/features/hiring-team-editor';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrgTeam } from '@/hooks/queries/use-query-org-team';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { isJobConfigurationReadOnly } from '@/lib/jobs/status';
import type { OrgTeamMember } from '@/lib/schemas/org';
import { Permission } from '@/lib/schemas/org';
import { isDefined } from '@/lib/utils';

import {
  useAddHiringTeamMember,
  useHiringTeam,
  useRemoveHiringTeamMember,
  useUpdateHiringTeamMemberRole,
} from './use-hiring-team';

interface JobHiringTeamProps {
  org: MyOrg;
  jobId: string;
}

export function JobHiringTeam({ org, jobId }: JobHiringTeamProps) {
  const { canOnJob } = useJobPermissions(jobId);
  const canManageTeam = canOnJob(Permission.HIRING_TEAM_WRITE);

  const { data: job, isLoading: isJobLoading, isError: isJobError } = useQueryJobSummary(jobId);
  const { data: hiringTeam, isLoading, isError } = useHiringTeam(jobId);
  const { data: orgMembers } = useQueryOrgTeam(org.id);
  const { mutate: addMember, isPending: isAdding } = useAddHiringTeamMember();
  const { mutate: updateMemberRole, isPending: isUpdating } = useUpdateHiringTeamMemberRole();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveHiringTeamMember();
  const readOnly =
    !canManageTeam || isJobLoading || isJobError || !isDefined(job) || isJobConfigurationReadOnly(job.status);

  const availableMembers = useMemo(
    () =>
      (orgMembers ?? []).filter((member) => {
        if (!member.isActive) {
          return false;
        }

        return !(hiringTeam ?? []).some((hiringMember) => hiringMember.userId === member.userId);
      }),
    [orgMembers, hiringTeam],
  );

  const members = useMemo<HiringTeamEditorMember[]>(
    () =>
      (hiringTeam ?? []).map((member) => ({
        userId: member.userId,
        email: member.email,
        name: member.name,
        role: member.role,
      })),
    [hiringTeam],
  );

  const handleAddMember = useCallback(
    (member: OrgTeamMember, role: HiringTeamRole) => {
      addMember({ jobId, userId: member.userId, role });
    },
    [addMember, jobId],
  );

  const handleRemoveMember = useCallback(
    (userId: string) => {
      removeMember({ jobId, userId });
    },
    [jobId, removeMember],
  );

  const handleChangeRole = useCallback(
    (userId: string, role: HiringTeamRole) => {
      updateMemberRole({ jobId, userId, role });
    },
    [jobId, updateMemberRole],
  );

  return (
    <HiringTeamEditor
      members={members}
      availableMembers={availableMembers}
      isLoading={isLoading}
      isError={isError}
      readOnly={readOnly}
      onAddMember={handleAddMember}
      onChangeRole={handleChangeRole}
      onRemoveMember={handleRemoveMember}
      isAdding={isAdding}
      isUpdating={isUpdating}
      isRemoving={isRemoving}
    />
  );
}
