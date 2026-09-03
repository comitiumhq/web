import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { ArchiveIcon, ArrowCounterClockwiseIcon, DotsThreeIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import {
  useActivateJobTemplate,
  useArchiveJobTemplate,
  useDeactivateJobTemplate,
  useRestoreJobTemplate,
} from '@/hooks/mutations/use-job-template-mutations';
import type { JobTemplateStatus } from '@/lib/schemas/job-templates';

import { TemplateStatusBadge } from '../template-status-badge';

interface TemplateHeaderProps {
  orgId: string;
  templateId: string | null;
  templateTitle: string;
  status: JobTemplateStatus;
  isDirty: boolean;
  isNew: boolean;
  onArchived: () => void;
}

export const TemplateHeader = memo(function TemplateHeader({
  orgId,
  templateId,
  templateTitle,
  status,
  isDirty,
  isNew,
  onArchived,
}: TemplateHeaderProps) {
  const { mutate: activate, isPending: isActivating } = useActivateJobTemplate();
  const { mutate: deactivate, isPending: isDeactivating } = useDeactivateJobTemplate();
  const { mutate: archive, isPending: isArchiving } = useArchiveJobTemplate();
  const { mutate: restore, isPending: isRestoring } = useRestoreJobTemplate();

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const isArchived = status === 'archived';
  const isActive = status === 'active';
  const isInactive = status === 'inactive';
  const anyPending = isActivating || isDeactivating || isArchiving || isRestoring;

  const handleActivate = useCallback(() => {
    if (!templateId) {
      return;
    }

    activate({ orgId, templateId });
  }, [activate, orgId, templateId]);

  const handleDeactivate = useCallback(() => {
    if (!templateId) {
      return;
    }

    deactivate({ orgId, templateId });
  }, [deactivate, orgId, templateId]);

  const handleArchive = useCallback(() => {
    if (!templateId) {
      return;
    }

    archive(
      { orgId, templateId },
      {
        onSuccess: onArchived,
      },
    );
    setArchiveDialogOpen(false);
  }, [archive, onArchived, orgId, templateId]);

  const handleRestore = useCallback(() => {
    if (!templateId) {
      return;
    }

    restore({ orgId, templateId });
  }, [restore, orgId, templateId]);

  const openArchiveDialog = useCallback(() => {
    setArchiveDialogOpen(true);
  }, []);

  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b px-6 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-heading-20 truncate">
              {isNew ? 'New job template' : templateTitle || 'Untitled template'}
            </SheetTitle>
            <SheetDescription className="sr-only">Job template editor</SheetDescription>
            {!isNew && <TemplateStatusBadge status={status} />}
            {!isNew && isDirty && <Badge variant="secondary">Unsaved changes</Badge>}
          </div>
        </div>

        {!isNew && (
          <div className="flex shrink-0 items-center gap-2 pr-8">
            {isInactive && (
              <Button variant="outline" size="sm" disabled={anyPending} onClick={handleActivate}>
                <EyeIcon data-icon="inline-start" />
                Activate
              </Button>
            )}
            {isActive && (
              <Button variant="outline" size="sm" disabled={anyPending} onClick={handleDeactivate}>
                <EyeSlashIcon data-icon="inline-start" />
                Deactivate
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0" disabled={anyPending}>
                  <DotsThreeIcon />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
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
          </div>
        )}
      </div>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive this job template?"
        description={
          <>
            <span className="font-medium">&ldquo;{templateTitle}&rdquo;</span> will no longer be available when creating
            jobs from a template. You can restore it anytime.
          </>
        }
        actionLabel="Archive"
        onConfirm={handleArchive}
      />
    </>
  );
});
