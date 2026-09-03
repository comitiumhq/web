import type { JobSummary } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { Skeleton } from '@comitium/ui/skeleton';
import { useCallback, useState } from 'react';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { canRunJobLifecycleAction } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';

import { CloseJobDialog } from './close-job-dialog';
import { ReopenJobDialog } from './reopen-job-dialog';
import { UnpublishJobDialog } from './unpublish-job-dialog';

interface JobActionButtonProps {
  job: JobSummary;
  orgId: string;
}

type CommittedJobSummary = JobSummary & { jobId: number };

function hasCommittedIdentity(job: JobSummary): job is CommittedJobSummary {
  return job.jobId !== null && job.jobCommitmentId !== null && job.commitmentContract !== null;
}

export function JobActionButton({ job, orgId }: JobActionButtonProps) {
  const { canOnJob, isLoading: isAccessLoading } = useJobPermissions(job.id);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  const handleOpenUnpublish = useCallback(() => {
    setUnpublishOpen(true);
  }, []);

  const handleOpenClose = useCallback(() => {
    setCloseOpen(true);
  }, []);

  const handleOpenReopen = useCallback(() => {
    setReopenOpen(true);
  }, []);

  const isCommitted = hasCommittedIdentity(job);
  const isUnpublishAvailable = isCommitted && canRunJobLifecycleAction(job.lifecycle, 'unpublish_job');
  const isCommitmentSettlementAvailable = canRunJobLifecycleAction(job.lifecycle, 'settle_commitment');
  const isCloseAvailable = canRunJobLifecycleAction(job.lifecycle, 'close_job') || isCommitmentSettlementAvailable;
  const isReopenAvailable = canRunJobLifecycleAction(job.lifecycle, 'reopen_as_draft');
  const hasAvailableAction = isUnpublishAvailable || isCloseAvailable || isReopenAvailable;

  if (isAccessLoading && hasAvailableAction) {
    return <Skeleton className="h-8 w-24 rounded-4xl" />;
  }

  const canUnpublish = isUnpublishAvailable && canOnJob(Permission.JOB_UNPUBLISH);
  const canClose = isCloseAvailable && canOnJob(Permission.JOB_CLOSE);
  const canReopen = isReopenAvailable && canOnJob(Permission.JOB_EDIT);

  if (!canUnpublish && !canClose && !canReopen) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {canUnpublish && (
          <Button size="sm" variant="outline" onClick={handleOpenUnpublish}>
            Unpublish job
          </Button>
        )}
        {canClose && (
          <Button size="sm" onClick={handleOpenClose}>
            Close job
          </Button>
        )}
        {canReopen && (
          <Button size="sm" onClick={handleOpenReopen}>
            Reopen as Draft
          </Button>
        )}
      </div>

      {canUnpublish && (
        <UnpublishJobDialog
          open={unpublishOpen}
          onOpenChange={setUnpublishOpen}
          jobId={job.id}
          jobOnChainId={job.jobId}
          jobTitle={job.title}
          orgId={orgId}
        />
      )}
      {canClose && (
        <CloseJobDialog
          open={closeOpen}
          onOpenChange={setCloseOpen}
          jobId={job.id}
          jobTitle={job.title}
          orgId={orgId}
          expectedVersion={job.version}
          commitmentSettlementRequired={isCommitmentSettlementAvailable}
          activeApplications={job.lifecycle.activeApplications}
        />
      )}
      {canReopen && (
        <ReopenJobDialog
          open={reopenOpen}
          onOpenChange={setReopenOpen}
          jobId={job.id}
          jobTitle={job.title}
          orgId={orgId}
        />
      )}
    </>
  );
}
