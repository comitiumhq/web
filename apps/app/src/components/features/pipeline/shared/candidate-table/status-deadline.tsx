import { StatusBadge, type StatusBadgeProps } from '@comitium/ui/status-badge';
import {
  getActivityBadge,
  getResponseUrgency,
  getResponseUrgencyVariant,
  getStageAgeBadge,
  getStageSince,
} from '@/components/features/application-status';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';
import { formatInTimezone } from '@/lib/utils';

export function StatusCell({ candidate }: { candidate: PipelineCandidate }) {
  const badge =
    getActivityBadge({
      reviewStatus: candidate.reviewStatus,
      interviewStatus: candidate.interviewStatus,
      interviewScheduledAt: candidate.interviewScheduledAt,
    }) ?? getStageAgeBadge(getStageSince(candidate.currentStageEnteredAt, candidate.appliedAt));

  if (!badge) {
    return <span className="text-copy-14 text-muted-foreground">—</span>;
  }

  return <StatusBadge {...badge} />;
}

export function DeadlineCell({ candidate, timezone }: { candidate: PipelineCandidate; timezone: string }) {
  const chip = getDeadlineChip(candidate, timezone);

  if (!chip) {
    return <span className="text-copy-14 text-muted-foreground">—</span>;
  }

  return <StatusBadge {...chip} />;
}

function getDeadlineChip(candidate: PipelineCandidate, timezone: string): StatusBadgeProps | null {
  if (candidate.isResponded) {
    return { variant: 'success', label: 'Responded' };
  }

  const deadline = candidate.responseDeadline;
  const urgency = getResponseUrgency(deadline);

  if (deadline === null || urgency === null) {
    return null;
  }

  const dueShort = formatInTimezone(deadline, timezone, 'MMM d');
  const dueFull = formatInTimezone(deadline, timezone, 'MMM d, h:mm a zzz');
  const variant = getResponseUrgencyVariant(urgency);

  if (urgency === 'overdue') {
    return { variant, label: `Overdue · ${dueShort}`, tooltip: `Deadline passed ${dueFull}` };
  }

  if (urgency === 'due_soon') {
    return { variant, label: `Due soon · ${dueShort}`, tooltip: `Make a decision by ${dueFull}` };
  }

  return { variant, label: dueShort, tooltip: `Make a decision by ${dueFull}` };
}
