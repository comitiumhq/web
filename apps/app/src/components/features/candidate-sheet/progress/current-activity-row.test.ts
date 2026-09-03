import type { CandidateSheetCurrentActivity } from '@comitium/schemas/applications';
import { describe, expect, it } from 'vitest';

import { canActOnCurrentActivity, getInterviewFeedbackSecondary } from './current-activity-row';

const ACTIVITY_ID = '00000000-0000-4000-8000-000000000001';

function reviewActivity(canAct: boolean): CandidateSheetCurrentActivity {
  return {
    kind: 'application_review',
    activityId: ACTIVITY_ID,
    canAct,
    feedback: {
      requiredCount: 2,
      completedCount: 0,
      currentUserRequired: canAct,
      currentUserSubmitted: false,
    },
  };
}

describe('canActOnCurrentActivity', () => {
  it('uses exact server-projected row authorization', () => {
    expect(canActOnCurrentActivity(reviewActivity(true))).toBe(true);
    expect(canActOnCurrentActivity(reviewActivity(false))).toBe(false);
    expect(canActOnCurrentActivity(null)).toBe(false);
  });
});

describe('getInterviewFeedbackSecondary', () => {
  it('explains a blocked dependency instead of leaving an inert row', () => {
    expect(
      getInterviewFeedbackSecondary({
        id: '00000000-0000-4000-8000-000000000002',
        title: 'Technical interview',
        scheduledAt: null,
        canAct: false,
        completedCount: 1,
        requiredCount: 2,
        currentUserRequired: false,
        currentUserSubmitted: false,
      }),
    ).toBe('1 of 2 feedback submitted · Waiting on assigned interviewers');
  });

  it('states when the current user has already submitted', () => {
    expect(
      getInterviewFeedbackSecondary({
        id: '00000000-0000-4000-8000-000000000002',
        title: 'Technical interview',
        scheduledAt: null,
        canAct: false,
        completedCount: 1,
        requiredCount: 2,
        currentUserRequired: true,
        currentUserSubmitted: true,
      }),
    ).toBe('1 of 2 feedback submitted · Your feedback is submitted');
  });
});
