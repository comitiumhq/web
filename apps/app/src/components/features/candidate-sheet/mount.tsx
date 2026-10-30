import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { type ComponentProps, useCallback, useRef } from 'react';
import type { InterviewStage } from '@/lib/schemas/pipeline';

import { CandidateSheet } from './candidate-sheet';

export interface CandidateSheetSelection {
  id: string;
  jobId: string;
  jobTitle: string | null;
  stages?: InterviewStage[];
}

interface CandidateRecordSelection {
  candidateId: string;
}

export type CandidateSheetEntry = CandidateSheetSelection | CandidateRecordSelection;

interface CandidateSheetMountProps {
  selected: CandidateSheetEntry | null;
  orgId: string;
  onClose: () => void;
  onNavigate?: (applicationId: string) => void;
  onApplicationSwitch?: (next: OtherApplicationSummary) => void;
  candidateIds?: string[];
}

export function CandidateSheetMount({
  selected,
  orgId,
  onClose,
  onNavigate,
  onApplicationSwitch,
  candidateIds,
}: CandidateSheetMountProps) {
  const lastEntryRef = useRef<CandidateSheetEntry | null>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose],
  );

  if (selected) {
    lastEntryRef.current = selected;
  }

  const display = selected ?? lastEntryRef.current;

  if (!display) {
    return null;
  }

  const common = { orgId, open: Boolean(selected), onOpenChange: handleOpenChange };

  const props: ComponentProps<typeof CandidateSheet> =
    'candidateId' in display
      ? { ...common, applicationId: null, candidateId: display.candidateId }
      : {
          ...common,
          applicationId: selected && 'id' in selected ? selected.id : null,
          jobId: display.jobId,
          stages: display.stages,
          jobTitle: display.jobTitle,
          onNavigate,
          onApplicationSwitch,
          candidateIds,
        };

  return <CandidateSheet {...props} />;
}
