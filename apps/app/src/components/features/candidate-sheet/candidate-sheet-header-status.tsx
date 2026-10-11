import type { ApplicationTerminalOutcome } from '@comitium/schemas/applications';
import { StatusBadge } from '@comitium/ui/status-badge';
import { getActivityBadge, getStageAgeBadge } from '@/components/features/application-status';
import type { InterviewStatusValue } from '@/lib/schemas/interviews';
import type { ReviewStatus } from '@/lib/schemas/pipeline';

interface CandidateSheetHeaderStatusProps {
  reviewStatus: ReviewStatus;
  interviewStatus: InterviewStatusValue | null;
  interviewScheduledAt: string | null;
  stageSince: string | null;
  terminalOutcome: ApplicationTerminalOutcome | null;
}

export function CandidateSheetHeaderStatus({
  reviewStatus,
  interviewStatus,
  interviewScheduledAt,
  stageSince,
  terminalOutcome,
}: CandidateSheetHeaderStatusProps) {
  if (terminalOutcome) {
    return null;
  }

  const status =
    getActivityBadge({
      reviewStatus,
      interviewStatus,
      interviewScheduledAt,
    }) ?? getStageAgeBadge(stageSince);

  if (!status) {
    return null;
  }

  return <div className="flex min-w-0 flex-wrap items-center gap-2">{status && <StatusBadge {...status} />}</div>;
}
