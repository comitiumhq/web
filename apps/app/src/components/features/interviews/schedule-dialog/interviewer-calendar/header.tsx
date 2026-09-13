import { Button } from '@comitium/ui/button';
import { Calendar } from '@comitium/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { TimezonePicker } from '@comitium/ui/timezone-picker';
import { useIlamyCalendarContext } from '@ilamy/calendar';
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { type ReactNode, useCallback, useState } from 'react';
import type { OrgTeamMember } from '@/lib/schemas/org';

import { InterviewerAutocomplete } from '../../interviewer-autocomplete';
import type { SelectedInterviewer } from '../../types';

interface CalendarHeaderProps {
  interviewTypeControl?: ReactNode;
  members: readonly OrgTeamMember[];
  calendarStatusMap: ReadonlyMap<string, boolean>;
  interviewers: readonly SelectedInterviewer[];
  onInterviewersChange?: (interviewers: SelectedInterviewer[]) => void;
  timeZone: string;
  onTimeZoneChange: (tz: string) => void;
  canAddInterviewer?: boolean;
  interviewerPickerOpen?: boolean;
  onInterviewerPickerOpenChange?: (open: boolean) => void;
}

type CalendarSettingsProps = Pick<CalendarHeaderProps, 'interviewTypeControl' | 'timeZone' | 'onTimeZoneChange'>;

function CalendarSettings({ interviewTypeControl, timeZone, onTimeZoneChange }: CalendarSettingsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {interviewTypeControl}

      <TimezonePicker value={timeZone} onChange={onTimeZoneChange} className="calendar-timezone-picker h-8 text-xs" />
    </div>
  );
}

type InterviewerPickerProps = Pick<
  CalendarHeaderProps,
  | 'members'
  | 'calendarStatusMap'
  | 'interviewers'
  | 'onInterviewersChange'
  | 'canAddInterviewer'
  | 'interviewerPickerOpen'
  | 'onInterviewerPickerOpenChange'
>;

function InterviewerPicker({
  members,
  calendarStatusMap,
  interviewers,
  onInterviewersChange,
  canAddInterviewer = true,
  interviewerPickerOpen,
  onInterviewerPickerOpenChange,
}: InterviewerPickerProps) {
  if (!onInterviewersChange) {
    return null;
  }

  return (
    <InterviewerAutocomplete
      members={members}
      calendarStatusMap={calendarStatusMap}
      interviewers={interviewers}
      onChange={onInterviewersChange}
      className="calendar-interviewer-picker"
      disabled={!canAddInterviewer}
      open={interviewerPickerOpen}
      onOpenChange={onInterviewerPickerOpenChange}
    />
  );
}

function ScrollableControlBar({ children }: { children: ReactNode }) {
  return (
    <section className="calendar-controls-scroll w-full min-w-0 overflow-x-auto" aria-label="Scheduling controls">
      <div className="flex min-w-max items-center gap-2 px-3 pt-0.5 pb-2">{children}</div>
    </section>
  );
}

function DateNavigator() {
  const { currentDate, nextPeriod, prevPeriod, today, selectDate } = useIlamyCalendarContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const pickerDate = new Date(currentDate.year(), currentDate.month(), currentDate.date());

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
    <div className="flex h-8 min-w-0 shrink-0 items-center overflow-hidden rounded-4xl border border-control-border/55 bg-control">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-none border-r border-control-border/50"
        aria-label="Previous day"
        onClick={prevPeriod}
      >
        <CaretLeftIcon />
      </Button>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-w-0 max-w-52 rounded-none px-2.5 font-normal"
          >
            <span className="truncate">{currentDate.format('ddd, MMM D, YYYY')}</span>
            <CaretDownIcon data-icon="inline-end" className="shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={pickerDate} onSelect={handlePickDate} />
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 rounded-none border-x border-control-border/50 px-2.5 font-normal"
        onClick={handleToday}
      >
        Today
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-none"
        aria-label="Next day"
        onClick={nextPeriod}
      >
        <CaretRightIcon />
      </Button>
    </div>
  );
}

export function CalendarHeader(props: CalendarHeaderProps) {
  const { currentDate, setCurrentDate } = useIlamyCalendarContext();

  const handleTimeZoneChange = useCallback(
    (nextTimeZone: string) => {
      setCurrentDate(currentDate.tz(nextTimeZone, true));
      props.onTimeZoneChange(nextTimeZone);
    },
    [props.onTimeZoneChange, currentDate, setCurrentDate],
  );

  return (
    <ScrollableControlBar>
      <CalendarSettings
        interviewTypeControl={props.interviewTypeControl}
        timeZone={props.timeZone}
        onTimeZoneChange={handleTimeZoneChange}
      />

      <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
        <DateNavigator />
        <InterviewerPicker {...props} />
      </div>
    </ScrollableControlBar>
  );
}

export function CalendarHeaderEmpty(props: CalendarHeaderProps) {
  return (
    <ScrollableControlBar>
      <CalendarSettings
        interviewTypeControl={props.interviewTypeControl}
        timeZone={props.timeZone}
        onTimeZoneChange={props.onTimeZoneChange}
      />

      <div className="ml-auto flex shrink-0 items-center justify-end">
        <InterviewerPicker {...props} />
      </div>
    </ScrollableControlBar>
  );
}
