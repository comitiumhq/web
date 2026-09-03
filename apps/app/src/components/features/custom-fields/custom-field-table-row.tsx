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
import { useSortable } from '@dnd-kit/react/sortable';
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  LockIcon,
  PencilIcon,
} from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { useArchiveCustomField, useRestoreCustomField } from '@/hooks/mutations/use-custom-field';
import type { CustomFieldRow } from '@/lib/schemas/custom-fields';
import { cn } from '@/lib/utils';

import { getFieldTypeLabel } from './labels';

interface CustomFieldTableRowProps {
  orgId: string;
  field: CustomFieldRow;
  index: number;
  canReorder: boolean;
  onEdit: (field: CustomFieldRow) => void;
}

export const CustomFieldTableRow = memo(function CustomFieldTableRow({
  orgId,
  field,
  index,
  canReorder,
  onEdit,
}: CustomFieldTableRowProps) {
  const { mutate: archive, isPending: isArchiving } = useArchiveCustomField();
  const { mutate: restore, isPending: isRestoring } = useRestoreCustomField();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const isArchived = field.isArchived;
  const anyPending = isArchiving || isRestoring;

  const { ref: rowRef, isDragging } = useSortable({
    id: field.id,
    index,
    type: 'custom-field',
    disabled: !canReorder,
  });

  const handleEdit = useCallback(() => onEdit(field), [onEdit, field]);

  const handleArchive = useCallback(() => {
    archive({ orgId, id: field.id }, { onSuccess: () => setArchiveDialogOpen(false) });
  }, [archive, orgId, field.id]);

  const handleRestore = useCallback(() => restore({ orgId, id: field.id }), [restore, orgId, field.id]);

  const openArchiveDialog = useCallback(() => setArchiveDialogOpen(true), []);

  const handleRowClick = useCallback(() => {
    if (!isArchived) {
      handleEdit();
    }
  }, [isArchived, handleEdit]);

  const stopRowClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <>
      <TableRow
        ref={rowRef}
        className={cn({
          'cursor-pointer': !isArchived,
          'opacity-40': isDragging,
          'opacity-50': isArchived,
        })}
        onClick={handleRowClick}
      >
        <TableCell className="w-8 p-0 pl-3">
          {canReorder && (
            <span
              className="inline-flex h-8 w-6 items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing"
              onClick={stopRowClick}
            >
              <DotsSixVerticalIcon className="size-4" />
            </span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-label-14 truncate">{field.title}</span>
            {field.isPrivate && <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </div>
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground">{getFieldTypeLabel(field.fieldType)}</TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(field.updatedAt)}
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
        title="Archive this custom field?"
        description={
          <>
            <span className="font-medium">&ldquo;{field.title}&rdquo;</span> will be hidden from candidate views. Past
            values are kept and become visible again on restore.
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
