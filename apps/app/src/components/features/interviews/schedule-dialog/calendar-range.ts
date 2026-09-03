import { formatInTimezone } from '@comitium/ui/date';
import { TZDate } from '@date-fns/tz';
import { addMinutes, endOfDay, parseISO, startOfDay } from 'date-fns';

export const CALENDAR_START_HOUR = 8;
export const CALENDAR_END_HOUR = 20;
export const CALENDAR_SLOT_MINUTES = 15;
export const CALENDAR_START_MINUTES = CALENDAR_START_HOUR * 60;
export const CALENDAR_END_MINUTES = CALENDAR_END_HOUR * 60;

interface CalendarRange {
  start: string;
  end: string;
}

export function getCalendarDay(date: Date, timeZone: string): string {
  return formatInTimezone(date, timeZone, 'yyyy-MM-dd');
}

export function getInitialCalendarDay(value: string | null | undefined, timeZone: string): string {
  return getCalendarDay(value ? parseISO(value) : new Date(), timeZone);
}

export function getCalendarDate(day: string, timeZone: string): TZDate {
  const [year, month, date] = day.split('-').map(Number);

  return TZDate.tz(timeZone, year, month - 1, date);
}

export function getAvailabilityRange(day: string, timeZone: string): CalendarRange {
  const date = getCalendarDate(day, timeZone);

  return {
    start: new Date(startOfDay(date).getTime()).toISOString(),
    end: new Date(endOfDay(date).getTime()).toISOString(),
  };
}

interface CalendarSlotVisibilityParams {
  value: string;
  availabilityRange: CalendarRange;
  timeZone: string;
  durationMinutes: number;
}

export function isCalendarSlotVisible({
  value,
  availabilityRange,
  timeZone,
  durationMinutes,
}: CalendarSlotVisibilityParams): boolean {
  const start = parseISO(value);
  const end = addMinutes(start, durationMinutes);
  const rangeStart = parseISO(availabilityRange.start);
  const rangeEnd = parseISO(availabilityRange.end);

  if (start < rangeStart || end > rangeEnd) {
    return false;
  }

  const zonedStart = TZDate.tz(timeZone, start);
  const zonedEnd = TZDate.tz(timeZone, end);
  const startMinutes = zonedStart.getHours() * 60 + zonedStart.getMinutes();
  const endMinutes = zonedEnd.getHours() * 60 + zonedEnd.getMinutes();

  return startMinutes >= CALENDAR_START_MINUTES && endMinutes <= CALENDAR_END_MINUTES;
}
