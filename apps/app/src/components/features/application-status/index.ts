import type { StatusBadgeProps } from '@comitium/ui/status-badge';
import { InterviewStatus, type InterviewStatusValue } from '@/lib/schemas/interviews';
import type { ReviewStatus } from '@/lib/schemas/pipeline';
import {
  formatCompactDate,
  formatDate,
  formatElapsedDaysSince,
  getElapsedDaysSince,
  isPastDate,
  isWithinDays,
} from '@/lib/utils';

const STAGE_AGE_WARNING_DAYS = 7;
const STAGE_AGE_CRITICAL_DAYS = 14;
const RESPONSE_DUE_SOON_DAYS = 1;

type InterviewBadge = { variant: StatusBadgeProps['variant']; label: string; tooltip: string };

const INTERVIEW_BADGES: Record<InterviewStatusValue, InterviewBadge> = {
  [InterviewStatus.NEEDS_SCHEDULING]: {
    variant: 'warning',
    label: 'Needs scheduling',
    tooltip: 'Interview still needs to be scheduled',
  },
  [InterviewStatus.LINK_SENT]: {
    variant: 'warning',
    label: 'Booking link sent',
    tooltip: 'Booking link sent. Waiting for the candidate to pick a time',
  },
  [InterviewStatus.SCHEDULED]: { variant: 'success', label: 'Scheduled', tooltip: 'Interview scheduled' },
  [InterviewStatus.IN_PROGRESS]: { variant: 'success', label: 'Scheduled', tooltip: 'Interview scheduled' },
  [InterviewStatus.COMPLETED]: {
    variant: 'destructive',
    label: 'Needs decision',
    tooltip: 'Interview complete. Choose the next step',
  },
  [InterviewStatus.CANCELLED]: {
    variant: 'warning',
    label: 'Needs scheduling',
    tooltip: 'Interview was cancelled. Schedule a new time',
  },
  [InterviewStatus.NO_SHOW]: {
    variant: 'warning',
    label: 'Needs scheduling',
    tooltip: 'Candidate did not attend. Schedule a new time',
  },
};

export function getReviewBadge(review: ReviewStatus): StatusBadgeProps | null {
  if (review.needsDecision) {
    return {
      variant: 'destructive',
      label: 'Needs decision',
      tooltip: 'Feedback is complete. Choose the next step',
    };
  }

  if (review.currentUserHasPendingReview) {
    return {
      variant: 'destructive',
      label: 'Waiting on feedback',
      tooltip: "You haven't submitted feedback yet",
    };
  }

  if (review.currentUserHasSubmittedReview && review.submittedReviewers < review.totalReviewers) {
    return {
      variant: 'warning',
      label: `In review · ${review.submittedReviewers}/${review.totalReviewers}`,
      tooltip: getWaitingTooltip(review),
    };
  }

  if (review.submittedReviewers < review.totalReviewers) {
    return {
      variant: 'destructive',
      label: 'Waiting on feedback',
      tooltip: getWaitingTooltip(review),
    };
  }

  return null;
}

function getWaitingTooltip(review: ReviewStatus): string {
  return `${review.submittedReviewers} of ${review.totalReviewers} required reviews submitted`;
}

function getInterviewBadge(status: InterviewStatusValue | null, scheduledAt: string | null): StatusBadgeProps | null {
  if (!status) {
    return null;
  }

  const badge = INTERVIEW_BADGES[status];

  if ((status === InterviewStatus.SCHEDULED || status === InterviewStatus.IN_PROGRESS) && scheduledAt) {
    const date = formatCompactDate(scheduledAt);

    return { variant: badge.variant, label: `Scheduled · ${date}`, tooltip: `Interview scheduled for ${date}` };
  }

  return { ...badge };
}

export interface ApplicationActivityStatusInput {
  reviewStatus: ReviewStatus;
  interviewStatus: InterviewStatusValue | null;
  interviewScheduledAt: string | null;
}

export function getActivityBadge(input: ApplicationActivityStatusInput): StatusBadgeProps | null {
  return getReviewBadge(input.reviewStatus) ?? getInterviewBadge(input.interviewStatus, input.interviewScheduledAt);
}

export type ResponseUrgency = 'overdue' | 'due_soon' | 'upcoming';
export type ApplicationReviewRowUrgency = 'overdue' | 'due_soon' | 'none';

export function getResponseUrgency(responseDeadline: string | null): ResponseUrgency | null {
  if (responseDeadline === null) {
    return null;
  }

  if (isPastDate(responseDeadline)) {
    return 'overdue';
  }

  if (isWithinDays(responseDeadline, RESPONSE_DUE_SOON_DAYS)) {
    return 'due_soon';
  }

  return 'upcoming';
}

const RESPONSE_URGENCY_VARIANT: Record<ResponseUrgency, NonNullable<StatusBadgeProps['variant']>> = {
  overdue: 'destructive',
  due_soon: 'warning',
  upcoming: 'secondary',
};

export function getResponseUrgencyVariant(urgency: ResponseUrgency): NonNullable<StatusBadgeProps['variant']> {
  return RESPONSE_URGENCY_VARIANT[urgency];
}

export function getApplicationReviewRowUrgency(
  isResponded: boolean,
  responseDeadline: string | null,
): ApplicationReviewRowUrgency {
  if (isResponded) {
    return 'none';
  }

  const urgency = getResponseUrgency(responseDeadline);

  if (urgency === 'overdue' || urgency === 'due_soon') {
    return urgency;
  }

  return 'none';
}

export function getResponseDeadlineBadge(
  isResponded: boolean,
  responseDeadline: string | null,
): StatusBadgeProps | null {
  if (isResponded) {
    return null;
  }

  const urgency = getResponseUrgency(responseDeadline);

  if (urgency === null) {
    return null;
  }

  const date = formatCompactDate(responseDeadline);
  const variant = getResponseUrgencyVariant(urgency);

  if (urgency === 'overdue') {
    return { variant, label: 'Overdue', tooltip: `Make a decision by ${date}` };
  }

  if (urgency === 'due_soon') {
    return { variant, label: 'Due soon', tooltip: `Make a decision by ${date}` };
  }

  return { variant, label: `Due ${date}`, tooltip: `Make a decision by ${date}` };
}

interface StageAge {
  label: string;
  variant: StatusBadgeProps['variant'];
}

function getStageAge(stageSince: string | null): StageAge | null {
  const elapsedDaysLabel = formatElapsedDaysSince(stageSince);
  const ageDays = getElapsedDaysSince(stageSince);

  if (!elapsedDaysLabel || ageDays === null) {
    return null;
  }

  return { label: `In stage · ${elapsedDaysLabel}`, variant: getStageAgeVariant(ageDays) };
}

function getStageAgeVariant(ageDays: number): StatusBadgeProps['variant'] {
  if (ageDays >= STAGE_AGE_CRITICAL_DAYS) {
    return 'destructive';
  }

  if (ageDays >= STAGE_AGE_WARNING_DAYS) {
    return 'warning';
  }

  return 'secondary';
}

export function getStageAgeBadge(stageSince: string | null): StatusBadgeProps | null {
  const age = getStageAge(stageSince);

  if (!age || !stageSince) {
    return null;
  }

  return {
    variant: age.variant,
    label: age.label,
    tooltip: `In this stage since ${formatDate(stageSince, 'MMM d, yyyy')}`,
  };
}

export function getStageSince(currentStageEnteredAt: string | null, appliedAt: string | null): string | null {
  return currentStageEnteredAt ?? appliedAt;
}
