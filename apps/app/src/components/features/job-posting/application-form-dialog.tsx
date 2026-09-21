import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Spinner } from '@comitium/ui/spinner';
import { useEffect, useState } from 'react';
import { ApplicationFormPicker } from '@/components/features/job-draft/application-form-picker';

interface ApplicationFormDialogProps {
  currentFormId: string | null;
  isPending: boolean;
  jobId: string;
  open: boolean;
  orgId: string;
  onOpenChange: (open: boolean) => void;
  onSave: (formId: string) => Promise<void>;
}

export function ApplicationFormDialog({
  currentFormId,
  isPending,
  jobId,
  open,
  orgId,
  onOpenChange,
  onSave,
}: ApplicationFormDialogProps) {
  const [formId, setFormId] = useState<string | null>(currentFormId);

  useEffect(() => {
    if (open) {
      setFormId(currentFormId);
    }
  }, [currentFormId, open]);

  const handleSave = async () => {
    if (!formId || formId === currentFormId) {
      return;
    }

    try {
      await onSave(formId);
      onOpenChange(false);
    } catch {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 px-6 pb-5 pt-6">
          <DialogTitle>Choose Application Form</DialogTitle>
          <DialogDescription>Select the form candidates complete for this Posting.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <ApplicationFormPicker orgId={orgId} owner={{ kind: 'job', jobId }} formId={formId} onChange={setFormId} />
        </div>

        <DialogFooter className="shrink-0 border-t border-separator px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!formId || formId === currentFormId || isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
