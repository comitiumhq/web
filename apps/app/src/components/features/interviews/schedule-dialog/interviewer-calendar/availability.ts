import { addMinutes, parseISO } from 'date-fns';
import type { InterviewerBusy } from '@/lib/schemas/interviews';

interface TimeRange {
  readonly start: Date;
  readonly end: Date;
}

interface BusyRange extends TimeRange {
  readonly title: string | null;
}

export interface InterviewerAvailability {
  readonly working: readonly TimeRange[];
  readonly busy: readonly BusyRange[];
}

export type AvailabilityIndex = ReadonlyMap<string, InterviewerAvailability>;

function toTimeRange(range: { start: string; end: string }): TimeRange {
  return {
    start: parseISO(range.start),
    end: parseISO(range.end),
  };
}

function toBusyRange(range: { start: string; end: string; title?: string | null }): BusyRange {
  return {
    ...toTimeRange(range),
    title: range.title ?? null,
  };
}

export function createAvailabilityIndex(interviewers?: readonly InterviewerBusy[]): AvailabilityIndex {
  const entries: [string, InterviewerAvailability][] = [];

  for (const interviewer of interviewers ?? []) {
    if (interviewer.status === 'unavailable') {
      continue;
    }

    entries.push([
      interviewer.userId,
      {
        working: interviewer.workingRanges.map(toTimeRange),
        busy: interviewer.busyTimes.map(toBusyRange),
      },
    ]);
  }

  return new Map(entries);
}

export function isInterviewerWorkingDuring(
  availability: AvailabilityIndex,
  interviewerId: string,
  start: Date,
  durationMinutes: number,
): boolean {
  return isWorking(availability.get(interviewerId), getSlotRange(start, durationMinutes));
}

export function areInterviewersWorkingDuring(
  availability: AvailabilityIndex,
  interviewerIds: readonly string[],
  start: Date,
  durationMinutes: number,
): boolean {
  const slot = getSlotRange(start, durationMinutes);

  return interviewerIds.length > 0 && interviewerIds.every((id) => isWorking(availability.get(id), slot));
}

export function getConflictingInterviewerIds(
  availability: AvailabilityIndex,
  interviewerIds: readonly string[],
  start: Date,
  durationMinutes: number,
): ReadonlySet<string> {
  const slot = getSlotRange(start, durationMinutes);

  return new Set(interviewerIds.filter((id) => hasConflict(availability.get(id), slot)));
}

function getSlotRange(start: Date, durationMinutes: number): TimeRange {
  return {
    start,
    end: addMinutes(start, durationMinutes),
  };
}

function hasConflict(interviewer: InterviewerAvailability | undefined, slot: TimeRange): boolean {
  const isBusy = interviewer?.busy.some((range) => overlaps(range, slot)) ?? false;

  return !isWorking(interviewer, slot) || isBusy;
}

function isWorking(interviewer: InterviewerAvailability | undefined, slot: TimeRange): boolean {
  return interviewer?.working.some((range) => contains(range, slot)) ?? false;
}

function contains(container: TimeRange, range: TimeRange): boolean {
  return container.start.getTime() <= range.start.getTime() && container.end.getTime() >= range.end.getTime();
}

function overlaps(first: TimeRange, second: TimeRange): boolean {
  return first.start.getTime() < second.end.getTime() && first.end.getTime() > second.start.getTime();
}
