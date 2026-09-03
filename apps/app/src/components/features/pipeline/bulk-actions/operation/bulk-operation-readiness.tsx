import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comitium/ui/collapsible';
import { Spinner } from '@comitium/ui/spinner';
import { CaretDownIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react';
import type { BulkOperation } from '@/lib/schemas/bulk-operations';
import { getExcludedTargets, getTargetLabel, type PipelineBulkTarget } from '../model';

export function BulkOperationReadiness({
  operation,
  targets,
  loading,
  error,
  onRetry,
}: {
  operation: BulkOperation | null;
  targets: readonly PipelineBulkTarget[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
        <Spinner />
        Checking the selection…
      </div>
    );
  }

  if (error || !operation) {
    return (
      <Alert variant="warning">
        <WarningIcon />
        <AlertTitle>Selection could not be reviewed</AlertTitle>
        <AlertDescription>
          <span>{error ?? 'Try again before continuing.'}</span>{' '}
          <Button type="button" variant="link" className="h-auto p-0 text-current" onClick={onRetry}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (operation.status !== 'draft') return null;

  const excludedTargets = getExcludedTargets(targets);

  return <ExcludedTargetsWarning targets={excludedTargets} />;
}

function ExcludedTargetsWarning({ targets }: { targets: readonly PipelineBulkTarget[] }) {
  if (targets.length === 0) return null;

  return (
    <Alert variant="warning">
      <WarningCircleIcon />
      <AlertTitle>
        {targets.length} {targets.length === 1 ? 'application will be skipped' : 'applications will be skipped'}
      </AlertTitle>
      <AlertDescription>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="link" className="h-auto gap-1 p-0 text-current">
              Review details
              <CaretDownIcon />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-3 space-y-2 text-left">
              {targets.map((target) => {
                const label = getTargetLabel(target);

                return (
                  <li key={target.item.id} className="border-t border-current/15 pt-2 first:border-0 first:pt-0">
                    <p className="font-medium text-foreground">
                      {label.candidateName} · {label.jobTitle}
                    </p>
                    <p className="text-muted-foreground">
                      {target.item.exclusion?.message ?? 'This application is not eligible.'}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
}
