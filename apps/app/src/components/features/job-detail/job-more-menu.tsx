import type { JobSummary } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { ArchiveIcon, ArrowCounterClockwiseIcon, CopyIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useCreateDraft } from '@/hooks/mutations/use-create-draft';
import { useArchiveJob, useRestoreJob } from '@/hooks/mutations/use-job-archive-mutations';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@/lib/schemas/org';

interface JobMoreMenuProps {
  job: JobSummary;
  orgId: string;
}

export function JobMoreMenu({ job, orgId }: JobMoreMenuProps) {
  const { can } = usePermissions();
  const { canOnJob } = useJobPermissions(job.id);
  const { mutate: createDraft, isPending: isDuplicating } = useCreateDraft(orgId);
  const archiveJob = useArchiveJob();
  const restoreJob = useRestoreJob();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const canDuplicate = can(Permission.JOB_CREATE);
  const canEdit = canOnJob(Permission.JOB_EDIT);
  const canArchive = canEdit && !job.archivedAt && job.status !== 'open';
  const canRestore = canEdit && Boolean(job.archivedAt);
  const handleDuplicate = useCallback(() => {
    createDraft({ sourceJobId: job.id });
  }, [createDraft, job.id]);

  const handleRestore = useCallback(() => {
    restoreJob.mutate({ orgId, jobId: job.id });
  }, [job.id, orgId, restoreJob]);

  const handleArchive = useCallback(() => {
    archiveJob.mutate(
      { orgId, jobId: job.id },
      {
        onSuccess: () => setArchiveDialogOpen(false),
      },
    );
  }, [archiveJob, job.id, orgId]);

  if (!canDuplicate && !canArchive && !canRestore) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0">
            <DotsThreeVerticalIcon />
            <span className="sr-only">Job actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canDuplicate && (
            <DropdownMenuItem disabled={isDuplicating} onSelect={handleDuplicate}>
              <CopyIcon />
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </DropdownMenuItem>
          )}
          {canArchive && (
            <DropdownMenuItem variant="destructive" onSelect={() => setArchiveDialogOpen(true)}>
              <ArchiveIcon />
              Archive
            </DropdownMenuItem>
          )}
          {canRestore && (
            <DropdownMenuItem disabled={restoreJob.isPending} onSelect={handleRestore}>
              <ArrowCounterClockwiseIcon />
              {restoreJob.isPending ? 'Restoring...' : 'Restore'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive job"
        description="The Job will leave active lists. Its candidates and Pipeline history will be preserved."
        actionLabel="Archive"
        pendingLabel="Archiving..."
        onConfirm={handleArchive}
        isPending={archiveJob.isPending}
      />
    </>
  );
}
