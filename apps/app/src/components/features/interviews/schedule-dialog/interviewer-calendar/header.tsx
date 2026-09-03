import { Button } from '@comitium/ui/button';
import { Calendar } from '@comitium/ui/calendar';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { TimezonePicker } from '@comitium/ui/timezone-picker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { useIlamyCalendarContext } from '@ilamy/calendar';
import { CalendarXIcon, CaretDownIcon, PlusIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import type { OrgTeamMember } from '@/lib/schemas/org';

export interface AvailableMember {
  member: OrgTeamMember;
  hasCalendar: boolean;
}

interface HeaderControlsProps {
  availableMembers: AvailableMember[];
  onAdd: (userId: string) => void;
  timeZone: string;
  onTimeZoneChange: (tz: string) => void;
  canAddInterviewer?: boolean;
  lockInterviewers?: boolean;
}

function HeaderControls({
  availableMembers,
  onAdd,
  timeZone,
  onTimeZoneChange,
  canAddInterviewer = true,
  lockInterviewers = false,
}: HeaderControlsProps) {
  const addDisabled = !canAddInterviewer || availableMembers.length === 0;

  return (
    <>
      {!lockInterviewers && (
        <Select value="" onValueChange={onAdd} disabled={addDisabled}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <span className="flex items-center gap-1">
              <PlusIcon className="size-3.5" />
              <SelectValue placeholder="Interviewer" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {availableMembers.length === 0 ? (
              <div className="px-2 py-1.5 text-copy-14 text-muted-foreground">No available members</div>
            ) : (
              <SelectGroup>
                {availableMembers.map((entry) => (
                  <MemberOption key={entry.member.userId} {...entry} />
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      )}
      <TimezonePicker value={timeZone} onChange={onTimeZoneChange} className="h-8 w-[180px] text-xs" />
    </>
  );
}

export function CalendarHeader(controlsProps: HeaderControlsProps) {
  const { currentDate, today, selectDate, setCurrentDate } = useIlamyCalendarContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerDate = new Date(currentDate.year(), currentDate.month(), currentDate.date());

  const handleTimeZoneChange = useCallback(
    (nextTimeZone: string) => {
      setCurrentDate(currentDate.tz(nextTimeZone, true));
      controlsProps.onTimeZoneChange(nextTimeZone);
    },
    [controlsProps.onTimeZoneChange, currentDate, setCurrentDate],
  );

  const handlePickDate = useCallback(
    (date?: Date) => {
      if (!date) {
        return;
      }

      const nextDate = currentDate
        .set('year', date.getFullYear())
        .set('month', date.getMonth())
        .set('date', date.getDate());

      setPickerOpen(false);
      selectDate(nextDate);
    },
    [currentDate, selectDate],
  );

  const handleToday = useCallback(() => {
    setPickerOpen(false);
    today();
  }, [today]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 font-medium">
            <span>{currentDate.format('dddd, MMMM D, YYYY')}</span>
            <CaretDownIcon data-icon="inline-end" className="opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={pickerDate} onSelect={handlePickDate} />
          <div className="border-t p-2">
            <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={handleToday}>
              Jump to today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <div className="flex items-center gap-1.5">
        <HeaderControls {...controlsProps} onTimeZoneChange={handleTimeZoneChange} />
      </div>
    </div>
  );
}

export function CalendarHeaderEmpty(props: HeaderControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 px-3 py-2 border-b">
      <HeaderControls {...props} />
    </div>
  );
}

function MemberOption({ member, hasCalendar }: AvailableMember) {
  const item = (
    <SelectItem value={member.userId} disabled={!hasCalendar}>
      <span className="flex items-center gap-1.5">
        {getMemberDisplayName(member)}
        {!hasCalendar && <CalendarXIcon className="size-3 text-muted-foreground" />}
      </span>
    </SelectItem>
  );

  if (hasCalendar) {
    return item;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{item}</div>
      </TooltipTrigger>
      <TooltipContent>Ask {getMemberDisplayName(member)} to connect a calendar in Settings → Calendar.</TooltipContent>
    </Tooltip>
  );
}
