import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Label } from '@comitium/ui/label';
import { WarningIcon } from '@phosphor-icons/react';
import { ArchiveReasonSelect } from '@/components/features/archive-reasons/archive-reason-select';
import { BulkEmailContentFields, BulkEmailTemplateField } from '../email/bulk-email-composer';
import { BulkOperationSheet } from '../operation/bulk-operation-sheet';
import type { PipelineBulkActionSheetProps } from '../types';
import { useBulkArchiveAction } from './use-bulk-archive-action';

export function BulkArchiveSheet(props: PipelineBulkActionSheetProps) {
  const action = useBulkArchiveAction(props);

  return (
    <BulkOperationSheet
      open={props.open}
      onOpenChange={action.handleOpenChange}
      title="Archive selected applications"
      operation={action.bulk.operation}
      targets={action.targets}
      loading={action.bulk.isLoading}
      error={action.bulk.error}
      onRetry={action.bulk.retryDraft}
      submitLabel={`Archive ${action.executableCount}`}
      pendingLabel="Starting…"
      submitDisabled={action.submitDisabled}
      submitting={action.bulk.isSubmitting}
      destructive
      onSubmit={action.submit}
    >
      <UnavailableRecipientWarning count={action.unavailableEmailTargets.length} />

      {action.vaultError && action.emailRequired ? (
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>Encryption keys unavailable</AlertTitle>
          <AlertDescription>Unlock organization data before preparing required email.</AlertDescription>
        </Alert>
      ) : null}

      {action.preparationError ? (
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>Email needs attention</AlertTitle>
          <AlertDescription>{action.preparationError}</AlertDescription>
        </Alert>
      ) : null}

      <div className={action.emailRequired ? 'grid gap-5 sm:grid-cols-2' : undefined}>
        <div className="space-y-1.5">
          <Label>Reason</Label>
          <ArchiveReasonSelect
            options={action.reasonOptions}
            value={action.archiveReasonId}
            placeholder={action.reasonPlaceholder}
            disabled={action.reasonsLoading || action.reasonsError}
            onValueChange={action.setArchiveReasonId}
          />
        </div>

        {action.emailRequired ? (
          <BulkEmailTemplateField draft={action.draft} disabled={action.bulk.isSubmitting} label="Email template" />
        ) : null}
      </div>

      {action.emailRequired ? (
        <BulkEmailContentFields draft={action.draft} disabled={action.bulk.isSubmitting} />
      ) : null}
    </BulkOperationSheet>
  );
}

function UnavailableRecipientWarning({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Alert variant="warning">
      <WarningIcon />
      <AlertTitle>
        {count} {count === 1 ? 'application will be skipped' : 'applications will be skipped'}
      </AlertTitle>
      <AlertDescription>Required recipient contact or encryption data is unavailable.</AlertDescription>
    </Alert>
  );
}
