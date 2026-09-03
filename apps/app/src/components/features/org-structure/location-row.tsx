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
import { type MouseEvent, memo, useCallback, useState } from 'react';
import { useArchiveOrgLocation, useRestoreOrgLocation } from '@/hooks/mutations/use-org-structure';
import type { OrgLocation } from '@/lib/schemas/org-structure';
import { cn } from '@/lib/utils';

import { LOCATION_TYPE_LABELS } from './labels';

interface LocationRowProps {
  orgId: string;
  location: OrgLocation;
  onEdit: (location: OrgLocation) => void;
}

function formatAddress(location: OrgLocation) {
  const parts = [location.addressLocality, location.addressRegion, location.addressCountry].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No address';
}

export const LocationRow = memo(function LocationRow({ orgId, location, onEdit }: LocationRowProps) {
  const { mutate: archiveLocation, isPending: isArchiving } = useArchiveOrgLocation();
  const { mutate: restoreLocation, isPending: isRestoring } = useRestoreOrgLocation();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const anyPending = isArchiving || isRestoring;
  const handleEdit = useCallback(() => onEdit(location), [location, onEdit]);
  const handleArchive = useCallback(() => {
    archiveLocation({ orgId, id: location.id }, { onSuccess: () => setArchiveDialogOpen(false) });
  }, [archiveLocation, location.id, orgId]);
  const stopRowClick = useCallback((event: MouseEvent<HTMLElement>) => event.stopPropagation(), []);
  const handleRestore = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      restoreLocation({ orgId, id: location.id });
    },
    [location.id, orgId, restoreLocation],
  );
  const handleEditMenuItemClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      handleEdit();
    },
    [handleEdit],
  );
  const handleOpenArchiveDialog = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setArchiveDialogOpen(true);
  }, []);
  const handleRowClick = useCallback(() => {
    if (!location.isArchived) {
      handleEdit();
    }
  }, [handleEdit, location.isArchived]);

  return (
    <>
      <TableRow
        className={cn({ 'cursor-pointer': !location.isArchived, 'opacity-50': location.isArchived })}
        onClick={handleRowClick}
      >
        <TableCell>
          <div className="min-w-0">
            <span className="text-label-14 truncate block">{location.name}</span>
            <span className="text-copy-13 text-muted-foreground truncate block">{formatAddress(location)}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{LOCATION_TYPE_LABELS[location.locationType]}</Badge>
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(location.updatedAt)}
        </TableCell>
        <TableCell className="text-right" onClick={stopRowClick}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0" disabled={anyPending} onClick={stopRowClick}>
                <DotsThreeIcon />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {location.isArchived ? (
                <DropdownMenuItem onClick={handleRestore} disabled={isRestoring}>
                  <ArrowCounterClockwiseIcon />
                  {isRestoring ? 'Restoring…' : 'Restore'}
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={handleEditMenuItemClick}>
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
        title="Archive this location?"
        description={
          <>
            <span className="font-medium">&ldquo;{location.name}&rdquo;</span> will be hidden from new job selectors.
            Existing jobs keep their location reference.
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
