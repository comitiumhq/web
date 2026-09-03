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
import { useArchiveOrgDepartment, useRestoreOrgDepartment } from '@/hooks/mutations/use-org-structure';
import type { OrgDepartment } from '@/lib/schemas/org-structure';
import { cn } from '@/lib/utils';

interface DepartmentRowProps {
  orgId: string;
  department: OrgDepartment;
  parentName: string | null;
  onEdit: (department: OrgDepartment) => void;
}

export const DepartmentRow = memo(function DepartmentRow({
  orgId,
  department,
  parentName,
  onEdit,
}: DepartmentRowProps) {
  const { mutate: archiveDepartment, isPending: isArchiving } = useArchiveOrgDepartment();
  const { mutate: restoreDepartment, isPending: isRestoring } = useRestoreOrgDepartment();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const anyPending = isArchiving || isRestoring;
  const handleEdit = useCallback(() => onEdit(department), [department, onEdit]);
  const handleRestore = useCallback(
    () => restoreDepartment({ orgId, id: department.id }),
    [department.id, orgId, restoreDepartment],
  );
  const handleArchive = useCallback(() => {
    archiveDepartment({ orgId, id: department.id }, { onSuccess: () => setArchiveDialogOpen(false) });
  }, [archiveDepartment, department.id, orgId]);
  const handleOpenArchiveDialog = useCallback(() => setArchiveDialogOpen(true), []);
  const stopClickPropagation = useCallback((event: React.MouseEvent) => event.stopPropagation(), []);
  const handleRowClick = useCallback(() => {
    if (!department.isArchived) {
      handleEdit();
    }
  }, [department.isArchived, handleEdit]);

  return (
    <>
      <TableRow
        className={cn({ 'cursor-pointer': !department.isArchived, 'opacity-50': department.isArchived })}
        onClick={handleRowClick}
      >
        <TableCell>
          <div className="min-w-0">
            <span className="text-label-14 truncate block">{department.name}</span>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {parentName ? (
            <span className="text-label-14">{parentName}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(department.updatedAt)}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                disabled={anyPending}
                onClick={stopClickPropagation}
              >
                <DotsThreeIcon />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]" onClick={stopClickPropagation}>
              {department.isArchived ? (
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
                  <DropdownMenuItem variant="destructive" onClick={handleOpenArchiveDialog}>
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
        title="Archive this department?"
        description={
          <>
            <span className="font-medium">&ldquo;{department.name}&rdquo;</span> will be hidden from new job selectors.
            Existing jobs keep their department reference.
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
