import { getMemberDisplayName } from '@comitium/ui/display-name';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQueryOrgTeam, useQueryTeamCalendarStatus } from '@/hooks/queries/use-query-org-team';
import type { DefaultInterviewer } from '@/lib/schemas/stage-activities';

import type { SelectedInterviewer } from '../types';

interface UsePrefilledInterviewersParams {
  open: boolean;
  orgId: string;
  prefillDefaults: DefaultInterviewer[] | null | undefined;
  setInterviewers: (updater: (current: SelectedInterviewer[]) => SelectedInterviewer[]) => void;
}

export function usePrefilledInterviewers({
  open,
  orgId,
  prefillDefaults,
  setInterviewers,
}: UsePrefilledInterviewersParams) {
  const [hasInitialized, setHasInitialized] = useState(false);
  const { data: orgMembers } = useQueryOrgTeam(orgId);
  const { data: calendarStatus } = useQueryTeamCalendarStatus(orgId);

  useEffect(() => {
    if (!open) {
      setHasInitialized(false);

      return;
    }

    if (hasInitialized || !prefillDefaults || prefillDefaults.length === 0) {
      return;
    }

    if (!orgMembers || !calendarStatus) {
      return;
    }

    const calendarMap = new Map(calendarStatus.map((status) => [status.userId, status.hasCalendar]));
    const valid: SelectedInterviewer[] = [];
    const skipped: string[] = [];

    for (const def of prefillDefaults) {
      const member = orgMembers.find((candidate) => candidate.userId === def.userId);

      if (!member) {
        skipped.push('Former member (no longer in org)');
        continue;
      }

      if (!member.isActive) {
        skipped.push(`${getMemberDisplayName(member)} (deactivated)`);
        continue;
      }

      if (!(calendarMap.get(member.userId) ?? false)) {
        skipped.push(`${getMemberDisplayName(member)} (no calendar)`);
        continue;
      }

      valid.push({ userId: member.userId, member, role: def.role });
    }

    setInterviewers((current) => (current.length > 0 ? current : valid));

    if (skipped.length > 0) {
      toast.warning(
        `Skipped ${skipped.length} default interviewer${skipped.length > 1 ? 's' : ''}: ${skipped.join(', ')}`,
      );
    }

    setHasInitialized(true);
  }, [open, hasInitialized, prefillDefaults, orgMembers, calendarStatus, setInterviewers]);
}
