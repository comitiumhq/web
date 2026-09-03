import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { formatDate } from '@comitium/ui/date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { TableCell, TableRow } from '@comitium/ui/table';
import { ArchiveIcon, ArrowCounterClockwiseIcon, DotsThreeIcon, PencilIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { useArchiveCandidateTag, useRestoreCandidateTag } from '@/hooks/mutations/use-candidate-tag';
import type { DecryptedCandidateTag } from '@/lib/schemas/candidate-tags';
import { cn } from '@/lib/utils';

import { TagChip } from './tag-chip';

interface TagTableRowProps {
  orgId: string;
  tag: DecryptedCandidateTag;
  onEdit: (tag: DecryptedCandidateTag) => void;
}

export const TagTableRow = memo(function TagTableRow({ orgId, tag, onEdit }: TagTableRowProps) {
  const { mutate: archive, isPending: isArchiving } = useArchiveCandidateTag();
  const { mutate: restore, isPending: isRestoring } = useRestoreCandidateTag();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const isArchived = tag.isArchived;
  const anyPending = isArchiving || isRestoring;

  const handleEdit = useCallback(() => onEdit(tag), [onEdit, tag]);

  const handleArchive = useCallback(() => {
    archive({ orgId, tagId: tag.id }, { onSuccess: () => setArchiveDialogOpen(false) });
  }, [archive, orgId, tag.id]);

  const handleRestore = useCallback(() => restore({ orgId, tagId: tag.id }), [restore, orgId, tag.id]);

  const openArchiveDialog = useCallback(() => setArchiveDialogOpen(true), []);

  const handleRowClick = useCallback(() => {
    if (!isArchived) {
      handleEdit();
    }
  }, [isArchived, handleEdit]);

  const stopRowClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <>
      <TableRow className={cn({ 'cursor-pointer': !isArchived, 'opacity-50': isArchived })} onClick={handleRowClick}>
        <TableCell>
          <TagChip label={tag.label} />
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(tag.createdAt)}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0" disabled={anyPending} onClick={stopRowClick}>
                <DotsThreeIcon />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]" onClick={stopRowClick}>
              {isArchived ? (
                <DropdownMenuItem onClick={handleRestore} disabled={isRestoring}>
                  <ArrowCounterClockwiseIcon />
                  {isRestoring ? 'Restoring…' : 'Restore'}
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={handleEdit}>
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={openArchiveDialog}>
                    <ArchiveIcon />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive this tag?"
        description={
          <>
            <span className="font-medium">&ldquo;{tag.label}&rdquo;</span> will be hidden from the tag picker. You can
            restore it anytime.
          </>
        }
        actionLabel="Archive"
        onConfirm={handleArchive}
        isPending={isArchiving}
        pendingLabel="Archiving…"
      />
    </>
  );
});
