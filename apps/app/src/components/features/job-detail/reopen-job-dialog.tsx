import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { useCallback } from 'react';
import { useReopenJobAsDraft } from '@/hooks/mutations/use-reopen-job-as-draft';

interface ReopenJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string | null;
  orgId: string;
}

export function ReopenJobDialog({ open, onOpenChange, jobId, jobTitle, orgId }: ReopenJobDialogProps) {
  const { mutateAsync: reopenAsDraft, isPending } = useReopenJobAsDraft();

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleReopen = useCallback(async () => {
    try {
      await reopenAsDraft({ orgId, jobId });
      onOpenChange(false);
    } catch {
      // The mutation owns user-facing errors.
    }
  }, [jobId, onOpenChange, orgId, reopenAsDraft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reopen as draft?</DialogTitle>
          <DialogDescription>{jobTitle ?? 'Closed job'}</DialogDescription>
        </DialogHeader>

        <p className="text-copy-14 text-muted-foreground">
          The job will return to draft so you can update and publish it again. Existing applications remain in the same
          pipeline.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleReopen} disabled={isPending}>
            {isPending ? 'Reopening...' : 'Reopen as Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
