import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
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
  useArchiveInterviewTemplate,
  useRestoreInterviewTemplate,
} from '@/hooks/mutations/use-interview-template-mutations';
import type { InterviewTemplate } from '@/lib/schemas/interview-templates';
import { cn } from '@/lib/utils';
import { StageActivityTemplateUsagePopover } from '../settings-library/stage-activity-template-usage-popover';
import { formatJobAndTemplateArchiveImpact } from '../settings-library/usage-popover';

interface TemplateRowProps {
  orgId: string;
  template: InterviewTemplate;
  onEdit: (template: InterviewTemplate) => void;
}

export const TemplateRow = memo(function TemplateRow({ orgId, template, onEdit }: TemplateRowProps) {
  const { mutate: archiveMutate, isPending: isArchiving } = useArchiveInterviewTemplate();
  const { mutate: restoreMutate, isPending: isRestoring } = useRestoreInterviewTemplate();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const anyPending = isArchiving || isRestoring;

  const canEdit = !template.isArchived;
  const canArchive = !template.isArchived;
  const canRestore = template.isArchived;
  const showSeparator = canEdit && (canArchive || canRestore);

  const handleEdit = useCallback(() => {
    onEdit(template);
  }, [onEdit, template]);

  const handleArchive = useCallback(() => {
    archiveMutate({ orgId, id: template.id });
    setArchiveDialogOpen(false);
  }, [orgId, template.id, archiveMutate]);

  const handleRestore = useCallback(() => {
    restoreMutate({ orgId, id: template.id });
  }, [orgId, template.id, restoreMutate]);

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
      <TableRow
        className={cn({ 'cursor-pointer': !template.isArchived, 'opacity-50': template.isArchived })}
        onClick={handleRowClick}
      >
        <TableCell>
          <span className="text-label-14">{template.title}</span>
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {template.externalTitle ?? '—'}
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground tabular-nums">
          {template.durationMinutes} min
        </TableCell>
        <TableCell>
          <StageActivityTemplateUsagePopover
            kind="interview"
            orgId={orgId}
            templateId={template.id}
            templateName={template.title}
            jobCount={template.jobCount}
            jobTemplateCount={template.jobTemplateCount}
          />
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
              {canEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
              )}
              {showSeparator && <DropdownMenuSeparator />}
              {canArchive && (
                <DropdownMenuItem variant="destructive" onClick={openArchiveDialog}>
                  <ArchiveIcon />
                  Archive
                </DropdownMenuItem>
              )}
              {canRestore && (
                <DropdownMenuItem onClick={handleRestore}>
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
        title="Archive this interview template?"
        description={getArchiveDescription(template)}
        actionLabel="Archive"
        onConfirm={handleArchive}
      />
    </>
  );
});

function getArchiveDescription(template: InterviewTemplate) {
  const impact = formatJobAndTemplateArchiveImpact(template.jobCount, template.jobTemplateCount);

  return (
    <>
      <span className="font-medium">&ldquo;{template.title}&rdquo;</span> won&apos;t be available for new interview
      activities. {impact ?? 'It is not currently used.'} You can restore it anytime.
    </>
  );
}
