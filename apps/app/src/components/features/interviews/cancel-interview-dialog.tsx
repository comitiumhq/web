import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { useCallback } from 'react';
import { ReasonPicker } from '@/components/features/cancel-reschedule-reasons/reason-picker';
import { useReasonPickerState } from '@/components/features/cancel-reschedule-reasons/use-reason-picker-state';
import { useCancelInterview } from '@/hooks/mutations/use-interview-mutations';

interface CancelInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  applicationId: string;
  scheduleId: string;
  interviewTitle: string;
  scheduledLabel: string | null;
  isSchedulingLink?: boolean;
}

export function CancelInterviewDialog({
  open,
  onOpenChange,
  orgId,
  applicationId,
  scheduleId,
  interviewTitle,
  scheduledLabel,
  isSchedulingLink = false,
}: CancelInterviewDialogProps) {
  const { mutate: cancelInterview, isPending } = useCancelInterview();
  const picker = useReasonPickerState(orgId, 'cancel', open);

  const handleConfirm = useCallback(() => {
    picker.setSubmitted(true);

    if (picker.reasonRequired && !picker.reasonId) {
      return;
    }

    const body = picker.buildBody();

    cancelInterview(
      {
        applicationId,
        interviewId: scheduleId,
        body: Object.keys(body).length > 0 ? body : undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }, [picker, cancelInterview, applicationId, scheduleId, onOpenChange]);

  const description = getCancelDescription({ interviewTitle, scheduledLabel, isSchedulingLink });
  const title = isSchedulingLink ? 'Cancel scheduling link' : 'Cancel interview';
  const actionLabel = isSchedulingLink ? 'Cancel link' : 'Cancel interview';
  const cancelLabel = isSchedulingLink ? 'Keep link' : 'Keep interview';

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      cancelLabel={cancelLabel}
      actionLabel={actionLabel}
      pendingLabel="Cancelling…"
      onConfirm={handleConfirm}
      isPending={isPending}
      extraContent={<ReasonPicker state={picker} disabled={isPending} idPrefix="cancel" />}
    />
  );
}

function getCancelDescription(params: {
  interviewTitle: string;
  scheduledLabel: string | null;
  isSchedulingLink: boolean;
}): string {
  if (params.isSchedulingLink) {
    return `Cancel the scheduling link for ${params.interviewTitle}? The candidate booking page will stop accepting it.`;
  }

  if (params.scheduledLabel) {
    return `Cancel ${params.interviewTitle} on ${params.scheduledLabel}? An email notification will be sent and the calendar event removed.`;
  }

  return `Cancel ${params.interviewTitle}? An email notification will be sent and the calendar event removed.`;
}
