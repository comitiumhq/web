import { type ComponentProps, type ReactNode, useCallback } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Spinner } from './spinner';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  actionLabel: string;
  actionVariant?: ComponentProps<typeof Button>['variant'];
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  pendingLabel?: string;
  extraContent?: ReactNode;
  modal?: boolean;
  closeOnInteractOutside?: boolean;
}

type DialogInteractOutsideEvent = Parameters<NonNullable<ComponentProps<typeof DialogContent>['onInteractOutside']>>[0];

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  actionVariant = 'destructive',
  cancelLabel = 'Cancel',
  onConfirm,
  isPending = false,
  pendingLabel,
  extraContent,
  modal = true,
  closeOnInteractOutside = true,
}: ConfirmDialogProps) {
  const handleInteractOutside = useCallback(
    (event: DialogInteractOutsideEvent) => {
      if (!closeOnInteractOutside || isPending) {
        event.preventDefault();
      }
    },
    [closeOnInteractOutside, isPending],
  );
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isPending) {
        return;
      }

      onOpenChange(nextOpen);
    },
    [isPending, onOpenChange],
  );
  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={modal}>
      <DialogContent showCloseButton={false} onInteractOutside={handleInteractOutside}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {extraContent}
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant={actionVariant} onClick={onConfirm} disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? (pendingLabel ?? actionLabel) : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
