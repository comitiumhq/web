import { describe, expect, it } from 'vitest';

import type { InterviewProgressInterviewer } from '@/lib/schemas/interviews';
import { InterviewStatus } from '@/lib/schemas/interviews';

import { canJoinInterview, getInterviewerFeedbackLabel, getInterviewerRsvpLabel } from './interview-progress-event-row';

const USER_ID = '00000000-0000-4000-8000-000000000001';

function interviewer(overrides: Partial<InterviewProgressInterviewer> = {}): InterviewProgressInterviewer {
  return {
    userId: USER_ID,
    role: 'interviewer',
    isRequired: true,
    rsvpStatus: null,
    feedbackStatus: 'not_due',
    feedbackSubmittedAt: null,
    ...overrides,
  };
}

describe('interview progress event state', () => {
  it('keeps per-interviewer feedback state available for details', () => {
    expect(getInterviewerFeedbackLabel(interviewer())).toBe('Feedback not due');
    expect(getInterviewerFeedbackLabel(interviewer({ feedbackStatus: 'submitted' }))).toBe('Feedback submitted');
    expect(getInterviewerFeedbackLabel(interviewer({ feedbackStatus: 'pending' }))).toBe('Feedback pending');
  });

  it('uses plain-language invitation response labels', () => {
    expect(getInterviewerRsvpLabel(interviewer({ rsvpStatus: 'declined' }))).toBe('Invitation declined');
    expect(getInterviewerRsvpLabel(interviewer())).toBe('Invitation response not recorded');
  });

  it('keeps the join link available while the interview is in progress', () => {
    expect(canJoinInterview(InterviewStatus.SCHEDULED)).toBe(true);
    expect(canJoinInterview(InterviewStatus.IN_PROGRESS)).toBe(true);
    expect(canJoinInterview(InterviewStatus.COMPLETED)).toBe(false);
  });
});
