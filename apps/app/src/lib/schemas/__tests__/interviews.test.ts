import { describe, expect, it } from 'vitest';

import {
  interviewBriefingResponseSchema,
  interviewProgressResponseSchema,
  interviewStatusEnum,
  interviewsListSchema,
} from '../interviews';

const SCHEDULE_ID = '00000000-0000-4000-8000-000000000001';
const EVENT_ID = '00000000-0000-4000-8000-000000000002';
const VISIT_ID = '00000000-0000-4000-8000-000000000003';
const STAGE_ID = '00000000-0000-4000-8000-000000000004';
const USER_ID = '00000000-0000-4000-8000-000000000005';

describe('candidate sheet interview contracts', () => {
  it('does not expose booking reservations as interview statuses', () => {
    expect(interviewStatusEnum.safeParse('confirming').success).toBe(false);
  });

  it('accepts a historical event whose interview template was deleted', () => {
    const result = interviewsListSchema.parse({
      data: [
        {
          id: SCHEDULE_ID,
          stageId: STAGE_ID,
          status: 'completed',
          availabilityRequestedAt: null,
          createdAt: '2026-07-01T09:00:00.000Z',
          events: [
            {
              id: EVENT_ID,
              title: '(deleted interview type)',
              interviewId: null,
              eventOrder: 0,
              scheduledAt: '2026-07-02T09:00:00.000Z',
              durationMinutes: 45,
              meetingUrl: null,
              location: null,
              status: 'completed',
              confirmedAt: null,
              completedAt: '2026-07-02T09:45:00.000Z',
              noShowAt: null,
              interviewers: [{ userId: USER_ID, role: 'lead', isRequired: true }],
            },
          ],
        },
      ],
      total: 1,
      pagination: { nextCursor: null, hasMore: false },
    });

    expect(result.data[0]?.events[0]).toMatchObject({ interviewId: null, title: '(deleted interview type)' });
    expect(result.data[0]?.events[0]?.interviewers[0]?.role).toBe('lead');
  });

  it('accepts the normalized nonnegative interview progress duration', () => {
    const result = interviewProgressResponseSchema.parse({
      data: [
        {
          id: VISIT_ID,
          stageId: STAGE_ID,
          stageName: 'Technical Interview',
          stageType: 'active',
          stageGroupId: null,
          stageGroupName: null,
          enteredAt: '2026-07-03T09:00:00.000Z',
          leftAt: '2026-07-02T09:00:00.000Z',
          durationSeconds: 0,
          isCurrent: false,
          interviews: [],
        },
      ],
    });

    expect(result.data[0]?.durationSeconds).toBe(0);
  });

  it('accepts an interview briefing without an application submission', () => {
    const result = interviewBriefingResponseSchema.parse({
      data: {
        applicationId: '00000000-0000-4000-8000-000000000006',
        candidateProfileInput: null,
        jobTitle: 'Protocol Engineer',
        interview: {
          eventId: EVENT_ID,
          title: 'Technical Interview',
          instructions: null,
          status: 'scheduled',
          scheduledAt: '2026-07-02T09:00:00.000Z',
          durationMinutes: 45,
          location: null,
          meetingUrl: null,
        },
        interviewers: [{ userId: USER_ID, name: 'Ari Singh', role: 'lead' }],
        applicationSubmission: null,
        hasResume: false,
        resumeFileId: null,
      },
    });

    expect(result.data.applicationSubmission).toBeNull();
  });
});
