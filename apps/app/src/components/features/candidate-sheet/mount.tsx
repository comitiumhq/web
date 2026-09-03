import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { useCallback, useRef } from 'react';
import type { InterviewStage } from '@/lib/schemas/pipeline';

import { CandidateSheet } from './candidate-sheet';

export interface CandidateSheetSelection {
  id: string;
  jobId: string;
  jobOnChainId: number | null;
  jobTitle: string | null;
  stages: InterviewStage[];
}

interface CandidateSheetMountProps {
  selectedApp: CandidateSheetSelection | null;
  orgId: string;
  onClose: () => void;
  onNavigate?: (applicationId: string) => void;
  onApplicationSwitch?: (next: OtherApplicationSummary) => void;
  candidateIds?: string[];
}

export function CandidateSheetMount({
  selectedApp,
  orgId,
  onClose,
  onNavigate,
  onApplicationSwitch,
  candidateIds,
}: CandidateSheetMountProps) {
  const lastAppRef = useRef<CandidateSheetSelection | null>(null);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose],
  );

  if (selectedApp) {
    lastAppRef.current = selectedApp;
  }

  const displayApp = selectedApp ?? lastAppRef.current;

  if (!displayApp) {
    return null;
  }

  return (
    <CandidateSheet
      applicationId={selectedApp?.id ?? null}
      orgId={orgId}
      jobId={displayApp.jobId}
      jobOnChainId={displayApp.jobOnChainId}
      stages={displayApp.stages}
      jobTitle={displayApp.jobTitle}
      open={!!selectedApp}
      onOpenChange={handleOpenChange}
      onNavigate={onNavigate}
      onApplicationSwitch={onApplicationSwitch}
      candidateIds={candidateIds}
    />
  );
}
