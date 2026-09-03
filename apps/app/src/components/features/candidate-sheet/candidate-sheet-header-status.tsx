import type { ApplicationTerminalOutcome } from '@comitium/schemas/applications';
import { StatusBadge } from '@comitium/ui/status-badge';
import { getActivityBadge, getResponseDeadlineBadge, getStageAgeBadge } from '@/components/features/application-status';
import type { InterviewStatusValue } from '@/lib/schemas/interviews';
import type { ReviewStatus, StageType } from '@/lib/schemas/pipeline';

interface CandidateSheetHeaderStatusProps {
  reviewStatus: ReviewStatus;
  interviewStatus: InterviewStatusValue | null;
  interviewScheduledAt: string | null;
  currentStageType: StageType | null;
  stageSince: string | null;
  isResponded: boolean;
  responseDeadline: string | null;
  terminalOutcome: ApplicationTerminalOutcome | null;
}

export function CandidateSheetHeaderStatus({
  reviewStatus,
  interviewStatus,
  interviewScheduledAt,
  currentStageType,
  stageSince,
  isResponded,
  responseDeadline,
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
  const deadline = currentStageType === 'review' ? getResponseDeadlineBadge(isResponded, responseDeadline) : null;

  if (!status && !deadline) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {status && <StatusBadge {...status} />}
      {deadline && <StatusBadge {...deadline} />}
    </div>
  );
}
