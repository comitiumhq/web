import { describe, expect, it } from 'vitest';

import { InterviewStatus, type MyInterview } from '@/lib/schemas/interviews';

import { getHomeInterviews, isInterviewFeedbackDue } from './home-data';

function interview(overrides: Partial<MyInterview> & Pick<MyInterview, 'eventId' | 'status'>): MyInterview {
  return {
    applicationId: '00000000-0000-4000-8000-000000000001',
    scheduleId: '00000000-0000-4000-8000-000000000002',
    title: 'Technical Interview',
    scheduledAt: '2026-08-04T10:00:00.000Z',
    durationMinutes: 45,
    location: null,
    meetingUrl: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    jobTitle: 'Backend Engineer',
    ...overrides,
  };
}

describe('org home interview tasks', () => {
  it('treats only completed tasks returned by the home endpoint as feedback due', () => {
    const feedbackDue = interview({
      eventId: '00000000-0000-4000-8000-000000000003',
      status: InterviewStatus.COMPLETED,
    });
    const upcoming = interview({
      eventId: '00000000-0000-4000-8000-000000000004',
      status: InterviewStatus.SCHEDULED,
    });

    expect(isInterviewFeedbackDue(feedbackDue)).toBe(true);
    expect(isInterviewFeedbackDue(upcoming)).toBe(false);
  });

  it('shows pending completed feedback before upcoming interviews and hides terminal non-feedback events', () => {
    const feedbackDue = interview({
      eventId: '00000000-0000-4000-8000-000000000003',
      status: InterviewStatus.COMPLETED,
      scheduledAt: '2026-08-01T10:00:00.000Z',
    });
    const upcoming = interview({
      eventId: '00000000-0000-4000-8000-000000000004',
      status: InterviewStatus.SCHEDULED,
    });
    const cancelled = interview({
      eventId: '00000000-0000-4000-8000-000000000005',
      status: InterviewStatus.CANCELLED,
    });
    const noShow = interview({
      eventId: '00000000-0000-4000-8000-000000000006',
      status: InterviewStatus.NO_SHOW,
    });

    expect(getHomeInterviews([upcoming, cancelled, noShow, feedbackDue], 8).map((item) => item.eventId)).toEqual([
      feedbackDue.eventId,
      upcoming.eventId,
    ]);
  });
});
