import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { WarningIcon } from '@phosphor-icons/react';
import {
  EmailDeliverySummary,
  getEmailSenderLabel,
} from '@/components/features/candidate-communication/email-composer-fields';
import { BulkOperationSheet } from '../operation/bulk-operation-sheet';
import type { PipelineBulkActionSheetProps } from '../types';
import { BulkEmailComposerFields } from './bulk-email-composer';
import { useBulkEmailAction } from './use-bulk-email-action';

export function BulkEmailSheet(props: PipelineBulkActionSheetProps) {
  const action = useBulkEmailAction(props);

  return (
    <BulkOperationSheet
      open={props.open}
      onOpenChange={action.handleOpenChange}
      title="Email selected candidates"
      operation={action.bulk.operation}
      targets={action.targets}
      loading={action.bulk.isLoading}
      error={action.bulk.error}
      onRetry={action.bulk.retryDraft}
      submitLabel={`Send to ${action.executableCount}`}
      pendingLabel="Starting…"
      submitDisabled={action.submitDisabled}
      submitting={action.bulk.isSubmitting}
      onSubmit={action.submit}
    >
      {action.vaultError ? (
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>Encryption keys unavailable</AlertTitle>
          <AlertDescription>Unlock organization data before sending email.</AlertDescription>
        </Alert>
      ) : null}

      {action.unavailableTargets.length > 0 ? (
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>
            {action.unavailableTargets.length}{' '}
            {action.unavailableTargets.length === 1 ? 'recipient will be skipped' : 'recipients will be skipped'}
          </AlertTitle>
          <AlertDescription>Recipient contact or encryption data is unavailable.</AlertDescription>
        </Alert>
      ) : null}

      {action.preparationError ? (
        <Alert variant="warning">
          <WarningIcon />
          <AlertTitle>Email needs attention</AlertTitle>
          <AlertDescription>{action.preparationError}</AlertDescription>
        </Alert>
      ) : null}

      <EmailDeliverySummary
        sender={getEmailSenderLabel(action.draft.senderName)}
        recipient={`${action.executableCount} ${action.executableCount === 1 ? 'candidate' : 'candidates'}`}
      />

      <BulkEmailComposerFields draft={action.draft} disabled={action.bulk.isSubmitting} />
    </BulkOperationSheet>
  );
}
