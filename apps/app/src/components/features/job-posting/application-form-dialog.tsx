import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { ApplicationFormPicker } from '@/components/features/job-draft/application-form-picker';

interface ApplicationFormDialogProps {
  currentFormId: string | null;
  jobId: string;
  open: boolean;
  orgId: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (formId: string | null) => void;
}

export function ApplicationFormDialog({
  currentFormId,
  jobId,
  open,
  orgId,
  onOpenChange,
  onSelect,
}: ApplicationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 px-6 pb-5 pt-6">
          <DialogTitle>Choose Application Form</DialogTitle>
          <DialogDescription>Select the form candidates complete for this Posting.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <ApplicationFormPicker
            orgId={orgId}
            owner={{ kind: 'job', jobId }}
            formId={currentFormId}
            onChange={onSelect}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
