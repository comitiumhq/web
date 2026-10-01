import { afterEach, describe, expect, it, vi } from 'vitest';

import { InterviewStatus } from '@/lib/schemas/interviews';
import type { ReviewStatus } from '@/lib/schemas/pipeline';

import { getActivityBadge, getReviewBadge, getStageAgeBadge } from './index';

function reviewStatus(overrides: Partial<ReviewStatus>): ReviewStatus {
  return {
    totalReviewers: 0,
    submittedReviewers: 0,
    currentUserHasPendingReview: false,
    currentUserHasSubmittedReview: false,
    needsDecision: false,
    ...overrides,
  };
}

describe('getReviewBadge', () => {
  it('keeps passive review waiting until someone submits feedback', () => {
    const badge = getReviewBadge(reviewStatus({ totalReviewers: 1 }));

    expect(badge).toMatchObject({
      label: 'Waiting on feedback',
      variant: 'destructive',
    });
  });

  it('keeps structured review waiting while the current reviewer still owes feedback', () => {
    const badge = getReviewBadge(
      reviewStatus({
        totalReviewers: 2,
        submittedReviewers: 1,
        currentUserHasPendingReview: true,
      }),
    );

    expect(badge).toMatchObject({
      label: 'Waiting on feedback',
      variant: 'destructive',
    });
  });

  it('does not show another reviewer progress as the current user progress', () => {
    const badge = getReviewBadge(
      reviewStatus({
        totalReviewers: 2,
        submittedReviewers: 1,
      }),
    );

    expect(badge).toMatchObject({
      label: 'Waiting on feedback',
      variant: 'destructive',
    });
  });

  it('shows review progress only after the current reviewer has submitted', () => {
    const badge = getReviewBadge(
      reviewStatus({
        totalReviewers: 2,
        submittedReviewers: 1,
        currentUserHasSubmittedReview: true,
      }),
    );

    expect(badge).toMatchObject({
      label: 'In review · 1/2',
      variant: 'warning',
    });
  });
});

describe('getActivityBadge', () => {
  it('shows the earliest unfinished interview step before pending feedback', () => {
    const badge = getActivityBadge({
      reviewStatus: reviewStatus({
        totalReviewers: 1,
        currentUserHasPendingReview: true,
      }),
      interviewStatus: InterviewStatus.NEEDS_SCHEDULING,
      interviewScheduledAt: null,
    });

    expect(badge).toMatchObject({
      label: 'Needs scheduling',
      variant: 'warning',
    });
  });

  it('shows pending feedback after the interview is complete', () => {
    const badge = getActivityBadge({
      reviewStatus: reviewStatus({
        totalReviewers: 1,
        currentUserHasPendingReview: true,
      }),
      interviewStatus: InterviewStatus.COMPLETED,
      interviewScheduledAt: '2026-10-01T09:00:00.000Z',
    });

    expect(badge).toMatchObject({
      label: 'Waiting on feedback',
      variant: 'destructive',
    });
  });
});

describe('getStageAgeBadge', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('warns after three days and becomes critical after seven days', () => {
    vi.setSystemTime(new Date('2026-10-08T12:00:00.000Z'));

    expect(getStageAgeBadge('2026-10-05T12:00:00.000Z')).toMatchObject({ variant: 'warning' });
    expect(getStageAgeBadge('2026-10-01T12:00:00.000Z')).toMatchObject({ variant: 'destructive' });
  });
});
