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
import { type MouseEvent, type ReactNode, useCallback } from 'react';
import { cn } from '@/lib/utils';

import type { ArchivableEntity } from './types';

interface SoftArchiveTableRowProps<T extends ArchivableEntity> {
  entity: T;
  extraCells?: ReactNode;
  archiveDialogOpen: boolean;
  isArchiving: boolean;
  isRestoring: boolean;
  archiveDialogTitle: string;
  archiveDescription: ReactNode;
  onArchive: () => void;
  onArchiveDialogOpenChange: (open: boolean) => void;
  onEdit: (entity: T) => void;
  onRestore: () => void;
}

export function SoftArchiveTableRow<T extends ArchivableEntity>({
  entity,
  extraCells,
  archiveDialogOpen,
  isArchiving,
  isRestoring,
  archiveDialogTitle,
  archiveDescription,
  onArchive,
  onArchiveDialogOpenChange,
  onEdit,
  onRestore,
}: SoftArchiveTableRowProps<T>) {
  const isArchived = entity.isArchived;
  const anyPending = isArchiving || isRestoring;

  const handleEdit = useCallback(() => {
    onEdit(entity);
  }, [entity, onEdit]);

  const openArchiveDialog = useCallback(() => {
    onArchiveDialogOpenChange(true);
  }, [onArchiveDialogOpenChange]);

  const handleRowClick = useCallback(() => {
    if (!isArchived) {
      handleEdit();
    }
  }, [isArchived, handleEdit]);

  const stopRowClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <>
      <TableRow className={cn({ 'cursor-pointer': !isArchived, 'opacity-50': isArchived })} onClick={handleRowClick}>
        <TableCell>
          <span className="text-label-14 truncate block">{entity.label}</span>
        </TableCell>
        {extraCells}
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(entity.updatedAt)}
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
                <DropdownMenuItem onClick={onRestore} disabled={isRestoring}>
                  <ArrowCounterClockwiseIcon />
                  {isRestoring ? 'Restoring...' : 'Restore'}
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
        onOpenChange={onArchiveDialogOpenChange}
        title={archiveDialogTitle}
        description={archiveDescription}
        actionLabel="Archive"
        onConfirm={onArchive}
        isPending={isArchiving}
        pendingLabel="Archiving..."
      />
    </>
  );
}
