import { Badge } from '@comitium/ui/badge';
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
import {
  useArchiveCancelRescheduleReason,
  useRestoreCancelRescheduleReason,
} from '@/hooks/mutations/use-cancel-reschedule-reason';
import type { ReasonRow } from '@/lib/schemas/cancel-reschedule-reasons';
import { cn } from '@/lib/utils';

import { REASON_APPLIES_TO_LABELS, REASON_CATEGORY_LABELS } from './labels';

interface ReasonTableRowProps {
  orgId: string;
  reason: ReasonRow;
  onEdit: (reason: ReasonRow) => void;
}

export const ReasonTableRow = memo(function ReasonTableRow({ orgId, reason, onEdit }: ReasonTableRowProps) {
  const { mutate: archive, isPending: isArchiving } = useArchiveCancelRescheduleReason();
  const { mutate: restore, isPending: isRestoring } = useRestoreCancelRescheduleReason();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const isArchived = reason.isArchived;
  const anyPending = isArchiving || isRestoring;

  const handleEdit = useCallback(() => onEdit(reason), [onEdit, reason]);

  const handleArchive = useCallback(() => {
    archive({ orgId, id: reason.id }, { onSuccess: () => setArchiveDialogOpen(false) });
  }, [archive, orgId, reason.id]);

  const handleRestore = useCallback(() => restore({ orgId, id: reason.id }), [restore, orgId, reason.id]);

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
          <span className="text-label-14 truncate block">{reason.label}</span>
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground">{REASON_CATEGORY_LABELS[reason.category]}</TableCell>
        <TableCell>
          <Badge variant="secondary">{REASON_APPLIES_TO_LABELS[reason.appliesTo]}</Badge>
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(reason.updatedAt)}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={anyPending} onClick={stopRowClick}>
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
        title="Archive this reason?"
        description={
          <>
            <span className="font-medium">&ldquo;{reason.label}&rdquo;</span> will be hidden from cancel and reschedule
            dialogs. Past entries keep their snapshot. You can restore it anytime.
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
