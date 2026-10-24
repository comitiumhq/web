import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDeleteFeedbackSubmission } from '@/hooks/mutations/use-feedback-submission';
import { isDefined } from '@/lib/utils';

interface SubmissionActionsProps {
  applicationId: string | null;
  submissionId: string;
  onEdit: (() => void) | null;
}

export function SubmissionActions({ applicationId, submissionId, onEdit }: SubmissionActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { mutate: deleteSubmission, isPending: isDeleting } = useDeleteFeedbackSubmission();

  const handleEditClick = useCallback(() => {
    setMenuOpen(false);

    onEdit?.();
  }, [onEdit]);

  const handleDeleteRequest = useCallback(() => {
    setMenuOpen(false);

    setDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!isDefined(applicationId)) {
      return;
    }

    deleteSubmission({ applicationId, submissionId }, { onSuccess: () => setDeleteOpen(false) });
  }, [applicationId, submissionId, deleteSubmission]);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={isDeleting}
            aria-label="Feedback actions"
          >
            <EllipsisVerticalIcon strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isDefined(onEdit) && (
            <DropdownMenuItem onClick={handleEditClick}>
              <PencilIcon />
              Edit feedback
            </DropdownMenuItem>
          )}
          {isDefined(applicationId) && (
            <DropdownMenuItem onClick={handleDeleteRequest} variant="destructive">
              <TrashIcon />
              Delete feedback
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
}
