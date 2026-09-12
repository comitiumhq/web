import { Combobox, type ComboboxOption } from '@comitium/ui/combobox';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { CalendarXIcon } from '@phosphor-icons/react';
import { useCallback, useMemo } from 'react';
import { MemberAvatar } from '@/components/user/member-avatar';
import type { OrgTeamMember } from '@/lib/schemas/org';

import type { SelectedInterviewer } from './types';

interface InterviewerMultiComboboxProps {
  members: readonly OrgTeamMember[];
  calendarStatusMap: ReadonlyMap<string, boolean>;
  interviewers: readonly SelectedInterviewer[];
  onChange: (interviewers: SelectedInterviewer[]) => void;
  disabled?: boolean;
  className?: string;
  maxVisibleValues?: number;
}

export function InterviewerMultiCombobox({
  members,
  calendarStatusMap,
  interviewers,
  onChange,
  disabled,
  className,
  maxVisibleValues,
}: InterviewerMultiComboboxProps) {
  const activeMembers = useMemo(() => members.filter((member) => member.isActive), [members]);

  const selectedUserIds = useMemo(() => interviewers.map((interviewer) => interviewer.userId), [interviewers]);

  const options = useMemo(
    () => createInterviewerOptions(activeMembers, calendarStatusMap, interviewers),
    [activeMembers, calendarStatusMap, interviewers],
  );

  const handleValueChange = useCallback(
    (nextUserIds: string[]) => {
      onChange(reconcileInterviewers(interviewers, nextUserIds, activeMembers, calendarStatusMap));
    },
    [activeMembers, calendarStatusMap, interviewers, onChange],
  );

  return (
    <Combobox
      selectionMode="multiple"
      size="sm"
      ariaLabel="Interviewers"
      options={options}
      value={selectedUserIds}
      onValueChange={handleValueChange}
      placeholder="Add interviewers"
      searchPlaceholder="Search interviewers…"
      emptyMessage="No members found."
      maxVisibleValues={maxVisibleValues}
      className={className}
      disabled={disabled}
    />
  );
}

function createInterviewerOptions(
  activeMembers: readonly OrgTeamMember[],
  calendarStatusMap: ReadonlyMap<string, boolean>,
  selectedInterviewers: readonly SelectedInterviewer[],
): ComboboxOption[] {
  const options = activeMembers.map((member) => {
    const hasCalendar = calendarStatusMap.get(member.userId) ?? false;

    return {
      value: member.userId,
      label: getMemberDisplayName(member),
      leading: <MemberAvatar identity={member} size="sm" />,
      description: hasCalendar ? undefined : 'Calendar not connected',
      trailing: hasCalendar ? undefined : <CalendarXIcon className="size-4" />,
      disabled: !hasCalendar,
    };
  });

  const activeUserIds = new Set(activeMembers.map((member) => member.userId));

  const unavailableSelectedOptions = selectedInterviewers
    .filter((interviewer) => !activeUserIds.has(interviewer.userId))
    .map((interviewer) => ({
      value: interviewer.userId,
      label: getMemberDisplayName(interviewer.member),
      leading: <MemberAvatar identity={interviewer.member} size="sm" />,
      description: 'No longer an active team member',
    }));

  return [...options, ...unavailableSelectedOptions];
}

function reconcileInterviewers(
  currentInterviewers: readonly SelectedInterviewer[],
  nextUserIds: readonly string[],
  activeMembers: readonly OrgTeamMember[],
  calendarStatusMap: ReadonlyMap<string, boolean>,
): SelectedInterviewer[] {
  const currentByUserId = new Map(currentInterviewers.map((interviewer) => [interviewer.userId, interviewer]));

  const activeByUserId = new Map(activeMembers.map((member) => [member.userId, member]));

  return nextUserIds.flatMap((userId) => {
    const currentInterviewer = currentByUserId.get(userId);

    if (currentInterviewer) {
      return [currentInterviewer];
    }

    const member = activeByUserId.get(userId);
    const hasCalendar = calendarStatusMap.get(userId) ?? false;

    if (!member || !hasCalendar) {
      return [];
    }

    return [{ userId, member, role: 'interviewer' }];
  });
}
