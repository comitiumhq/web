import { Button } from '@comitium/ui/button';
import { Calendar } from '@comitium/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { TimezonePicker } from '@comitium/ui/timezone-picker';
import { useIlamyCalendarContext } from '@ilamy/calendar';
import { CaretDownIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import type { OrgTeamMember } from '@/lib/schemas/org';

import { InterviewerMultiCombobox } from '../../interviewer-multi-combobox';
import type { SelectedInterviewer } from '../../types';

interface HeaderControlsProps {
  members: readonly OrgTeamMember[];
  calendarStatusMap: ReadonlyMap<string, boolean>;
  interviewers: readonly SelectedInterviewer[];
  onInterviewersChange?: (interviewers: SelectedInterviewer[]) => void;
  timeZone: string;
  onTimeZoneChange: (tz: string) => void;
  canAddInterviewer?: boolean;
}

function HeaderControls({
  members,
  calendarStatusMap,
  interviewers,
  onInterviewersChange,
  timeZone,
  onTimeZoneChange,
  canAddInterviewer = true,
}: HeaderControlsProps) {
  return (
    <>
      {onInterviewersChange && (
        <InterviewerMultiCombobox
          members={members}
          calendarStatusMap={calendarStatusMap}
          interviewers={interviewers}
          onChange={onInterviewersChange}
          maxVisibleValues={1}
          className="w-[260px]"
          disabled={!canAddInterviewer}
        />
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
