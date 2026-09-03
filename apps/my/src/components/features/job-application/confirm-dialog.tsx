import { formatUsdcAmount } from '@comitium/chain/usdc';
import { ActionConfirmationNotice, getActionConfirmationPresentation } from '@comitium/ui/action-confirmation';
import { Button } from '@comitium/ui/button';
import { formatDeadlineDate } from '@comitium/ui/date';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Spinner } from '@comitium/ui/spinner';
import { UsdcIcon } from '@comitium/ui/usdc';
import { useCallback } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  jobTitle: string;
  company: string;
  stakeAmount: bigint;
  responseDeadlineDays: number;
  isSubmitting: boolean;
  isConfirming: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  jobTitle,
  company,
  stakeAmount,
  responseDeadlineDays,
  isSubmitting,
  isConfirming,
}: ConfirmDialogProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isSubmitting) {
        return;
      }

      onOpenChange(nextOpen);
    },
    [isSubmitting, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const isActionPending = isSubmitting || isConfirming;
  const action = getActionConfirmationPresentation({
    idleLabel: 'Submit application',
    pendingLabel: 'Submitting...',
    isPending: isSubmitting,
    isConfirming,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-heading-20">Confirm application</DialogTitle>
          <DialogDescription className="text-label-14">
            <span className="font-medium text-foreground">{jobTitle}</span> at {company}
          </DialogDescription>
        </DialogHeader>

        <section aria-labelledby="deposit-summary-title" className="grid gap-5">
          <div className="flex items-center gap-3">
            <UsdcIcon className="size-6 shrink-0" />
            <div className="grid gap-0.5">
              <h3 id="deposit-summary-title" className="text-label-12 text-muted-foreground">
                Refundable deposit
              </h3>
              <p className="text-heading-24 tabular-nums">{formatUsdcAmount(stakeAmount)}</p>
            </div>
          </div>

          <p className="text-copy-14 leading-relaxed text-muted-foreground">
            This refundable deposit helps show the hiring team that your application is intentional.
          </p>

          <dl className="grid gap-4">
            <div className="space-y-1">
              <dt className="text-label-12 text-muted-foreground">Where it stays</dt>
              <dd className="text-copy-14 leading-relaxed text-foreground">
                In a smart contract. Comitium never holds it.
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-label-12 text-muted-foreground">When it comes back</dt>
              <dd className="text-copy-14 leading-relaxed text-foreground">
                After the hiring team responds, or on{' '}
                <span className="font-medium">{formatDeadlineDate(responseDeadlineDays)}</span> if you have not heard
                back.
              </dd>
            </div>
          </dl>
        </section>

        {isConfirming && <ActionConfirmationNotice />}

        <DialogFooter>
          <Button variant="outline" size="default" className="min-w-28" onClick={handleCancel} disabled={isSubmitting}>
            Back
          </Button>
          <Button size="default" className="min-w-40" onClick={handleConfirm} disabled={isActionPending}>
            {action.showSpinner && <Spinner data-icon="inline-start" />}
            {action.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
