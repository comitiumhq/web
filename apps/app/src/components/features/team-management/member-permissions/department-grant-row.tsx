import type { JobAccessRole } from '@comitium/schemas/jobs';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { DotsThreeIcon } from '@phosphor-icons/react';
import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import type { DepartmentGrant } from '@/lib/schemas/org-structure';

import { DepartmentAccessForm } from './department-access-form';
import { departmentSubtitle } from './department-helpers';

type AccessPopoverMode = 'actions' | 'edit';

interface DepartmentGrantRowProps {
  grant: DepartmentGrant;
  hasChildren: boolean;
  parentName: string | null;
  canEdit: boolean;
  disabled: boolean;
  onReplaceRole: (grant: DepartmentGrant, role: JobAccessRole) => Promise<boolean>;
  onRevoke: (grant: DepartmentGrant) => Promise<boolean>;
}

export const DepartmentGrantRow = memo(function DepartmentGrantRow({
  grant,
  hasChildren,
  parentName,
  canEdit,
  disabled,
  onReplaceRole,
  onRevoke,
}: DepartmentGrantRowProps) {
  const [accessPopoverOpen, setAccessPopoverOpen] = useState(false);
  const [accessPopoverMode, setAccessPopoverMode] = useState<AccessPopoverMode>('actions');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<JobAccessRole>(grant.role);
  const subtitle = departmentSubtitle(parentName, hasChildren);
  const departmentTarget = useMemo(() => ({ name: grant.departmentName, subtitle }), [grant.departmentName, subtitle]);
  const removeDescription = useMemo<ReactNode>(() => {
    if (hasChildren) {
      return (
        <>
          This member will lose access to <strong>{grant.departmentName}</strong> and teams under it.
        </>
      );
    }

    return (
      <>
        This member will lose access to <strong>{grant.departmentName}</strong>.
      </>
    );
  }, [hasChildren, grant.departmentName]);
  const saveDisabled = disabled || editRole === grant.role;
  const popoverContentClassName =
    accessPopoverMode === 'edit' ? 'w-[360px] max-w-[calc(100vw-2rem)] gap-3 p-3' : 'w-[180px] gap-1 p-1';

  const handleAccessPopoverOpenChange = useCallback(
    (open: boolean) => {
      if (disabled) {
        return;
      }

      setAccessPopoverOpen(open);

      if (!open) {
        setAccessPopoverMode('actions');
        setEditRole(grant.role);
      }
    },
    [disabled, grant.role],
  );

  const handleEditAction = useCallback(() => {
    setEditRole(grant.role);
    setAccessPopoverMode('edit');
  }, [grant.role]);

  const handleRemoveAction = useCallback(() => {
    setAccessPopoverOpen(false);
    setAccessPopoverMode('actions');
    setRemoveDialogOpen(true);
  }, []);

  const handleRoleChange = useCallback((role: JobAccessRole) => {
    setEditRole(role);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setAccessPopoverOpen(false);
    setAccessPopoverMode('actions');
    setEditRole(grant.role);
  }, [grant.role]);

  const handleSaveEdit = useCallback(async () => {
    if (editRole === grant.role) {
      setAccessPopoverOpen(false);
      setAccessPopoverMode('actions');

      return;
    }

    const accepted = await onReplaceRole(grant, editRole);

    if (!accepted) {
      return;
    }

    setAccessPopoverOpen(false);
    setAccessPopoverMode('actions');
  }, [editRole, grant, onReplaceRole]);

  const handleRevoke = useCallback(async () => {
    const accepted = await onRevoke(grant);

    if (!accepted) {
      return;
    }

    setRemoveDialogOpen(false);
  }, [grant, onRevoke]);

  const handleRemoveDialogOpenChange = useCallback(
    (open: boolean) => {
      if (disabled) {
        return;
      }

      setRemoveDialogOpen(open);
    },
    [disabled],
  );

  return (
    <>
      <div className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-label-14 truncate">{grant.departmentName}</p>
          {subtitle && <p className="text-copy-12 text-muted-foreground mt-px truncate">{subtitle}</p>}
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end">
          <Badge variant="secondary">{grant.roleName}</Badge>

          {canEdit && (
            <Popover open={accessPopoverOpen} onOpenChange={handleAccessPopoverOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={`${grant.departmentName} access actions`}
                >
                  <DotsThreeIcon weight="bold" />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="end" sideOffset={8} className={popoverContentClassName}>
                {accessPopoverMode === 'actions' ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full justify-start rounded-xl px-3 py-2 font-normal"
                      onClick={handleEditAction}
                    >
                      Edit Access
                    </Button>
                    <div className="-mx-1 h-px bg-border/50" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive-text h-auto w-full justify-start rounded-xl px-3 py-2 font-normal hover:bg-destructive/10 hover:text-destructive-text dark:hover:bg-destructive/20"
                      onClick={handleRemoveAction}
                    >
                      Remove Access
                    </Button>
                  </>
                ) : (
                  <DepartmentAccessForm
                    title="Edit Access"
                    fixedDepartment={departmentTarget}
                    departmentId={grant.departmentId}
                    role={editRole}
                    submitLabel="Save Changes"
                    submitIcon={null}
                    disabled={disabled}
                    submitDisabled={saveDisabled}
                    onRoleChange={handleRoleChange}
                    onCancel={handleCancelEdit}
                    onSubmit={handleSaveEdit}
                  />
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={handleRemoveDialogOpenChange}
        title="Remove Access?"
        description={removeDescription}
        actionLabel="Remove Access"
        onConfirm={handleRevoke}
        isPending={disabled}
      />
    </>
  );
});
