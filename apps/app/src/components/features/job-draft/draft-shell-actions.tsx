import type { JobLifecycle } from '@comitium/schemas/public-jobs';
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
import { CopyIcon, DotsThreeVerticalIcon, EyeIcon, TrashIcon } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useCreateDraft } from '@/hooks/mutations/use-create-draft';
import { useDeleteDraft } from '@/hooks/mutations/use-delete-draft';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { usePermissions } from '@/hooks/use-permissions';
import { canRunJobLifecycleAction, isJobPublishing } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';
import { useDraftFormContext } from './draft-form-context';
import { DraftPreviewDialog } from './draft-preview-dialog';
import { PublishJobDialog } from './publish-job-dialog';

function getDuplicateLabel(isDuplicating: boolean) {
  return isDuplicating ? 'Duplicating...' : 'Duplicate';
}

interface DraftShellActionsProps {
  lifecycle: JobLifecycle;
}

export function DraftShellActions({ lifecycle }: DraftShellActionsProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const {
    orgId,
    jobId,
    draft,
    isDirty,
    isSaving,
    save,
    descriptionMarkdown,
    previewOpen,
    publishOpen,
    publishVersion,
    setPreviewOpen,
    setPublishOpen,
    handlePreviewClick,
    handlePublishClick,
  } = useDraftFormContext();
  const { canOnJob } = useJobPermissions(jobId);
  const { mutate: createDraft, isPending: isDuplicating } = useCreateDraft(orgId);
  const { mutate: deleteDraftMutate, isPending: isDeleting } = useDeleteDraft(orgId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canDuplicate = can(Permission.JOB_CREATE);
  const isPublishing = isJobPublishing(lifecycle);
  const canDelete = canOnJob(Permission.JOB_EDIT) && !isPublishing;
  const canPublish =
    canOnJob(Permission.JOB_EDIT) &&
    canOnJob(Permission.JOB_PUBLISH) &&
    canRunJobLifecycleAction(lifecycle, 'publish_job');
  const draftTitle = draft?.title ?? 'Draft';

  const handleDuplicate = useCallback(() => {
    createDraft({ sourceJobId: jobId });
  }, [createDraft, jobId]);

  const handleOpenDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    deleteDraftMutate(jobId, {
      onSuccess: () => {
        navigate({ to: '/org/$orgId/jobs', params: { orgId }, search: { status: 'all' } });
      },
    });
  }, [deleteDraftMutate, jobId, navigate, orgId]);

  const duplicateLabel = getDuplicateLabel(isDuplicating);
  const actionsDisabled = !draft || isPublishing || isSaving;

  return (
    <>
      <Button variant="outline" size="sm" onClick={save} disabled={!isDirty || actionsDisabled}>
        {isSaving ? 'Saving...' : 'Save changes'}
      </Button>

      {canPublish && (
        <Button size="sm" onClick={handlePublishClick} disabled={actionsDisabled || isDirty}>
          Publish
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={actionsDisabled}>
            <DotsThreeVerticalIcon />
            <span className="sr-only">More draft actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={isDirty} onSelect={handlePreviewClick}>
              <EyeIcon />
              Preview
            </DropdownMenuItem>
            {canDuplicate && (
              <DropdownMenuItem disabled={isDirty || isDuplicating} onSelect={handleDuplicate}>
                <CopyIcon />
                {duplicateLabel}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" disabled={isDirty} onSelect={handleOpenDeleteDialog}>
                  <TrashIcon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete draft"
        description={
          <>
            Permanently delete <span className="font-medium">&ldquo;{draftTitle}&rdquo;</span>? This cannot be undone.
          </>
        }
        actionLabel="Delete"
        pendingLabel="Deleting..."
        onConfirm={handleDelete}
        isPending={isDeleting}
      />

      {draft && (
        <>
          <DraftPreviewDialog
            orgId={orgId}
            draft={draft}
            descriptionMarkdown={descriptionMarkdown}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
          />

          {publishVersion !== null && (
            <PublishJobDialog
              orgId={orgId}
              jobId={jobId}
              draftTitle={draft.title}
              draft={draft}
              expectedVersion={publishVersion}
              descriptionMarkdown={descriptionMarkdown}
              open={publishOpen}
              onOpenChange={setPublishOpen}
            />
          )}
        </>
      )}
    </>
  );
}
