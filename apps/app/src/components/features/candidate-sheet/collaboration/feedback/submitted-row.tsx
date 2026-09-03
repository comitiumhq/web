import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { formatRelativeTime } from '@comitium/ui/date';
import { getMemberDisplayName, type MemberDisplayIdentity } from '@comitium/ui/display-name';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { CaretDownIcon, CaretUpIcon, DotsThreeVerticalIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { useDeleteFeedbackSubmission } from '@/hooks/mutations/use-feedback-submission';
import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';

import type { DecryptedEntry } from './types';
import { EntryBody } from './values-view';

interface SubmittedRowProps {
  submission: FeedbackSubmission;
  identity: MemberDisplayIdentity;
  entry: DecryptedEntry;
  applicationId: string | null;
  orgId: string;
  isOwn: boolean;
  onEdit: (() => void) | null;
}

export const SubmittedRow = memo(function SubmittedRow({
  submission,
  identity,
  entry,
  applicationId,
  orgId,
  isOwn,
  onEdit,
}: SubmittedRowProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { mutate: deleteSubmission, isPending: isDeleting } = useDeleteFeedbackSubmission();

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleEditClick = useCallback(() => {
    setMenuOpen(false);
    onEdit?.();
  }, [onEdit]);

  const handleDeleteRequest = useCallback(() => {
    setMenuOpen(false);
    setDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!applicationId) {
      return;
    }

    deleteSubmission({ applicationId, submissionId: submission.id }, { onSuccess: () => setDeleteOpen(false) });
  }, [applicationId, submission.id, deleteSubmission]);

  const canEdit = isOwn && onEdit !== null;
  const canDelete = isOwn && !!applicationId;
  const hasMenu = canEdit || canDelete;
  const ChevronGlyph = open ? CaretUpIcon : CaretDownIcon;

  return (
    <>
      <div className="flex items-center gap-1 px-4 py-2.5">
        <InitialsAvatar identity={identity} size="sm" className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-label-13 font-medium truncate">{getMemberDisplayName(identity)}</p>
          <p className="text-label-12 text-muted-foreground">{formatRelativeTime(submission.submittedAt)}</p>
        </div>

        {hasMenu && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                disabled={isDeleting}
                aria-label="Feedback actions"
              >
                <DotsThreeVerticalIcon weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={handleEditClick}>
                  <PencilIcon />
                  Edit feedback
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem onClick={handleDeleteRequest} variant="destructive">
                  <TrashIcon />
                  Delete feedback
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={open}
          aria-label={open ? 'Collapse feedback' : 'Expand feedback'}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronGlyph className="size-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-muted px-4 pb-3 pt-1">
          <EntryBody
            entry={entry}
            snapshot={submission.formSnapshot}
            canReadPrivate={submission.canReadPrivate}
            orgId={orgId}
          />
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete feedback?"
        description="Your submission will be removed from this candidate's record. You can submit fresh feedback afterwards."
        actionLabel="Delete"
        pendingLabel="Deleting…"
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </>
  );
});
