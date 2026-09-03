import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { useCallback } from 'react';
import { useMarkInterviewNoShow } from '@/hooks/mutations/use-interview-mutations';

interface MarkNoShowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  scheduleId: string;
  interviewTitle: string;
}

export function MarkNoShowDialog({
  open,
  onOpenChange,
  applicationId,
  scheduleId,
  interviewTitle,
}: MarkNoShowDialogProps) {
  const { mutate: markNoShow, isPending } = useMarkInterviewNoShow();

  const handleConfirm = useCallback(() => {
    markNoShow({ applicationId, interviewId: scheduleId }, { onSuccess: () => onOpenChange(false) });
  }, [markNoShow, applicationId, scheduleId, onOpenChange]);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mark as no-show"
      description={`Mark ${interviewTitle} as no-show? This cannot be easily reversed.`}
      cancelLabel="Keep as scheduled"
      actionLabel="Mark no-show"
      pendingLabel="Marking…"
      onConfirm={handleConfirm}
      isPending={isPending}
    />
  );
}
