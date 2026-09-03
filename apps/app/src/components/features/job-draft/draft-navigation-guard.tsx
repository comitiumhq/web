import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { type ShouldBlockFn, useBlocker } from '@tanstack/react-router';
import { useCallback } from 'react';
import { isDraftEditorPath } from './utils';

interface DraftNavigationGuardProps {
  orgId: string;
  jobId: string;
  enabled: boolean;
}

export function DraftNavigationGuard({ orgId, jobId, enabled }: DraftNavigationGuardProps) {
  const shouldBlockNavigation = useCallback<ShouldBlockFn>(
    ({ next }) => !isDraftEditorPath(next.pathname, orgId, jobId),
    [jobId, orgId],
  );
  const blocker = useBlocker({
    shouldBlockFn: shouldBlockNavigation,
    enableBeforeUnload: enabled,
    disabled: !enabled,
    withResolver: true,
  });

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && blocker.status === 'blocked') {
        blocker.reset();
      }
    },
    [blocker],
  );

  const handleDiscard = useCallback(() => {
    if (blocker.status === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  return (
    <ConfirmDialog
      open={blocker.status === 'blocked'}
      onOpenChange={handleOpenChange}
      title="Discard unsaved changes?"
      description="Your changes to this draft will be lost."
      actionLabel="Discard changes"
      cancelLabel="Keep editing"
      onConfirm={handleDiscard}
    />
  );
}
