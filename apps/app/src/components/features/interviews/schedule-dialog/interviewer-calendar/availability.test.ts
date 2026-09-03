import { describe, expect, it } from 'vitest';
import type { InterviewerBusy } from '@/lib/schemas/interviews';

import {
  areInterviewersWorkingDuring,
  createAvailabilityIndex,
  getConflictingInterviewerIds,
  isInterviewerWorkingDuring,
} from './availability';

const FIRST_INTERVIEWER_ID = '00000000-0000-4000-8000-000000000001';
const SECOND_INTERVIEWER_ID = '00000000-0000-4000-8000-000000000002';
const AVAILABLE_INTERVIEWER: InterviewerBusy = {
  userId: FIRST_INTERVIEWER_ID,
  status: 'available',
  scheduleTimeZone: 'UTC',
  workingRanges: [{ start: '2026-09-01T09:00:00.000Z', end: '2026-09-01T17:00:00.000Z' }],
  busyTimes: [{ start: '2026-09-01T12:00:00.000Z', end: '2026-09-01T13:00:00.000Z', title: 'Planning' }],
};

describe('availability index', () => {
  it('requires the complete slot to fit inside working hours', () => {
    const availability = createAvailabilityIndex([AVAILABLE_INTERVIEWER]);

    expect(isInterviewerWorkingDuring(availability, FIRST_INTERVIEWER_ID, at('10:00'), 60)).toBe(true);
    expect(isInterviewerWorkingDuring(availability, FIRST_INTERVIEWER_ID, at('17:00'), 30)).toBe(false);
  });

  it('requires working-hours coverage from every interviewer', () => {
    const unavailableInterviewer: InterviewerBusy = {
      userId: SECOND_INTERVIEWER_ID,
      status: 'unavailable',
      reason: 'provider_unavailable',
    };
    const availability = createAvailabilityIndex([AVAILABLE_INTERVIEWER, unavailableInterviewer]);

    expect(areInterviewersWorkingDuring(availability, [FIRST_INTERVIEWER_ID], at('10:00'), 60)).toBe(true);
    expect(
      areInterviewersWorkingDuring(availability, [FIRST_INTERVIEWER_ID, SECOND_INTERVIEWER_ID], at('10:00'), 60),
    ).toBe(false);
    expect(areInterviewersWorkingDuring(availability, [], at('10:00'), 60)).toBe(false);
  });

  it('returns interviewers with busy or working-hours conflicts', () => {
    const freeInterviewer: InterviewerBusy = {
      ...AVAILABLE_INTERVIEWER,
      userId: SECOND_INTERVIEWER_ID,
      busyTimes: [],
    };
    const availability = createAvailabilityIndex([AVAILABLE_INTERVIEWER, freeInterviewer]);

    expect(
      getConflictingInterviewerIds(availability, [FIRST_INTERVIEWER_ID, SECOND_INTERVIEWER_ID], at('12:30'), 30),
    ).toEqual(new Set([FIRST_INTERVIEWER_ID]));
    expect(
      getConflictingInterviewerIds(availability, [FIRST_INTERVIEWER_ID, SECOND_INTERVIEWER_ID], at('17:00'), 30),
    ).toEqual(new Set([FIRST_INTERVIEWER_ID, SECOND_INTERVIEWER_ID]));
  });
});

function at(time: string): Date {
  return new Date(`2026-09-01T${time}:00.000Z`);
}
