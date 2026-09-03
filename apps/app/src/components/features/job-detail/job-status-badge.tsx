import type { JobStatus } from '@comitium/schemas/public-jobs';
import { StatusBadge, type StatusBadgeProps } from '@comitium/ui/status-badge';

const JOB_STATUS_DISPLAY = {
  draft: { label: 'Draft', variant: 'secondary' },
  open: { label: 'Open', variant: 'success' },
  closed: { label: 'Closed', variant: 'secondary' },
} satisfies Record<JobStatus, StatusBadgeProps>;

interface JobStatusBadgeProps {
  status: JobStatus;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return <StatusBadge {...JOB_STATUS_DISPLAY[status]} />;
}
