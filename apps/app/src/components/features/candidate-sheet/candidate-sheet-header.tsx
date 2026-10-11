import type { ApplicationTerminalOutcome, CandidateSheetCapabilities } from '@comitium/schemas/applications';
import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { SheetHeader, SheetTitle } from '@comitium/ui/sheet';
import { useCallback } from 'react';
import { getStageSince } from '@/components/features/application-status';
import { TagSelector } from '@/components/features/candidate-tags/tag-selector';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import type { InterviewStatusValue } from '@/lib/schemas/interviews';
import type { InterviewStage, ReviewStatus } from '@/lib/schemas/pipeline';

import { CandidateSheetHeaderActions } from './candidate-sheet-header-actions';
import { CandidateSheetHeaderStatus } from './candidate-sheet-header-status';

interface SheetHeaderPending {
  isChangingStage: boolean;
  isTerminalActionPending: boolean;
}

interface CandidateSheetHeaderProps {
  orgId: string;
  candidateId: string | null;
  displayName: string;
  subtitle: string | null;
  appliedAt: string | null;
  currentStageId: string | null;
  currentStageEnteredAt: string | null;
  interviewStatus: InterviewStatusValue | null;
  interviewScheduledAt: string | null;
  stages: InterviewStage[] | null;
  onStageChange: (stageId: string) => void;
  onEmail: () => void;
  onArchive: () => void;
  onReopenToStage: (stageId: string) => void;
  terminalOutcome: ApplicationTerminalOutcome | null;
  archiveReasonLabel: string | null;
  pending: SheetHeaderPending;
  capabilities: CandidateSheetCapabilities;
  tagIds: string[];
  reviewStatus: ReviewStatus;
}

export function CandidateSheetHeader({
  orgId,
  candidateId,
  displayName,
  subtitle,
  appliedAt,
  currentStageId,
  currentStageEnteredAt,
  interviewStatus,
  interviewScheduledAt,
  stages,
  onStageChange,
  onEmail,
  onArchive,
  onReopenToStage,
  terminalOutcome,
  archiveReasonLabel,
  pending,
  capabilities,
  tagIds,
  reviewStatus,
}: CandidateSheetHeaderProps) {
  const { runUnlocked } = useEncryptionUnlocked(orgId);
  const handleEmail = useCallback(() => runUnlocked(onEmail), [runUnlocked, onEmail]);
  const handleArchive = useCallback(() => runUnlocked(onArchive), [onArchive, runUnlocked]);
  const stageSince = getStageSince(currentStageEnteredAt, appliedAt);

  return (
    <SheetHeader className="shrink-0 gap-0 border-b border-separator bg-background p-0">
      <div className="px-6 py-4 pr-14 sm:pr-6">
        <div className="flex flex-col items-stretch gap-3 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-heading-20">{displayName}</SheetTitle>
            <p className="mt-0.5 min-h-5 truncate text-sm text-muted-foreground">{subtitle}</p>

            <div className="mt-2 flex min-h-5 min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <CandidateSheetHeaderStatus
                reviewStatus={reviewStatus}
                interviewStatus={interviewStatus}
                interviewScheduledAt={interviewScheduledAt}
                stageSince={stageSince}
                terminalOutcome={terminalOutcome}
              />

              <CandidateHeaderMetadata terminalOutcome={terminalOutcome} archiveReasonLabel={archiveReasonLabel} />
            </div>

            <div className="mt-2 min-h-6">
              <TagSelector
                orgId={orgId}
                candidateId={candidateId}
                tagIds={tagIds}
                canAssign={capabilities.candidate.canManageTags}
                maxVisibleTags={2}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-start gap-2 min-[900px]:items-end">
            <CandidateSheetHeaderActions
              capabilities={capabilities}
              currentStageId={currentStageId}
              stages={stages}
              isChangingStage={pending.isChangingStage}
              isTerminalActionPending={pending.isTerminalActionPending}
              onStageChange={onStageChange}
              onEmail={handleEmail}
              onArchive={handleArchive}
              onReopenToStage={onReopenToStage}
            />
          </div>
        </div>
      </div>
    </SheetHeader>
  );
}

interface CandidateHeaderMetadataProps {
  terminalOutcome: ApplicationTerminalOutcome | null;
  archiveReasonLabel: string | null;
}

function CandidateHeaderMetadata({ terminalOutcome, archiveReasonLabel }: CandidateHeaderMetadataProps) {
  if (!terminalOutcome) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        {APPLICATION_TERMINAL_OUTCOME_LABEL[terminalOutcome]}
        {archiveReasonLabel ? ` · ${archiveReasonLabel}` : ''}
      </span>
    </div>
  );
}
