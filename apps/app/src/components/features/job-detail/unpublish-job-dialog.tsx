import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { useCallback } from 'react';
import { useUnpublishJob } from '@/hooks/mutations/use-unpublish-job';

interface UnpublishJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobOnChainId: number;
  jobTitle: string | null;
  orgId: string;
}

export function UnpublishJobDialog({
  open,
  onOpenChange,
  jobId,
  jobOnChainId,
  jobTitle,
  orgId,
}: UnpublishJobDialogProps) {
  const handleCompleted = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const { run: runUnpublish, isPending } = useUnpublishJob({
    onCompleted: handleCompleted,
  });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isPending) {
        return;
      }

      onOpenChange(nextOpen);
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const handleUnpublish = useCallback(() => {
    runUnpublish({ orgId, jobId });
  }, [jobId, orgId, runUnpublish]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unpublish job?</DialogTitle>
          <DialogDescription>{jobTitle ?? `Job #${jobOnChainId}`}</DialogDescription>
        </DialogHeader>

        <p className="text-copy-14 text-muted-foreground">
          No new applications will be accepted for this publication. Existing candidates stay in the pipeline.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleUnpublish} disabled={isPending}>
            {isPending ? 'Unpublishing...' : 'Unpublish job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
