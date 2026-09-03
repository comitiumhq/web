import { isDefined } from '@comitium/schemas/guards';
import { Calendar } from '@comitium/ui/calendar';
import { CalendarXIcon, type Icon as PhosphorIcon } from '@phosphor-icons/react';
import { isSameMonth, startOfMonth, startOfToday } from 'date-fns';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ScheduleCalendarSkeleton } from './schedule-skeletons';
import type { SlotGroupData } from './types';
import { getCalendarDateKey } from './utils';

const CALENDAR_NAV_BUTTON_CLASS_NAME =
  'inline-flex size-8 items-center justify-center rounded-lg bg-transparent text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-30';
const CALENDAR_DAY_BUTTON_CLASS_NAME =
  'size-(--calendar-day-size) min-w-0 rounded-xl border border-transparent bg-transparent text-label-14 font-medium text-muted-foreground/45 disabled:opacity-100 enabled:border-input enabled:bg-card enabled:text-foreground enabled:hover:bg-muted/50 data-[selected-single=true]:border-primary/45 data-[selected-single=true]:bg-primary/10 data-[selected-single=true]:text-primary data-[selected-single=true]:hover:bg-primary/12';
const CALENDAR_CLASS_NAME =
  'mx-auto w-fit max-w-full bg-transparent p-0 [--calendar-day-size:--spacing(10)] [--cell-radius:var(--radius-xl)] [--cell-size:var(--calendar-day-size)] sm:[--calendar-day-size:--spacing(12)] lg:[--calendar-day-size:--spacing(14)] xl:[--calendar-day-size:--spacing(16)]';

interface ScheduleDatePickerProps {
  groups: SlotGroupData[];
  selectedDayKey: string | null;
  isLoading: boolean;
  onSelectDay: (dayKey: string) => void;
}

function ScheduleDatePicker({ groups, selectedDayKey, isLoading, onSelectDay }: ScheduleDatePickerProps) {
  const availableDayKeys = useMemo(() => new Set(groups.map((group) => group.key)), [groups]);
  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedDayKey) ?? null,
    [groups, selectedDayKey],
  );
  const fallbackMonth = useMemo(() => getFallbackMonth(groups, selectedGroup), [groups, selectedGroup]);
  const [displayMonth, setDisplayMonth] = useState(fallbackMonth);
  const isDayUnavailable = useCallback(
    (date: Date) => !availableDayKeys.has(getCalendarDateKey(date)),
    [availableDayKeys],
  );

  const handleSelectDate = useCallback(
    (date?: Date) => {
      if (!isDefined(date)) {
        return;
      }

      const dayKey = getCalendarDateKey(date);

      if (!availableDayKeys.has(dayKey)) {
        return;
      }

      onSelectDay(dayKey);
    },
    [availableDayKeys, onSelectDay],
  );

  useEffect(() => {
    setDisplayMonth(fallbackMonth);
  }, [fallbackMonth]);

  if (isLoading) {
    return <ScheduleCalendarSkeleton />;
  }

  if (groups.length === 0) {
    return (
      <ScheduleDatePickerMessage
        icon={CalendarXIcon}
        title="No dates available"
        description="There are no open dates in this booking window."
      />
    );
  }

  const firstAvailableMonth = startOfMonth(groups[0].date);
  const lastAvailableMonth = startOfMonth(groups[groups.length - 1].date);
  const hasMultipleAvailableMonths = !isSameMonth(firstAvailableMonth, lastAvailableMonth);
  const calendarNavClassName = getCalendarNavClassName(hasMultipleAvailableMonths);

  return (
    <Calendar
      mode="single"
      month={displayMonth}
      onMonthChange={setDisplayMonth}
      startMonth={firstAvailableMonth}
      endMonth={lastAvailableMonth}
      selected={selectedGroup ? selectedGroup.date : undefined}
      onSelect={handleSelectDate}
      disabled={isDayUnavailable}
      showOutsideDays={false}
      className={CALENDAR_CLASS_NAME}
      classNames={{
        root: 'w-fit max-w-full',
        months: 'w-fit max-w-full',
        month: 'w-fit max-w-full gap-5',
        nav: calendarNavClassName,
        button_previous: CALENDAR_NAV_BUTTON_CLASS_NAME,
        button_next: CALENDAR_NAV_BUTTON_CLASS_NAME,
        month_caption: 'flex h-8 w-full items-center justify-start px-0',
        caption_label: 'text-heading-14',
        month_grid: 'w-fit max-w-full',
        weekdays: 'grid grid-cols-[repeat(7,var(--calendar-day-size))] gap-1.5',
        weekday: 'flex h-8 items-center justify-center text-label-12 text-muted-foreground',
        week: 'mt-1.5 grid grid-cols-[repeat(7,var(--calendar-day-size))] gap-1.5',
        day: 'size-(--calendar-day-size) p-0',
        day_button: CALENDAR_DAY_BUTTON_CLASS_NAME,
      }}
    />
  );
}

function getFallbackMonth(groups: SlotGroupData[], selectedGroup: SlotGroupData | null): Date {
  const visibleDate = selectedGroup?.date ?? groups[0]?.date ?? startOfToday();

  return startOfMonth(visibleDate);
}

function getCalendarNavClassName(hasMultipleAvailableMonths: boolean): string {
  if (!hasMultipleAvailableMonths) {
    return 'hidden';
  }

  return 'absolute top-0 right-0 left-auto flex h-8 items-center gap-1';
}

function ScheduleDatePickerMessage({
  icon: Icon,
  title,
  description,
}: {
  icon: PhosphorIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-xl bg-muted/30 p-5 text-center ring-1 ring-foreground/10">
      <div>
        <Icon className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-3 text-heading-14">{title}</p>
        <p className="mt-1 text-copy-13 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export const MemoizedScheduleDatePicker = memo(ScheduleDatePicker);
