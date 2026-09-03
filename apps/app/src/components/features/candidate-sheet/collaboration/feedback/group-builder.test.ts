import { describe, expect, it } from 'vitest';

import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';

import { buildGroups } from './group-builder';

const NOW = '2026-01-01T00:00:00.000Z';
const UUID_A = '00000000-0000-4000-8000-000000000001';
const UUID_B = '00000000-0000-4000-8000-000000000002';
const UUID_C = '00000000-0000-4000-8000-000000000003';
const ME_USER_ID = '00000000-0000-4000-8000-000000000004';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000005';

function activity(overrides: Partial<ApplicationReviewActivity> = {}): ApplicationReviewActivity {
  return {
    id: UUID_A,
    stageId: UUID_B,
    activityType: 'application_review',
    activityOrder: 1,
    reviewers: [],
    feedbackFormId: null,
    feedbackFormTitle: 'Scorecard',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function submission(overrides: Partial<FeedbackSubmission> = {}): FeedbackSubmission {
  return {
    id: UUID_C,
    activityId: UUID_A,
    interviewEventId: null,
    submittedByUserId: OTHER_USER_ID,
    ...overrides,
  } as FeedbackSubmission;
}

describe('buildGroups', () => {
  it('shows passive add-mine only when hiring-team relationship and feedback access both exist', () => {
    const [group] = buildGroups([activity()], [], [], ME_USER_ID, {
      canModerateFeedback: false,
      canSubmitFeedback: true,
      isOnHiringTeam: true,
    });

    expect(group?.items).toEqual([{ kind: 'add-mine' }]);
  });

  it('does not show passive add-mine for access-only users outside the hiring team', () => {
    const groups = buildGroups([activity()], [], [], ME_USER_ID, {
      canModerateFeedback: false,
      canSubmitFeedback: true,
      isOnHiringTeam: false,
    });

    expect(groups).toHaveLength(0);
  });

  it('keeps assigned reviewers pending when they lack feedback access', () => {
    const [group] = buildGroups(
      [
        activity({
          reviewers: [{ userId: ME_USER_ID, name: null, email: null, isActive: true }],
        }),
      ],
      [],
      [],
      ME_USER_ID,
      {
        canModerateFeedback: false,
        canSubmitFeedback: false,
        isOnHiringTeam: true,
      },
    );

    expect(group?.items).toEqual([{ kind: 'pending-reviewer', userId: ME_USER_ID, canSubmit: false }]);
  });

  it('lets feedback moderators add their feedback without a reviewer slot', () => {
    const [group] = buildGroups(
      [
        activity({
          reviewers: [{ userId: OTHER_USER_ID, name: null, email: null, isActive: true }],
        }),
      ],
      [],
      [submission()],
      ME_USER_ID,
      {
        canModerateFeedback: true,
        canSubmitFeedback: false,
        isOnHiringTeam: false,
      },
    );

    expect(group?.items).toEqual([{ kind: 'submitted', submission: submission() }, { kind: 'add-mine' }]);
  });
});
