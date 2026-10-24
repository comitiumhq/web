import type { JobSummary } from '@comitium/schemas/jobs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { Skeleton } from '@comitium/ui/skeleton';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { useOpenJob } from '@/hooks/mutations/use-open-job';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { canRunJobLifecycleAction } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';
import { CloseJobDialog } from './close-job-dialog';
import { JobStatusBadge } from './job-status-badge';
import { ReopenJobDialog } from './reopen-job-dialog';

interface JobLifecycleMenuProps {
  job: JobSummary;
  orgId: string;
  actionsDisabled?: boolean;
}

export function JobLifecycleMenu({ job, orgId, actionsDisabled = false }: JobLifecycleMenuProps) {
  const { canOnJob, isLoading: isAccessLoading } = useJobPermissions(job.id);
  const { mutate: openJob, isPending: isOpening } = useOpenJob();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);

  if (job.archivedAt) {
    return <JobStatusBadge status={job.status} archived />;
  }

  const isOpenAvailable = canRunJobLifecycleAction(job.lifecycle, 'open_job');
  const isCloseAvailable = canRunJobLifecycleAction(job.lifecycle, 'close_job');
  const isReopenAvailable = canRunJobLifecycleAction(job.lifecycle, 'reopen_as_draft');

  if (isAccessLoading) {
    return <Skeleton className="h-5 w-16 rounded-full" />;
  }

  const canOpen = isOpenAvailable && canOnJob(Permission.JOB_EDIT);
  const canClose = isCloseAvailable && canOnJob(Permission.JOB_CLOSE);
  const canReopen = isReopenAvailable && canOnJob(Permission.JOB_EDIT);

  const handleOpenJob = () => {
    openJob({ orgId, jobId: job.id });
  };

  if (!canOpen && !canClose && !canReopen) {
    return <JobStatusBadge status={job.status} />;
  }

  const openRequirementsMet = Boolean(job.title && job.interviewPlanId);
  const openDisabled = actionsDisabled || !openRequirementsMet || isOpening;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${job.status} job status`}
          >
            <JobStatusBadge status={job.status} />
            <ChevronDownIcon className="size-3 text-muted-foreground" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {canOpen && (
            <DropdownMenuItem disabled={openDisabled} onSelect={handleOpenJob}>
              {isOpening ? 'Opening...' : 'Open job'}
            </DropdownMenuItem>
          )}
          {canClose && (
            <DropdownMenuItem
              variant="destructive"
              disabled={actionsDisabled}
              onSelect={() => setCloseDialogOpen(true)}
            >
              Close job
            </DropdownMenuItem>
          )}
          {canReopen && <DropdownMenuItem onSelect={() => setReopenDialogOpen(true)}>Reopen as Draft</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {canClose && (
        <CloseJobDialog
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          jobId={job.id}
          jobTitle={job.title}
          orgId={orgId}
          expectedVersion={job.version}
          activeApplications={job.lifecycle.activeApplications}
        />
      )}
      {canReopen && (
        <ReopenJobDialog
          open={reopenDialogOpen}
          onOpenChange={setReopenDialogOpen}
          jobId={job.id}
          jobTitle={job.title}
          orgId={orgId}
        />
      )}
    </>
  );
}
