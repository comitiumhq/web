import type { SearchSelectOption } from '@comitium/ui/search-select';
import { ARCHIVE_REASON_OUTCOME_LABELS } from '@/components/features/archive-reasons/labels';
import type { ArchiveReasonOutcome, ArchiveReasonRow } from '@/lib/schemas/archive-reasons';
import type { EmailTemplateUseCase } from '@/lib/schemas/emails';

const OUTCOME_TEMPLATE_USE_CASE: Record<ArchiveReasonOutcome, EmailTemplateUseCase> = {
  employer_rejected: 'rejection',
  candidate_withdrew: 'application_withdrew',
  candidate_unresponsive: 'application_unresponsive',
};

export function getArchiveTemplateUseCase(reason: ArchiveReasonRow | undefined) {
  if (!reason) return undefined;

  return OUTCOME_TEMPLATE_USE_CASE[reason.outcome];
}

export function buildArchiveReasonOptions(reasons: readonly ArchiveReasonRow[]): SearchSelectOption[] {
  return reasons.map((reason) => ({
    value: reason.id,
    label: reason.label,
    description: ARCHIVE_REASON_OUTCOME_LABELS[reason.outcome],
    searchValue: `${reason.label} ${ARCHIVE_REASON_OUTCOME_LABELS[reason.outcome]}`,
  }));
}

export function getArchiveReasonPlaceholder(query: { isLoading: boolean; isError: boolean }) {
  if (query.isLoading) return 'Loading reasons...';
  if (query.isError) return 'Reasons unavailable';

  return 'Select a reason';
}

export function isArchiveSubmitDisabled(input: {
  archiveReasonId: string | null;
  reasonsLoading: boolean;
  reasonsError: boolean;
  executableCount: number;
  preparableEmailCount: number;
  vaultLoading: boolean;
  vaultError: boolean;
  hasVaultKey: boolean;
}) {
  const isArchiveContextInvalid =
    !input.archiveReasonId || input.reasonsLoading || input.reasonsError || input.executableCount === 0;

  if (isArchiveContextInvalid) return true;
  if (input.preparableEmailCount === 0) return false;

  return input.vaultLoading || input.vaultError || !input.hasVaultKey;
}
