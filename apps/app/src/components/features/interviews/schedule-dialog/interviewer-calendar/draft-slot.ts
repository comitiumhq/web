import { TZDate } from '@date-fns/tz';
import { parseISO } from 'date-fns';
import { CALENDAR_END_MINUTES, CALENDAR_SLOT_MINUTES, CALENDAR_START_MINUTES, getCalendarDay } from '../calendar-range';

const CALENDAR_DURATION_MINUTES = CALENDAR_END_MINUTES - CALENDAR_START_MINUTES;

interface DraftSlot {
  readonly value: string;
  readonly start: Date;
  readonly minutes: number;
}

export function getZonedMinutes(value: string, timeZone: string): number {
  const date = TZDate.tz(timeZone, parseISO(value));

  return date.getHours() * 60 + date.getMinutes();
}

export function getDraftTopPercent(minutes: number): number {
  return ((minutes - CALENDAR_START_MINUTES) / CALENDAR_DURATION_MINUTES) * 100;
}

export function getDraftHeightPercent(durationMinutes: number): number {
  return (durationMinutes / CALENDAR_DURATION_MINUTES) * 100;
}

export function isFutureSlot(value: Date, now = new Date()): boolean {
  return value.getTime() > now.getTime();
}

export function getMinimumDraftMinutes(
  value: string,
  timeZone: string,
  durationMinutes: number,
  now = new Date(),
): number | null {
  const selectedDate = parseISO(value);
  const selectedDay = getCalendarDay(selectedDate, timeZone);
  const currentDay = getCalendarDay(now, timeZone);

  if (selectedDay < currentDay) {
    return null;
  }

  if (selectedDay > currentDay) {
    return CALENDAR_START_MINUTES;
  }

  const currentMinutes = getZonedMinutes(now.toISOString(), timeZone);
  const nextSlot = (Math.floor(currentMinutes / CALENDAR_SLOT_MINUTES) + 1) * CALENDAR_SLOT_MINUTES;
  const minimumMinutes = Math.max(CALENDAR_START_MINUTES, nextSlot);

  return minimumMinutes <= getLastDraftStart(durationMinutes) ? minimumMinutes : null;
}

function clampDraftMinutes(minutes: number, durationMinutes: number, minimumMinutes: number): number {
  return Math.min(Math.max(minutes, minimumMinutes), getLastDraftStart(durationMinutes));
}

export function getDraftMinutesFromPointer(
  originMinutes: number,
  pointerDeltaPixels: number,
  gridHeight: number,
  durationMinutes: number,
  minimumMinutes: number,
): number {
  if (gridHeight <= 0) {
    return originMinutes;
  }

  const deltaMinutes = (pointerDeltaPixels / gridHeight) * CALENDAR_DURATION_MINUTES;

  return clampDraftMinutes(originMinutes + deltaMinutes, durationMinutes, minimumMinutes);
}

export function getDroppedDraftSlot(
  value: string,
  timeZone: string,
  minutes: number,
  durationMinutes: number,
  now = new Date(),
): DraftSlot | null {
  const minimumMinutes = getMinimumDraftMinutes(value, timeZone, durationMinutes, now);

  if (minimumMinutes === null) {
    return null;
  }

  const snappedMinutes = Math.round(minutes / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_MINUTES;
  const nextMinutes = clampDraftMinutes(snappedMinutes, durationMinutes, minimumMinutes);
  const nextValue = createZonedSlot(value, timeZone, nextMinutes);
  const start = parseISO(nextValue);

  return isFutureSlot(start, now) ? { value: nextValue, start, minutes: nextMinutes } : null;
}

function getLastDraftStart(durationMinutes: number): number {
  return CALENDAR_END_MINUTES - durationMinutes;
}

function createZonedSlot(value: string, timeZone: string, minutes: number): string {
  const current = TZDate.tz(timeZone, parseISO(value));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  const zonedSlot = TZDate.tz(timeZone, current.getFullYear(), current.getMonth(), current.getDate(), hours, remainder);

  return new Date(zonedSlot.getTime()).toISOString();
}
