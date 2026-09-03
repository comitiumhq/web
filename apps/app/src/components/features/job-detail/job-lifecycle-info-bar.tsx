import type { JobLifecycle, JobStatus } from '@comitium/schemas/public-jobs';
import { Alert } from '@comitium/ui/alert';
import { InfoIcon } from '@phosphor-icons/react';

interface JobLifecycleInfoBarProps {
  status: JobStatus;
  lifecycle: JobLifecycle;
}

function getLifecycleMessage(status: JobStatus, lifecycle: JobLifecycle): string | null {
  if (status === 'open' && lifecycle.commitmentFinalizationPending) {
    return 'The public posting has ended. Finalization is still in progress; the pipeline remains available.';
  }

  return null;
}

export function JobLifecycleInfoBar({ status, lifecycle }: JobLifecycleInfoBarProps) {
  const message = getLifecycleMessage(status, lifecycle);

  if (!message) {
    return null;
  }

  return (
    <Alert variant="info" className="mx-4 mt-3 flex items-center gap-2 sm:mx-6">
      <InfoIcon className="size-4 shrink-0" />
      <span>{message}</span>
    </Alert>
  );
}
