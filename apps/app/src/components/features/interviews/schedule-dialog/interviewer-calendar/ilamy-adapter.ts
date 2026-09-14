import { getMemberDisplayName } from '@comitium/ui/display-name';
import type { BusinessHours, Resource } from '@ilamy/calendar';

import type { SelectedInterviewer } from '../../types';
import { CALENDAR_END_HOUR, CALENDAR_START_HOUR } from '../calendar-range';
import type { AvailabilityIndex } from './availability';

export interface CalendarResourceData extends Record<string, unknown> {
  identity: SelectedInterviewer['member'];
  timeZone: string | null;
}

export interface CalendarEventData {
  type: 'busy';
  titleHidden: boolean;
}

export interface CalendarProviderEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  data: CalendarEventData;
}

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

export function createCalendarEvents(availability: AvailabilityIndex): CalendarProviderEvent[] {
  const events: CalendarProviderEvent[] = [];

  for (const [interviewerId, interviewer] of availability) {
    for (const [busyTimeIndex, busyTime] of interviewer.busy.entries()) {
      events.push({
        id: `busy-${interviewerId}-${busyTime.start.toISOString()}-${busyTimeIndex}`,
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
