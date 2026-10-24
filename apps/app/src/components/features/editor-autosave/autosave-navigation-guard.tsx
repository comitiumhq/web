import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { type ShouldBlockFn, useBlocker } from '@tanstack/react-router';
import { useCallback } from 'react';
import type { Autosave } from '@/hooks/use-autosave';

interface AutosaveNavigationGuardProps {
  autosave: Autosave;
  containsPath?: (pathname: string) => boolean;
}

export function AutosaveNavigationGuard({ autosave, containsPath }: AutosaveNavigationGuardProps) {
  const { isDirty, isSaving, flush } = autosave;
  const shouldBlockFn = useCallback<ShouldBlockFn>(
    async ({ next }) => {
      if (containsPath?.(next.pathname)) {
        return false;
      }

      return !(await flush());
    },
    [containsPath, flush],
  );

  const blocker = useBlocker({
    shouldBlockFn,
    enableBeforeUnload: isDirty || isSaving,
    disabled: !isDirty && !isSaving,
    withResolver: true,
  });

  return (
    <ConfirmDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.status === 'blocked') {
          blocker.reset();
        }
      }}
      title="Leave without saving?"
      description="Some changes could not be saved. Stay to complete the fields or retry saving."
      actionLabel="Discard changes"
      cancelLabel="Keep editing"
      onConfirm={() => {
        if (blocker.status === 'blocked') {
          blocker.proceed();
        }
      }}
    />
  );
}
