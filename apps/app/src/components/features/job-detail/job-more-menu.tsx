import { EXPLORER_TX_URL } from '@comitium/chain/network';
import type { JobSummary } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { ArrowSquareOutIcon, CopyIcon, CubeIcon, DotsThreeVerticalIcon, PencilIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useCreateDraft } from '@/hooks/mutations/use-create-draft';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@/lib/schemas/org';

import { EditJobDescriptionDialog } from './edit-job-description-dialog';

interface JobMoreMenuProps {
  job: JobSummary;
  orgId: string;
}

export function JobMoreMenu({ job, orgId }: JobMoreMenuProps) {
  const { can } = usePermissions();
  const { canOnJob } = useJobPermissions(job.id);
  const { mutate: createDraft, isPending: isDuplicating } = useCreateDraft(orgId);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const hasPublishedPosting = job.postingStatus === 'published';
  const canEditDescription =
    hasPublishedPosting && job.commitmentStatus === 'published' && canOnJob(Permission.JOB_EDIT);

  const handleDuplicate = useCallback(() => {
    createDraft({ sourceJobId: job.id });
  }, [createDraft, job.id]);

  const openDescriptionDialog = useCallback(() => {
    setDescriptionDialogOpen(true);
  }, []);

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
          {hasPublishedPosting && job.canonicalUrl && (
            <DropdownMenuItem asChild>
              <a href={job.canonicalUrl} target="_blank" rel="noopener noreferrer">
                <ArrowSquareOutIcon />
                View public posting
              </a>
            </DropdownMenuItem>
          )}
          {canEditDescription && (
            <DropdownMenuItem onSelect={openDescriptionDialog}>
              <PencilIcon />
              Edit description
            </DropdownMenuItem>
          )}
          {job.txHash && (
            <DropdownMenuItem asChild>
              <a href={`${EXPLORER_TX_URL}${job.txHash}`} target="_blank" rel="noopener noreferrer">
                <CubeIcon />
                View in explorer
              </a>
            </DropdownMenuItem>
          )}
          {can(Permission.JOB_CREATE) && (
            <DropdownMenuItem disabled={isDuplicating} onSelect={handleDuplicate}>
              <CopyIcon />
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditJobDescriptionDialog
        job={job}
        orgId={orgId}
        open={descriptionDialogOpen}
        onOpenChange={setDescriptionDialogOpen}
      />
    </>
  );
}
