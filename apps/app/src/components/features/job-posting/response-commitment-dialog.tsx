import { Alert, AlertDescription } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Form } from '@comitium/ui/form';
import { Spinner } from '@comitium/ui/spinner';
import { CommitmentCostSummary } from './commitment-cost-summary';
import { EmployerStakeField, InsufficientFundsAlert, ResponseDeadlineField } from './response-commitment-fields';
import { useResponseCommitmentDialog } from './use-response-commitment-dialog';

interface ResponseCommitmentDialogProps {
  orgId: string;
  jobId: string;
  expectedVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResponseCommitmentDialog(props: ResponseCommitmentDialogProps) {
  const dialog = useResponseCommitmentDialog(props);

  return (
    <Dialog open={props.open} onOpenChange={dialog.handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 px-6 pb-6 pt-6">
          <DialogTitle>Add response commitment</DialogTitle>
          <DialogDescription className="sr-only">Choose the response time and funding.</DialogDescription>
        </DialogHeader>

        <Form {...dialog.form}>
          <form
            onSubmit={dialog.form.handleSubmit(dialog.handleSubmit)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
              <EmployerStakeField control={dialog.form.control} minStakeUsd={dialog.minStakeUsd} />
              <ResponseDeadlineField
                control={dialog.form.control}
                options={dialog.feeTierOptions}
                isConfigLoading={dialog.isConfigLoading}
              />

              {dialog.isConfigError && (
                <Alert>
                  <AlertDescription className="flex items-center justify-between gap-3">
                    <span>Could not load current pricing.</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => dialog.handleRetryConfig()}
                      disabled={dialog.isConfigFetching}
                    >
                      {dialog.isConfigFetching ? 'Retrying...' : 'Retry'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {dialog.isBalanceError && (
                <Alert>
                  <AlertDescription className="flex items-center justify-between gap-3">
                    <span>Could not load available Commitment Funds.</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => dialog.handleRetryBalance()}
                      disabled={dialog.isBalanceFetching}
                    >
                      {dialog.isBalanceFetching ? 'Retrying...' : 'Retry'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <CommitmentCostSummary
                employerStake={dialog.employerStake}
                feeLabel={dialog.feeLabel}
                platformFee={dialog.platformFee}
                totalCost={dialog.totalCost}
                availableUsd={dialog.availableUsd}
                pricingAvailable={dialog.pricingAvailable}
                isBalanceLoading={dialog.isBalanceLoading || dialog.isBalanceError}
                isInsufficient={dialog.isInsufficient}
              />

              {dialog.isInsufficient && (
                <InsufficientFundsAlert orgId={props.orgId} shortfallUsd={dialog.totalCost - dialog.availableUsd} />
              )}
            </div>

            <DialogFooter className="shrink-0 px-6 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => dialog.handleOpenChange(false)}
                disabled={dialog.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!dialog.canSubmit}>
                {dialog.isPending && <Spinner data-icon="inline-start" />}
                {dialog.isPending ? 'Adding...' : 'Add commitment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
