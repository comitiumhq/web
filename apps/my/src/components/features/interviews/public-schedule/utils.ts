import { formatInTimezone, getCurrentDate } from '@comitium/ui/date';
import { addDays, compareAsc, format, parseISO } from 'date-fns';
import type { AvailablePublicScheduleState, PublicScheduleSlot } from '@/lib/schemas/public-schedule';

import type { SlotGroupData } from './types';

export const EMPTY_PUBLIC_SCHEDULE_SLOTS: PublicScheduleSlot[] = [];

export function buildSlotWindow(defaults: AvailablePublicScheduleState['defaults']) {
  const from = getCurrentDate();
  const to = addDays(from, defaults.rollingDays);

  return { from: from.toISOString(), to: to.toISOString() };
}

export function groupSlotsByDay(slots: PublicScheduleSlot[], timeZone: string): SlotGroupData[] {
  const groups = new Map<string, SlotGroupData>();

  for (const slot of slots) {
    const key = formatInTimezone(slot.start, timeZone, 'yyyy-MM-dd');
    const existing = groups.get(key);

    if (existing) {
      existing.slots.push(slot);
      continue;
    }

    groups.set(key, {
      key,
      label: formatInTimezone(slot.start, timeZone, 'EEE, MMM d'),
      date: getCalendarDateFromKey(key),
      slots: [slot],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      slots: group.slots.toSorted((left, right) => compareAsc(parseISO(left.start), parseISO(right.start))),
    }))
    .toSorted((left, right) => compareAsc(left.date, right.date));
}

export function formatScheduleSlotRange(slot: PublicScheduleSlot, timeZone: string): string {
  const startLabel = formatInTimezone(slot.start, timeZone, 'EEE, MMM d · h:mm a');
  const endLabel = formatInTimezone(slot.end, timeZone, 'h:mm a');

  return `${startLabel} - ${endLabel}`;
}

export function getCalendarDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function getCalendarDateFromKey(key: string): Date {
  return parseISO(`${key}T12:00:00`);
}

export function getPublicScheduleErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
