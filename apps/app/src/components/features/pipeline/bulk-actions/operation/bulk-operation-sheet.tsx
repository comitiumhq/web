import { Button } from '@comitium/ui/button';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import type { ReactNode } from 'react';
import { type BulkOperation, isBulkOperationInProgress, isBulkOperationTerminal } from '@/lib/schemas/bulk-operations';
import { getReadyTargets, type PipelineBulkTarget } from '../model';
import { BulkOperationExecutionStatus } from './bulk-operation-execution-status';
import { BulkOperationReadiness } from './bulk-operation-readiness';

interface BulkOperationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  operation: BulkOperation | null;
  targets: readonly PipelineBulkTarget[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  submitLabel: string;
  pendingLabel: string;
  submitDisabled?: boolean;
  submitting: boolean;
  destructive?: boolean;
  onSubmit: () => void;
  children?: ReactNode;
}

export function BulkOperationSheet({
  open,
  onOpenChange,
  title,
  operation,
  targets,
  loading,
  error,
  onRetry,
  submitLabel,
  pendingLabel,
  submitDisabled,
  submitting,
  destructive,
  onSubmit,
  children,
}: BulkOperationSheetProps) {
  const ready = getReadyTargets(targets);
  const isInProgress = isBulkOperationInProgress(operation);
  const isFinished = isBulkOperationTerminal(operation);
  const canSubmit = Boolean(operation?.status === 'draft' && ready.length > 0 && !error && !submitDisabled);
  let dismissLabel = 'Cancel';

  if (isInProgress) {
    dismissLabel = 'Close';
  } else if (isFinished) {
    dismissLabel = 'Done';
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <FeatureSheetContent width="xl">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Configure this bulk action for the selected applications.
          </SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody className="flex flex-col gap-5">
          <BulkOperationReadiness
            operation={operation}
            targets={targets}
            loading={loading}
            error={error}
            onRetry={onRetry}
          />
          {operation?.status === 'draft' ? children : null}
          {operation && operation.status !== 'draft' ? (
            <BulkOperationExecutionStatus operation={operation} targets={targets} />
          ) : null}
        </FeatureSheetBody>

        <FeatureSheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {dismissLabel}
          </Button>
          {operation?.status === 'draft' ? (
            <Button
              type="button"
              variant={destructive ? 'destructive' : 'default'}
              disabled={!canSubmit || submitting}
              onClick={onSubmit}
            >
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitting ? pendingLabel : submitLabel}
            </Button>
          ) : null}
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}
