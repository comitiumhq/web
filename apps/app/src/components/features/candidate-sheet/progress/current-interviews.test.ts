import { describe, expect, it } from 'vitest';

import type { InterviewEvent, InterviewSchedule } from '@/lib/schemas/interviews';

import { getCurrentInterviewCards } from './current-interviews';

const SCHEDULE_ID = '00000000-0000-4000-8000-000000000001';

function event(status: InterviewEvent['status'], scheduledAt: string | null): InterviewEvent {
  return {
    id: crypto.randomUUID(),
    title: 'Technical interview',
    interviewId: '00000000-0000-4000-8000-000000000002',
    eventOrder: 0,
    scheduledAt,
    durationMinutes: 45,
    meetingUrl: null,
    location: null,
    status,
    confirmedAt: null,
    completedAt: null,
    noShowAt: null,
    interviewers: [],
  };
}

function schedule(events: InterviewEvent[]): InterviewSchedule {
  return {
    id: SCHEDULE_ID,
    stageId: '00000000-0000-4000-8000-000000000003',
    status: 'needs_scheduling',
    availabilityRequestedAt: null,
    createdAt: '2026-07-21T10:00:00.000Z',
    events,
  };
}

describe('getCurrentInterviewCards', () => {
  it('keeps a scheduled interview visible as a current operational activity', () => {
    const scheduled = event('scheduled', '2026-07-24T10:00:00.000Z');

    expect(getCurrentInterviewCards([schedule([scheduled])])).toEqual([
      {
        scheduleId: SCHEDULE_ID,
        scheduleCreatedAt: '2026-07-21T10:00:00.000Z',
        availabilityRequestedAt: null,
        event: scheduled,
      },
    ]);
  });

  it('keeps a dated manual interview visible while confirmation is pending', () => {
    const confirming = event('needs_scheduling', '2026-07-24T10:00:00.000Z');

    expect(getCurrentInterviewCards([schedule([confirming])])).toEqual([
      {
        scheduleId: SCHEDULE_ID,
        scheduleCreatedAt: '2026-07-21T10:00:00.000Z',
        availabilityRequestedAt: null,
        event: confirming,
      },
    ]);
  });

  it('does not render an unscheduled placeholder as an interview card', () => {
    expect(getCurrentInterviewCards([schedule([event('needs_scheduling', null)])])).toEqual([]);
  });
});
