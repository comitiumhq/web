import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { formatDate } from '@comitium/ui/date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { TableCell, TableRow } from '@comitium/ui/table';
import { ArchiveIcon, ArrowCounterClockwiseIcon, CopyIcon, DotsThreeIcon, PencilIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import {
  useArchiveInterviewPlan,
  useDuplicateInterviewPlan,
  useUnarchiveInterviewPlan,
} from '@/hooks/mutations/use-interview-plan';
import type { InterviewPlanSummary } from '@/lib/schemas/pipeline';
import { cn } from '@/lib/utils';
import { formatPlanUsageArchiveImpact, PlanUsagePopover } from './plan-usage-popover';

interface TemplateRowProps {
  orgId: string;
  template: InterviewPlanSummary;
  onEdit: (templateId: string) => void;
}

export const TemplateRow = memo(function TemplateRow({ orgId, template, onEdit }: TemplateRowProps) {
  const { mutate: archiveMutate, isPending: isArchiving } = useArchiveInterviewPlan();
  const { mutate: unarchiveMutate, isPending: isUnarchiving } = useUnarchiveInterviewPlan();
  const { mutate: duplicateMutate, isPending: isDuplicating } = useDuplicateInterviewPlan();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const anyPending = isArchiving || isUnarchiving || isDuplicating;

  const canEdit = !template.isArchived;
  const canDuplicate = !template.isArchived;
  const canArchive = !template.isDefault && !template.isArchived;
  const canRestore = !template.isDefault && template.isArchived;
  const showPrimaryActions = canEdit || canDuplicate;
  const showArchiveActions = canArchive || canRestore;
  const showSeparator = (canEdit || canDuplicate) && (canArchive || canRestore);
  const rowClassName = cn({
    'cursor-pointer': !template.isArchived && canEdit,
    'opacity-50': template.isArchived,
  });
  const archiveImpact = formatPlanUsageArchiveImpact(template.jobCount, template.jobTemplateCount);

  const handleEdit = useCallback(() => {
    onEdit(template.id);
  }, [onEdit, template.id]);

  const handleDuplicate = useCallback(() => {
    duplicateMutate({ orgId, planId: template.id });
  }, [orgId, template.id, duplicateMutate]);

  const handleArchive = useCallback(() => {
    archiveMutate({ orgId, planId: template.id });
    setArchiveDialogOpen(false);
  }, [orgId, template.id, archiveMutate]);

  const handleUnarchive = useCallback(() => {
    unarchiveMutate({ orgId, planId: template.id });
  }, [orgId, template.id, unarchiveMutate]);

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
      <TableRow className={rowClassName} onClick={handleRowClick}>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="text-label-14">{template.name}</span>
            {template.isDefault && <Badge variant="secondary">Default</Badge>}
          </div>
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground tabular-nums">{template.stageCount}</TableCell>
        <TableCell>
          <PlanUsagePopover
            orgId={orgId}
            planId={template.id}
            planName={template.name}
            jobCount={template.jobCount}
            jobTemplateCount={template.jobTemplateCount}
          />
        </TableCell>
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(template.updatedAt)}
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
              {showPrimaryActions && (
                <DropdownMenuGroup>
                  {canEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <PencilIcon />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDuplicate && (
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <CopyIcon />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              )}
              {showSeparator && <DropdownMenuSeparator />}
              {showArchiveActions && (
                <DropdownMenuGroup>
                  {canArchive && (
                    <DropdownMenuItem variant="destructive" onClick={openArchiveDialog}>
                      <ArchiveIcon />
                      Archive
                    </DropdownMenuItem>
                  )}
                  {canRestore && (
                    <DropdownMenuItem onClick={handleUnarchive}>
                      <ArrowCounterClockwiseIcon />
                      Restore
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive this interview plan?"
        description={
          <>
            <span className="font-medium">&ldquo;{template.name}&rdquo;</span> will be hidden from the plan picker for
            new jobs. {archiveImpact && <>{archiveImpact} </>}You can restore it anytime.
          </>
        }
        actionLabel="Archive"
        onConfirm={handleArchive}
      />
    </>
  );
});
