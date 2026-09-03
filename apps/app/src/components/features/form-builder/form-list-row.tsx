import type { FormDefinitionListItem } from '@comitium/schemas/forms/form-definitions';
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
import { ArchiveIcon, ArrowCounterClockwiseIcon, DotsThreeIcon, PencilIcon, StarIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { useArchiveForm, useRestoreForm } from '@/hooks/mutations/use-form';
import { cn } from '@/lib/utils';

import { ApplicationFormUsagePopover, formatApplicationFormArchiveImpact } from './application-form-usage-popover';
import { FeedbackFormUsagePopover, formatFeedbackFormArchiveImpact } from './feedback-form-usage-popover';

interface FormListRowProps {
  orgId: string;
  form: FormDefinitionListItem;
  canManage: boolean;
  onOpen: (formId: string) => void;
}

export const FormListRow = memo(function FormListRow({ orgId, form, canManage, onOpen }: FormListRowProps) {
  const { mutate: archive, isPending: isArchiving } = useArchiveForm();
  const { mutate: restore, isPending: isRestoring } = useRestoreForm();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const isArchived = form.isArchived;
  const anyPending = isArchiving || isRestoring;

  const handleOpen = useCallback(() => {
    onOpen(form.id);
  }, [onOpen, form.id]);

  const handleRowClick = useCallback(() => {
    if (!isArchived) {
      onOpen(form.id);
    }
  }, [isArchived, onOpen, form.id]);

  const stopRowClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  const openArchiveDialog = useCallback(() => setArchiveDialogOpen(true), []);
  const closeArchiveDialog = useCallback(() => setArchiveDialogOpen(false), []);

  const handleArchive = useCallback(() => {
    archive({ orgId, formId: form.id }, { onSuccess: closeArchiveDialog });
  }, [archive, orgId, form.id, closeArchiveDialog]);

  const handleRestore = useCallback(() => {
    restore({ orgId, formId: form.id });
  }, [restore, orgId, form.id]);

  return (
    <>
      <TableRow className={cn({ 'cursor-pointer': !isArchived, 'opacity-50': isArchived })} onClick={handleRowClick}>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="text-label-14 truncate block">{form.title}</span>
            {form.isDefaultForm && (
              <Badge variant="secondary" className="gap-1">
                <StarIcon className="size-3" />
                Default
              </Badge>
            )}
            {isArchived && <Badge variant="outline">Archived</Badge>}
          </div>
        </TableCell>
        {form.formClass === 'feedback' && (
          <TableCell>
            <FeedbackFormUsagePopover
              orgId={orgId}
              formId={form.id}
              formTitle={form.title}
              jobActivityCount={form.jobActivityCount}
              jobTemplateActivityCount={form.jobTemplateActivityCount}
              interviewTemplateCount={form.interviewTemplateCount}
            />
          </TableCell>
        )}
        {form.formClass === 'application' && (
          <TableCell>
            <ApplicationFormUsagePopover
              orgId={orgId}
              formId={form.id}
              formTitle={form.title}
              jobCount={form.jobCount}
              jobTemplateCount={form.jobTemplateCount}
            />
          </TableCell>
        )}
        <TableCell className="text-label-14 text-muted-foreground hidden sm:table-cell">
          {formatDate(form.updatedAt)}
        </TableCell>
        <TableCell className="text-right">
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
                    <DropdownMenuItem onClick={handleOpen}>
                      <PencilIcon />
                      Edit
                    </DropdownMenuItem>
                    {!form.isDefaultForm && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={openArchiveDialog}>
                          <ArchiveIcon />
                          Archive
                        </DropdownMenuItem>
                      </>
                    )}
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
        title="Archive this form?"
        description={getArchiveDescription(form)}
        actionLabel="Archive"
        onConfirm={handleArchive}
        isPending={isArchiving}
        pendingLabel="Archiving…"
      />
    </>
  );
});

function getArchiveDescription(form: FormDefinitionListItem) {
  const formTitle = <span className="font-medium">&ldquo;{form.title}&rdquo;</span>;

  if (form.formClass === 'feedback') {
    const archiveImpact = formatFeedbackFormArchiveImpact(
      form.jobActivityCount,
      form.jobTemplateActivityCount,
      form.interviewTemplateCount,
    );

    return (
      <>
        {formTitle} won&apos;t be available for new interview templates or review activities.{' '}
        {archiveImpact ?? 'It is not currently used.'}
      </>
    );
  }

  const archiveImpact = formatApplicationFormArchiveImpact(form.jobCount, form.jobTemplateCount);

  return (
    <>
      {formTitle} won&apos;t be available for new jobs or job templates. {archiveImpact ?? 'It is not currently used.'}
    </>
  );
}
