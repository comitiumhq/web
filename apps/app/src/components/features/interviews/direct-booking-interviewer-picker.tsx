import { Button } from '@comitium/ui/button';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { FormLabel } from '@comitium/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { CalendarXIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { memo, useCallback, useMemo } from 'react';
import type { OrgTeamMember } from '@/lib/schemas/org';
import { cn } from '@/lib/utils';

import type { SelectedInterviewer } from './types';

interface DirectBookingInterviewerPickerProps {
  members: OrgTeamMember[];
  calendarStatusMap: ReadonlyMap<string, boolean>;
  interviewers: SelectedInterviewer[];
  disabled: boolean;
  onAdd: (member: OrgTeamMember) => void;
  onRemove: (userId: string) => void;
}

export function DirectBookingInterviewerPicker({
  members,
  calendarStatusMap,
  interviewers,
  disabled,
  onAdd,
  onRemove,
}: DirectBookingInterviewerPickerProps) {
  const availableMembers = useMemo(() => {
    const selected = new Set(interviewers.map((interviewer) => interviewer.userId));

    return members
      .filter((member) => member.isActive && !selected.has(member.userId))
      .map((member) => ({
        member,
        hasCalendar: calendarStatusMap.get(member.userId) ?? false,
      }));
  }, [calendarStatusMap, interviewers, members]);

  const handleAdd = useCallback(
    (userId: string) => {
      const entry = availableMembers.find((available) => available.member.userId === userId);

      if (!entry?.hasCalendar) {
        return;
      }

      onAdd(entry.member);
    },
    [availableMembers, onAdd],
  );

  const renderAvailableMember = useCallback(
    (entry: { member: OrgTeamMember; hasCalendar: boolean }) => (
      <MemberOption key={entry.member.userId} member={entry.member} hasCalendar={entry.hasCalendar} />
    ),
    [],
  );

  const renderSelectedInterviewer = useCallback(
    (interviewer: SelectedInterviewer) => (
      <SelectedInterviewerChip key={interviewer.userId} interviewer={interviewer} onRemove={onRemove} />
    ),
    [onRemove],
  );

  return (
    <div className="space-y-2">
      <FormLabel>Interviewers</FormLabel>
      <Select value="" onValueChange={handleAdd} disabled={disabled}>
        <SelectTrigger>
          <span className="flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" />
            <SelectValue placeholder="Add interviewer" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {availableMembers.length === 0 ? (
            <div className="px-2 py-1.5 text-copy-14 text-muted-foreground">No available members</div>
          ) : (
            availableMembers.map(renderAvailableMember)
          )}
        </SelectContent>
      </Select>

      {interviewers.length === 0 ? (
        <p className="text-copy-14 text-muted-foreground">Select at least one interviewer with a connected calendar.</p>
      ) : (
        <div className="flex flex-wrap gap-2">{interviewers.map(renderSelectedInterviewer)}</div>
      )}
    </div>
  );
}

interface MemberOptionProps {
  member: OrgTeamMember;
  hasCalendar: boolean;
}

function MemberOption({ member, hasCalendar }: MemberOptionProps) {
  const content = (
    <SelectItem value={member.userId} disabled={!hasCalendar}>
      <span className="flex items-center gap-1.5">
        {getMemberDisplayName(member)}
        {!hasCalendar && <CalendarXIcon className="h-3 w-3 text-muted-foreground" />}
      </span>
    </SelectItem>
  );

  if (hasCalendar) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{content}</div>
      </TooltipTrigger>
      <TooltipContent>Ask {getMemberDisplayName(member)} to connect a calendar in Settings → Calendar.</TooltipContent>
    </Tooltip>
  );
}

interface SelectedInterviewerChipProps {
  interviewer: SelectedInterviewer;
  onRemove: (userId: string) => void;
}

const SelectedInterviewerChip = memo(function SelectedInterviewerChip({
  interviewer,
  onRemove,
}: SelectedInterviewerChipProps) {
  const handleRemove = useCallback(() => {
    onRemove(interviewer.userId);
  }, [interviewer.userId, onRemove]);

  return (
    <div
      className={cn(
        'inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border bg-muted px-2 text-label-12',
        'text-foreground',
      )}
    >
      <span className="truncate">{getMemberDisplayName(interviewer.member)}</span>
      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={handleRemove}>
        <XIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
});
