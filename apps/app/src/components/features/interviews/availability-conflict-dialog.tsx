import { isRecord } from '@comitium/schemas/guards';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { isApiError } from '@/lib/api/client';
import type { SelectedInterviewer } from './types';

const DEFAULT_DESCRIPTION =
  'This time conflicts with interviewer availability. Continue only if you have confirmed the time with everyone.';

export function getAvailabilityConflictDescription(
  error: unknown,
  interviewers: readonly SelectedInterviewer[],
): string {
  if (!isApiError(error)) {
    return DEFAULT_DESCRIPTION;
  }

  const conflicts = error.details?.conflicts;

  if (!Array.isArray(conflicts)) {
    return DEFAULT_DESCRIPTION;
  }

  const namesByUserId = new Map(
    interviewers.map((interviewer) => [interviewer.userId, getMemberDisplayName(interviewer.member)]),
  );
  const diagnostics = new Set(
    conflicts.flatMap((conflict) => {
      if (!isRecord(conflict) || !('reason' in conflict) || !('userId' in conflict)) {
        return [];
      }

      const userId = typeof conflict.userId === 'string' ? conflict.userId : null;
      const interviewerName = userId ? namesByUserId.get(userId) : null;
      const label = interviewerName ?? 'Organizer';
      const reason = conflict.reason === 'busy' ? 'calendar conflict' : 'outside working hours';

      return [`${label}: ${reason}`];
    }),
  );

  if (diagnostics.size === 0) {
    return DEFAULT_DESCRIPTION;
  }

  return `${[...diagnostics].join('; ')}. Continue only if you have confirmed the time with everyone.`;
}

interface AvailabilityConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  actionLabel: string;
  description: string;
}

export function AvailabilityConflictDialog({
  open,
  onOpenChange,
  onConfirm,
  actionLabel,
  description,
}: AvailabilityConflictDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule outside availability?"
      description={description}
      actionLabel={actionLabel}
      actionVariant="default"
      cancelLabel="Go back"
      onConfirm={onConfirm}
    />
  );
}
