import { ActionConfirmationNotice, getActionConfirmationPresentation } from '@comitium/ui/action-confirmation';
import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { useCallback, useState } from 'react';
import { useCloseJob } from '@/hooks/mutations/use-close-job';
import { useQueryCloseReasonsList } from '@/hooks/queries/use-query-close-reasons-list';

interface CloseJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string | null;
  orgId: string;
  expectedVersion: number;
  commitmentSettlementRequired: boolean;
  activeApplications: number;
}

export function CloseJobDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  orgId,
  expectedVersion,
  commitmentSettlementRequired,
  activeApplications,
}: CloseJobDialogProps) {
  const [reasonId, setReasonId] = useState('');
  const { data: reasonsResponse, isLoading: isLoadingReasons } = useQueryCloseReasonsList(orgId);
  const reasons = reasonsResponse?.data;

  const handleCompleted = useCallback(() => {
    setReasonId('');
    onOpenChange(false);
  }, [onOpenChange]);

  const {
    run: runClose,
    isPending,
    isConfirming,
  } = useCloseJob({
    onCompleted: handleCompleted,
  });
  const hasActiveApplications = activeApplications > 0;
  const isActionPending = isPending || isConfirming;
  const action = getActionConfirmationPresentation({
    idleLabel: 'Close job',
    pendingLabel: 'Closing...',
    isPending,
    isConfirming,
  });

  const handleClose = useCallback(() => {
    if (!reasonId || isActionPending) {
      return;
    }

    runClose({
      orgId,
      jobId,
      closeReasonId: reasonId,
      expectedVersion,
      commitmentSettlementRequired,
    });
  }, [expectedVersion, commitmentSettlementRequired, isActionPending, jobId, orgId, reasonId, runClose]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (isPending) {
        return;
      }

      if (!value) {
        setReasonId('');
      }

      onOpenChange(value);
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close job?</DialogTitle>
          <DialogDescription>{jobTitle ?? 'Untitled job'}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {hasActiveApplications && (
            <Alert variant="warning">
              <AlertTitle>
                {activeApplications} active application{activeApplications === 1 ? '' : 's'}
              </AlertTitle>
              <AlertDescription>
                They will remain in this pipeline and can still be worked after the job is closed.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-label-14 font-medium">
              Reason for closing <span className="text-destructive">*</span>
            </p>
            <Select value={reasonId} onValueChange={setReasonId} disabled={isLoadingReasons || isActionPending}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingReasons ? 'Loading reasons...' : 'Select reason'} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {reasons?.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <p className="text-copy-14 text-muted-foreground">
            Closing stops new applications. Existing applications remain available, and you can reopen the same job
            later.
          </p>

          {isConfirming && <ActionConfirmationNotice />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={!reasonId || isActionPending}>
            {action.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
