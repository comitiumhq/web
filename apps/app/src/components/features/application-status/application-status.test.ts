import { describe, expect, it } from 'vitest';

import type { ReviewStatus } from '@/lib/schemas/pipeline';

import { getReviewBadge } from './index';

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
