import type { JobSummary } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { ArrowSquareOutIcon, CopyIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { useCreateDraft } from '@/hooks/mutations/use-create-draft';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@/lib/schemas/org';

interface JobMoreMenuProps {
  job: JobSummary;
  orgId: string;
}

export function JobMoreMenu({ job, orgId }: JobMoreMenuProps) {
  const { can } = usePermissions();
  const { mutate: createDraft, isPending: isDuplicating } = useCreateDraft(orgId);
  const hasPublishedPosting = job.postingStatus === 'published';

  const handleDuplicate = useCallback(() => {
    createDraft({ sourceJobId: job.id });
  }, [createDraft, job.id]);

  return (
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
        {can(Permission.JOB_CREATE) && (
          <DropdownMenuItem disabled={isDuplicating} onSelect={handleDuplicate}>
            <CopyIcon />
            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
