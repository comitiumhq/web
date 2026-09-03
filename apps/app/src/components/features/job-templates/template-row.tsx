import { EMPLOYMENT_TYPES } from '@comitium/schemas/job-enums';
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
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  DotsThreeIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
} from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import {
  useActivateJobTemplate,
  useArchiveJobTemplate,
  useDeactivateJobTemplate,
  useRestoreJobTemplate,
} from '@/hooks/mutations/use-job-template-mutations';
import type { JobTemplateListItem } from '@/lib/schemas/job-templates';
import { cn, formatLocation } from '@/lib/utils';

import { TemplateStatusBadge } from './template-status-badge';

interface TemplateRowProps {
  orgId: string;
  template: JobTemplateListItem;
  onEdit: (template: JobTemplateListItem) => void;
}

function getEmploymentTypeLabel(employmentType: string | null) {
  if (!employmentType) {
    return null;
  }

  return EMPLOYMENT_TYPES.find((item) => item.value === employmentType)?.label ?? employmentType;
}

function getTemplateSummary(template: JobTemplateListItem) {
  const items = [getEmploymentTypeLabel(template.employmentType), formatLocation(template.location)].filter(Boolean);

  if (items.length === 0) {
    return 'No defaults set';
  }

  return items.join(' · ');
}

export const TemplateRow = memo(function TemplateRow({ orgId, template, onEdit }: TemplateRowProps) {
  const { mutate: activate, isPending: isActivating } = useActivateJobTemplate();
  const { mutate: deactivate, isPending: isDeactivating } = useDeactivateJobTemplate();
  const { mutate: archive, isPending: isArchiving } = useArchiveJobTemplate();
  const { mutate: restore, isPending: isRestoring } = useRestoreJobTemplate();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const anyPending = isActivating || isDeactivating || isArchiving || isRestoring;

  const isArchived = template.status === 'archived';
  const isActive = template.status === 'active';
  const isInactive = template.status === 'inactive';

  const canEdit = !isArchived;

  const handleEdit = useCallback(() => {
    onEdit(template);
  }, [onEdit, template]);

  const handleActivate = useCallback(() => {
    activate({ orgId, templateId: template.id });
  }, [orgId, template.id, activate]);

  const handleDeactivate = useCallback(() => {
    deactivate({ orgId, templateId: template.id });
  }, [orgId, template.id, deactivate]);

  const handleArchive = useCallback(() => {
    archive({ orgId, templateId: template.id });
    setArchiveDialogOpen(false);
  }, [orgId, template.id, archive]);

  const handleRestore = useCallback(() => {
    restore({ orgId, templateId: template.id });
  }, [orgId, template.id, restore]);

  const openArchiveDialog = useCallback(() => {
    setArchiveDialogOpen(true);
  }, []);

  const handleRowClick = useCallback(() => {
    if (canEdit) {
      handleEdit();
    }
  }, [canEdit, handleEdit]);

  const stopRowClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <>
      <TableRow className={cn({ 'cursor-pointer': !isArchived, 'opacity-60': isArchived })} onClick={handleRowClick}>
        <TableCell>
          <div className="flex flex-col gap-0.5">
            <span className="text-label-14">{template.title}</span>
            <span className="text-copy-13 text-muted-foreground">{getTemplateSummary(template)}</span>
          </div>
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {template.departmentName ?? 'Any team'}
        </TableCell>
        <TableCell>
          <TemplateStatusBadge status={template.status} />
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(template.updatedAt)}
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
              {canEdit && (
                <DropdownMenuItem className="h-8 text-label-13" onClick={handleEdit}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
              )}
              {isInactive && (
                <DropdownMenuItem className="h-8 text-label-13" onClick={handleActivate}>
                  <EyeIcon />
                  Activate
                </DropdownMenuItem>
              )}
              {isActive && (
                <DropdownMenuItem className="h-8 text-label-13" onClick={handleDeactivate}>
                  <EyeSlashIcon />
                  Deactivate
                </DropdownMenuItem>
              )}
              {!isArchived && <DropdownMenuSeparator />}
              {!isArchived && (
                <DropdownMenuItem
                  className="h-8 text-label-13 text-destructive focus:text-destructive"
                  onClick={openArchiveDialog}
                >
                  <ArchiveIcon />
                  Archive
                </DropdownMenuItem>
              )}
              {isArchived && (
                <DropdownMenuItem className="h-8 text-label-13" onClick={handleRestore}>
                  <ArrowCounterClockwiseIcon />
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive this job template?"
        description={
          <>
            <span className="font-medium">&ldquo;{template.title}&rdquo;</span> will no longer be available when
            creating jobs from a template. You can restore it anytime.
          </>
        }
        actionLabel="Archive"
        onConfirm={handleArchive}
      />
    </>
  );
});
