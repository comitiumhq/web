import type { JobDraft } from '@comitium/schemas/jobs';
import { ActionConfirmationNotice, getActionConfirmationPresentation } from '@comitium/ui/action-confirmation';
import { Alert, AlertDescription } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Form } from '@comitium/ui/form';
import { Spinner } from '@comitium/ui/spinner';
import { useCallback, useRef } from 'react';

import { CostSummary } from './cost-summary';
import {
  ApplicationLimitField,
  EmployerStakeField,
  InsufficientFundsAlert,
  ResponseDeadlineField,
} from './publish-job-dialog-fields';
import { usePublishJobDialog } from './use-publish-job-dialog';

interface PublishJobDialogProps {
  orgId: string;
  jobId: string;
  draftTitle: string;
  draft: JobDraft;
  expectedVersion: number;
  descriptionMarkdown: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishJobDialog({
  orgId,
  jobId,
  draftTitle,
  draft,
  expectedVersion,
  descriptionMarkdown,
  open,
  onOpenChange,
}: PublishJobDialogProps) {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const dialog = usePublishJobDialog({
    orgId,
    jobId,
    draft,
    expectedVersion,
    descriptionMarkdown,
    open,
    onOpenChange,
  });
  const action = getActionConfirmationPresentation({
    idleLabel: 'Publish job',
    pendingLabel: 'Publishing...',
    isPending: dialog.isPending,
    isConfirming: dialog.isConfirming,
  });
  const handleOpenAutoFocus = useCallback((event: Event) => {
    event.preventDefault();
    dialogContentRef.current?.focus();
  }, []);

  return (
    <Dialog open={open} onOpenChange={dialog.handleOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        onOpenAutoFocus={handleOpenAutoFocus}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogHeader className="shrink-0 px-6 pb-6 pt-6">
          <PublishDialogTitle draftTitle={draftTitle} />
          <DialogDescription className="sr-only">Review publication funding and response terms.</DialogDescription>
        </DialogHeader>

        <Form {...dialog.form}>
          <form
            onSubmit={dialog.form.handleSubmit(dialog.handleSubmit)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 pb-6">
              <div className="flex flex-col gap-5">
                <EmployerStakeField control={dialog.form.control} minStakeUsd={dialog.minStakeUsd} />
                <ResponseDeadlineField
                  control={dialog.form.control}
                  options={dialog.feeTierOptions}
                  isConfigLoading={dialog.isConfigLoading}
                />
                {dialog.isConfigError && (
                  <JobConfigErrorAlert onRetry={dialog.handleRetryJobConfig} isRetrying={dialog.isConfigFetching} />
                )}
                <ApplicationLimitField
                  control={dialog.form.control}
                  enabled={dialog.limitApps}
                  maxApplications={dialog.maxApplications}
                  onToggle={dialog.handleLimitToggle}
                />
              </div>

              <div className="flex flex-col gap-4">
                <CostSummary
                  employerStake={dialog.employerStake}
                  feeLabel={dialog.feeLabel}
                  platformFee={dialog.platformFee}
                  totalCost={dialog.totalCost}
                  availableUsd={dialog.availableUsd}
                  isConfigLoading={dialog.isConfigLoading}
                  hasJobConfig={dialog.hasJobConfig}
                  isBalanceLoading={dialog.isBalanceLoading}
                  isInsufficient={dialog.isInsufficient}
                />

                {dialog.showInsufficientAlert && (
                  <InsufficientFundsAlert orgId={orgId} shortfallUsd={dialog.totalCost - dialog.availableUsd} />
                )}

                {dialog.isConfirming && <ActionConfirmationNotice />}
              </div>
            </div>

            <DialogFooter className="shrink-0 px-6 pb-6">
              <Button type="button" variant="outline" onClick={dialog.handleCancel} disabled={dialog.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!dialog.canSubmit}>
                {action.showSpinner && <Spinner data-icon="inline-start" />}
                {action.label}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PublishDialogTitle({ draftTitle }: { draftTitle: string }) {
  return (
    <DialogTitle className="flex min-w-0 gap-0 overflow-hidden">
      <span className="shrink-0">Publish&nbsp;"</span>
      <span className="truncate">{draftTitle}</span>
      <span className="shrink-0">"</span>
    </DialogTitle>
  );
}

interface JobConfigErrorAlertProps {
  isRetrying: boolean;
  onRetry: () => void;
}

function getRetryLabel(isRetrying: boolean) {
  return isRetrying ? 'Retrying...' : 'Retry';
}

function JobConfigErrorAlert({ isRetrying, onRetry }: JobConfigErrorAlertProps) {
  const retryLabel = getRetryLabel(isRetrying);

  return (
    <Alert variant="default">
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>Could not load current pricing.</span>
        <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={isRetrying}>
          {retryLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
