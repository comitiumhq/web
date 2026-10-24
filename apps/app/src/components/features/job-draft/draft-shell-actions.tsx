import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { useNavigate } from '@tanstack/react-router';
import { ArchiveIcon, CopyIcon, EllipsisVerticalIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useCreateDraft } from '@/hooks/mutations/use-create-draft';
import { useArchiveJob } from '@/hooks/mutations/use-job-archive-mutations';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@/lib/schemas/org';
import { AutosaveStatus } from '../editor-autosave/autosave-status';
import { useDraftFormContext } from './draft-form-context';

function getDuplicateLabel(isDuplicating: boolean) {
  return isDuplicating ? 'Duplicating...' : 'Duplicate';
}

export function DraftShellActions() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { orgId, jobId, draft, isDirty, isSaving, autosave } = useDraftFormContext();
  const { canOnJob } = useJobPermissions(jobId);
  const { mutate: createDraft, isPending: isDuplicating } = useCreateDraft(orgId);
  const { mutate: archiveJob, isPending: isArchiving } = useArchiveJob();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const canDuplicate = can(Permission.JOB_CREATE);
  const canArchive = canOnJob(Permission.JOB_EDIT);
  const draftTitle = draft?.title ?? 'Draft';

  const handleDuplicate = useCallback(() => {
    createDraft({ sourceJobId: jobId });
  }, [createDraft, jobId]);

  const handleOpenArchiveDialog = useCallback(() => {
    setArchiveDialogOpen(true);
  }, []);

  const handleArchive = useCallback(() => {
    setArchiveDialogOpen(false);
    archiveJob(
      { orgId, jobId },
      {
        onSuccess: () => {
          navigate({ to: '/org/$orgId/jobs', params: { orgId }, search: { status: 'all' } });
        },
      },
    );
  }, [archiveJob, jobId, navigate, orgId]);

  const duplicateLabel = getDuplicateLabel(isDuplicating);
  const actionsDisabled = !draft || isSaving;

  return (
    <>
      <AutosaveStatus autosave={autosave} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={actionsDisabled}>
            <EllipsisVerticalIcon />
            <span className="sr-only">More draft actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {canDuplicate && (
              <DropdownMenuItem disabled={isDirty || isDuplicating} onSelect={handleDuplicate}>
                <CopyIcon />
                {duplicateLabel}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" disabled={isDirty} onSelect={handleOpenArchiveDialog}>
                  <ArchiveIcon />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive job"
        description={
          <>
            Archive <span className="font-medium">&ldquo;{draftTitle}&rdquo;</span>? You can restore it later.
          </>
        }
        actionLabel="Archive"
        pendingLabel="Archiving..."
        onConfirm={handleArchive}
        isPending={isArchiving}
      />
    </>
  );
}
