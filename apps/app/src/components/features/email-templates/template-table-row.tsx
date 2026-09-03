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
import { useArchiveEmailTemplate, useRestoreEmailTemplate } from '@/hooks/mutations/use-email-template';
import type { EmailTemplateResponse } from '@/lib/schemas/emails';
import { cn } from '@/lib/utils';
import { StageActivityTemplateUsagePopover } from '../settings-library/stage-activity-template-usage-popover';
import { formatJobAndTemplateArchiveImpact } from '../settings-library/usage-popover';
import { EMAIL_TEMPLATE_USE_CASE_LABELS } from './labels';

interface TemplateTableRowProps {
  orgId: string;
  template: EmailTemplateResponse;
  canManage: boolean;
  onEdit: (template: EmailTemplateResponse) => void;
}

export const TemplateTableRow = memo(function TemplateTableRow({
  orgId,
  template,
  canManage,
  onEdit,
}: TemplateTableRowProps) {
  const { mutate: archiveMutate, isPending: isArchiving } = useArchiveEmailTemplate();
  const { mutate: restoreMutate, isPending: isRestoring } = useRestoreEmailTemplate();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const isArchived = template.isArchived;
  const anyPending = isArchiving || isRestoring;

  const handleEdit = useCallback(() => onEdit(template), [onEdit, template]);

  const handleArchive = useCallback(() => {
    archiveMutate({ orgId, templateId: template.id }, { onSuccess: () => setArchiveDialogOpen(false) });
  }, [orgId, template.id, archiveMutate]);

  const handleRestore = useCallback(() => {
    restoreMutate({ orgId, templateId: template.id });
  }, [orgId, template.id, restoreMutate]);

  const openArchiveDialog = useCallback(() => setArchiveDialogOpen(true), []);

  const handleRowClick = useCallback(() => {
    if (!isArchived) {
      handleEdit();
    }
  }, [isArchived, handleEdit]);

  const stopRowClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const useCaseLabel = EMAIL_TEMPLATE_USE_CASE_LABELS[template.useCase];

  return (
    <>
      <TableRow className={cn({ 'cursor-pointer': !isArchived, 'opacity-50': isArchived })} onClick={handleRowClick}>
        <TableCell className="w-52 max-w-52">
          <span className="text-label-14 truncate block">{template.name}</span>
        </TableCell>
        <TableCell className="max-w-80 text-copy-14 text-muted-foreground">
          <span className="truncate block">{template.subject}</span>
        </TableCell>
        <TableCell className="hidden xl:table-cell">
          <Badge variant="secondary">{useCaseLabel}</Badge>
        </TableCell>
        <TableCell className="w-40">
          <StageActivityTemplateUsagePopover
            kind="email"
            orgId={orgId}
            templateId={template.id}
            templateName={template.name}
            jobCount={template.jobCount}
            jobTemplateCount={template.jobTemplateCount}
          />
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden 2xl:table-cell">
          {formatDate(template.updatedAt)}
        </TableCell>
        <TableCell className="w-12 text-right">
          {canManage && (
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
          )}
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive this template?"
        description={getArchiveDescription(template)}
        actionLabel="Archive"
        onConfirm={handleArchive}
        isPending={isArchiving}
        pendingLabel="Archiving…"
      />
    </>
  );
});

function getArchiveDescription(template: EmailTemplateResponse) {
  const impact = formatJobAndTemplateArchiveImpact(template.jobCount, template.jobTemplateCount);

  return (
    <>
      <span className="font-medium">&ldquo;{template.name}&rdquo;</span> won&apos;t be available for new email
      activities. {impact ?? 'It is not currently used.'} You can restore it anytime.
    </>
  );
}
