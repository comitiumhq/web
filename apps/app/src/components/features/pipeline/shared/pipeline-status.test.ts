import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReviewStatus } from '@/lib/schemas/pipeline';

import { getCardUrgencyState, type KanbanCardStatusInput } from './pipeline-status';

function reviewStatus(overrides: Partial<ReviewStatus> = {}): ReviewStatus {
  return {
    totalReviewers: 0,
    submittedReviewers: 0,
    currentUserHasPendingReview: false,
    currentUserHasSubmittedReview: false,
    needsDecision: false,
    ...overrides,
  };
}

function cardStatus(overrides: Partial<KanbanCardStatusInput> = {}): KanbanCardStatusInput {
  return {
    reviewStatus: reviewStatus(),
    interviewStatus: null,
    interviewScheduledAt: null,
    stageSince: null,
    ...overrides,
  };
}

describe('pipeline urgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the current-user feedback reason ahead of broader card urgency', () => {
    const urgency = getCardUrgencyState(
      cardStatus({
        reviewStatus: reviewStatus({ currentUserHasPendingReview: true, totalReviewers: 1 }),
        stageSince: '2026-08-01T12:00:00.000Z',
      }),
    );

    expect(urgency).toEqual({
      level: 'critical',
      reason: "You haven't submitted feedback yet",
    });
  });

  it('explains critical stage age when no more specific urgency exists', () => {
    expect(getCardUrgencyState(cardStatus({ stageSince: '2026-08-01T12:00:00.000Z' }))).toEqual({
      level: 'critical',
      reason: 'In this stage since Aug 1, 2026',
    });
  });
});
