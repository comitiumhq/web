import { getMemberDisplayName } from '@comitium/ui/display-name';
import type { BusinessHours, IlamyCalendarProps, Resource } from '@ilamy/calendar';
import { addMinutes } from 'date-fns';

import type { SelectedInterviewer } from '../../types';
import { CALENDAR_END_HOUR, CALENDAR_SLOT_MINUTES, CALENDAR_START_HOUR, getCalendarDate } from '../calendar-range';
import type { AvailabilityIndex } from './availability';

export interface CalendarResourceData extends Record<string, unknown> {
  identity: SelectedInterviewer['member'];
  timeZone: string | null;
}

export type CalendarEventData = { type: 'busy'; titleHidden: boolean } | { type: 'draft' };

type CalendarEvent = NonNullable<IlamyCalendarProps['events']>[number];

export const BUSINESS_HOURS: BusinessHours = {
  daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  startTime: CALENDAR_START_HOUR,
  endTime: CALENDAR_END_HOUR,
};

export function createCalendarResources(interviewers: readonly SelectedInterviewer[]): Resource[] {
  return interviewers.map((interviewer) => {
    const data: CalendarResourceData = {
      identity: interviewer.member,
      timeZone: interviewer.member.timezone ?? null,
    };

    return {
      id: interviewer.userId,
      title: getMemberDisplayName(interviewer.member),
      backgroundColor: 'var(--background)',
      businessHours: BUSINESS_HOURS,
      data,
    };
  });
}

export function createCalendarEvents(params: {
  availability: AvailabilityIndex;
  interviewers: readonly SelectedInterviewer[];
  visibleDay: string;
  timeZone: string;
}): CalendarEvent[] {
  const events = createBusyEvents(params.availability);
  const draftStart = getCalendarDate(params.visibleDay, params.timeZone);
  draftStart.setHours(CALENDAR_START_HOUR, 0, 0, 0);

  for (const interviewer of params.interviewers) {
    events.push({
      id: `draft-${interviewer.userId}`,
      title: '',
      start: draftStart,
      end: addMinutes(draftStart, CALENDAR_SLOT_MINUTES),
      resourceId: interviewer.userId,
      data: { type: 'draft' } satisfies CalendarEventData,
    });
  }

  return events;
}

function createBusyEvents(availability: AvailabilityIndex): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const [interviewerId, interviewer] of availability) {
    for (const busyTime of interviewer.busy) {
      events.push({
        id: `busy-${interviewerId}-${busyTime.start.toISOString()}`,
        title: busyTime.title ?? '',
        start: busyTime.start,
        end: busyTime.end,
        resourceId: interviewerId,
        data: { type: 'busy', titleHidden: busyTime.title === null } satisfies CalendarEventData,
      });
    }
  }

  return events;
}
