import type { StatusBadgeProps } from '@comitium/ui/status-badge';
import {
  type ApplicationActivityStatusInput,
  getActivityBadge,
  getApplicationReviewRowUrgency,
  getResponseDeadlineBadge,
  getStageSince,
} from '@/components/features/application-status';
import type { KanbanApplication } from '@/lib/schemas/pipeline';
import { formatDate, getElapsedDaysSince } from '@/lib/utils';

const STAGE_AGE_WARNING_DAYS = 7;
const STAGE_AGE_CRITICAL_DAYS = 14;

export interface KanbanCardStatusInput extends ApplicationActivityStatusInput {
  isResponded: boolean;
  responseDeadline: string | null;
  stageSince: string | null;
}

export type CardUrgency = 'critical' | 'attention' | 'none';

export interface CardUrgencyState {
  level: CardUrgency;
  reason: string | null;
}

export function getApplicationReviewUrgencyState(
  isResponded: boolean,
  responseDeadline: string | null,
): CardUrgencyState {
  const urgency = getApplicationReviewRowUrgency(isResponded, responseDeadline);
  const deadlineBadge = getResponseDeadlineBadge(isResponded, responseDeadline);

  if (urgency === 'overdue') {
    return { level: 'critical', reason: badgeReason(deadlineBadge) };
  }

  if (urgency === 'due_soon') {
    return { level: 'attention', reason: badgeReason(deadlineBadge) };
  }

  return { level: 'none', reason: null };
}

function getStageAgeUrgency(stageSince: string | null): CardUrgency {
  const ageDays = getElapsedDaysSince(stageSince);

  if (ageDays === null) {
    return 'none';
  }

  if (ageDays >= STAGE_AGE_CRITICAL_DAYS) {
    return 'critical';
  }

  if (ageDays >= STAGE_AGE_WARNING_DAYS) {
    return 'attention';
  }

  return 'none';
}

function getStageAgeReason(stageSince: string | null): string | null {
  if (!stageSince) {
    return null;
  }

  return `In this stage since ${formatDate(stageSince, 'MMM d, yyyy')}`;
}

function badgeReason(badge: StatusBadgeProps | null): string | null {
  if (!badge) {
    return null;
  }

  if (typeof badge.tooltip === 'string') {
    return badge.tooltip;
  }

  if (typeof badge.label === 'string') {
    return badge.label;
  }

  return null;
}

export function getCardUrgencyState(input: KanbanCardStatusInput): CardUrgencyState {
  const activity = getActivityBadge(input);
  const deadlineUrgency = getApplicationReviewUrgencyState(input.isResponded, input.responseDeadline);
  const stageUrgency = getStageAgeUrgency(input.stageSince);

  if (activity?.variant === 'destructive') {
    return { level: 'critical', reason: badgeReason(activity) };
  }

  if (deadlineUrgency.level === 'critical') {
    return deadlineUrgency;
  }

  if (stageUrgency === 'critical') {
    return { level: 'critical', reason: getStageAgeReason(input.stageSince) };
  }

  if (deadlineUrgency.level === 'attention') {
    return deadlineUrgency;
  }

  if (stageUrgency === 'attention') {
    return { level: 'attention', reason: getStageAgeReason(input.stageSince) };
  }

  return { level: 'none', reason: null };
}

export function toCardStatusInput(application: KanbanApplication): KanbanCardStatusInput {
  return {
    isResponded: application.isResponded,
    responseDeadline: application.responseDeadline,
    reviewStatus: application.reviewStatus,
    interviewStatus: application.interviewStatus,
    interviewScheduledAt: application.interviewScheduledAt,
    stageSince: getStageSince(application.currentStageEnteredAt, application.appliedAt),
  };
}
