import { StatusBadge } from '@comitium/ui/status-badge';
import { getActivityBadge, getStageAgeBadge, getStageSince } from '@/components/features/application-status';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';

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
