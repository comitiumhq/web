import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Progress } from '@comitium/ui/progress';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { type BulkOperation, type BulkOperationItem, isBulkOperationInProgress } from '@/lib/schemas/bulk-operations';
import { getTargetLabel, type PipelineBulkTarget } from '../model';

const TERMINAL_ISSUE_STATUSES = new Set<BulkOperationItem['status']>(['excluded', 'skipped', 'failed']);

export function BulkOperationExecutionStatus({
  operation,
  targets,
}: {
  operation: BulkOperation;
  targets: readonly PipelineBulkTarget[];
}) {
  if (isBulkOperationInProgress(operation)) {
    return <OperationProgress operation={operation} />;
  }

  const presentation = getCompletionPresentation(operation);
  const skipped = operation.counts.skipped + operation.counts.excluded;
  const affectedTargets = targets.filter((target) => TERMINAL_ISSUE_STATUSES.has(target.item.status));

  return (
    <Alert variant={presentation.variant}>
      {presentation.hasIssues ? <WarningCircleIcon /> : <CheckCircleIcon />}
      <AlertTitle>{presentation.title}</AlertTitle>
      <AlertDescription>
        <p>
          {operation.counts.succeeded} completed{skipped > 0 ? ` · ${skipped} skipped` : ''}
          {operation.counts.failed > 0 ? ` · ${operation.counts.failed} failed` : ''}
        </p>
        <AffectedTargetList targets={affectedTargets} />
      </AlertDescription>
    </Alert>
  );
}

function OperationProgress({ operation }: { operation: BulkOperation }) {
  const finished = operation.counts.succeeded + operation.counts.failed + operation.counts.skipped;
  const total =
    operation.counts.pending +
    operation.counts.processing +
    operation.counts.waiting +
    operation.counts.succeeded +
    operation.counts.failed +
    operation.counts.skipped;
  const progress = total === 0 ? 0 : (finished / total) * 100;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="font-medium">Processing on the server</p>
          <p className="mt-0.5 text-muted-foreground">You can close this panel. The action will continue.</p>
        </div>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {finished} / {total}
        </span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

function AffectedTargetList({ targets }: { targets: readonly PipelineBulkTarget[] }) {
  if (targets.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2 text-left">
      {targets.map((target) => {
        const label = getTargetLabel(target);

        return (
          <li key={target.item.id}>
            <span className="font-medium">{label.candidateName}</span>
            <span className="text-muted-foreground">
              {' '}
              · {label.jobTitle} — {getTargetIssueMessage(target)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function getTargetIssueMessage(target: PipelineBulkTarget) {
  return target.item.error?.message ?? target.item.exclusion?.message ?? 'The action could not be completed.';
}

function getCompletionPresentation(operation: BulkOperation) {
  const skipped = operation.counts.skipped + operation.counts.excluded;
  const hasIssues = operation.status === 'completed_with_errors' || operation.counts.failed > 0 || skipped > 0;

  if (!hasIssues) {
    return { hasIssues, variant: 'success' as const, title: 'Completed' };
  }

  if (operation.counts.succeeded > 0 || operation.counts.failed === 0) {
    return { hasIssues, variant: 'warning' as const, title: 'Completed with errors' };
  }

  return { hasIssues, variant: 'destructive' as const, title: 'Action failed' };
}
