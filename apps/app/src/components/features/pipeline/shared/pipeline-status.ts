import type { StatusBadgeProps } from '@comitium/ui/status-badge';
import {
  type ApplicationActivityStatusInput,
  getActivityBadge,
  getStageSince,
} from '@/components/features/application-status';
import type { KanbanApplication } from '@/lib/schemas/pipeline';
import { formatDate, getElapsedDaysSince } from '@/lib/utils';

const STAGE_AGE_WARNING_DAYS = 7;
const STAGE_AGE_CRITICAL_DAYS = 14;

export interface KanbanCardStatusInput extends ApplicationActivityStatusInput {
  stageSince: string | null;
}

export type CardUrgency = 'critical' | 'attention' | 'none';

export interface CardUrgencyState {
  level: CardUrgency;
  reason: string | null;
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
  const stageUrgency = getStageAgeUrgency(input.stageSince);

  if (activity?.variant === 'destructive') {
    return { level: 'critical', reason: badgeReason(activity) };
  }

  if (stageUrgency === 'critical') {
    return { level: 'critical', reason: getStageAgeReason(input.stageSince) };
  }

  if (stageUrgency === 'attention') {
    return { level: 'attention', reason: getStageAgeReason(input.stageSince) };
  }

  return { level: 'none', reason: null };
}

export function toCardStatusInput(application: KanbanApplication): KanbanCardStatusInput {
  return {
    reviewStatus: application.reviewStatus,
    interviewStatus: application.interviewStatus,
    interviewScheduledAt: application.interviewScheduledAt,
    stageSince: getStageSince(application.currentStageEnteredAt, application.appliedAt),
  };
}
