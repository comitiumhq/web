import { describe, expect, it } from 'vitest';

import type { InterviewSchedule } from '@/lib/schemas/interviews';

import { computePendingInterviewEvents } from './feedback';

const REQUIRED_USER_ID = '00000000-0000-4000-8000-000000000005';
const OPTIONAL_USER_ID = '00000000-0000-4000-8000-000000000006';

function completedSchedule(): InterviewSchedule {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    stageId: '00000000-0000-4000-8000-000000000002',
    status: 'completed',
    availabilityRequestedAt: null,
    createdAt: '2026-07-21T10:00:00.000Z',
    events: [
      {
        id: '00000000-0000-4000-8000-000000000003',
        title: 'Technical interview',
        interviewId: '00000000-0000-4000-8000-000000000004',
        eventOrder: 0,
        scheduledAt: '2026-07-21T11:00:00.000Z',
        durationMinutes: 45,
        meetingUrl: null,
        location: null,
        status: 'completed',
        confirmedAt: '2026-07-21T10:30:00.000Z',
        completedAt: '2026-07-21T11:45:00.000Z',
        noShowAt: null,
        interviewers: [
          { userId: REQUIRED_USER_ID, role: 'lead', isRequired: true },
          { userId: OPTIONAL_USER_ID, role: 'shadow', isRequired: false },
        ],
      },
    ],
  };
}

describe('computePendingInterviewEvents', () => {
  it('creates feedback work only for required interviewers', () => {
    const schedules = [completedSchedule()];

    expect(computePendingInterviewEvents(schedules, [], REQUIRED_USER_ID)).toHaveLength(1);
    expect(computePendingInterviewEvents(schedules, [], OPTIONAL_USER_ID)).toEqual([]);
  });
});
