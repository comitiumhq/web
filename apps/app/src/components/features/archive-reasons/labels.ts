import type { ArchiveReasonOutcome } from '@/lib/schemas/archive-reasons';

import type { ArchiveReasonClassification } from './reason-form';

export const ARCHIVE_REASON_CLASSIFICATION_LABELS: Record<ArchiveReasonClassification, string> = {
  organization_rejected: 'Rejected by organization',
  candidate_withdrew: 'Candidate withdrew',
  candidate_unresponsive: 'Candidate unresponsive',
  other: 'Other',
};

export const ARCHIVE_REASON_OUTCOME_LABELS: Record<ArchiveReasonOutcome, string> = {
  employer_rejected: 'Not moving forward',
  candidate_withdrew: 'Candidate withdrew',
  candidate_unresponsive: 'Candidate unresponsive',
};
