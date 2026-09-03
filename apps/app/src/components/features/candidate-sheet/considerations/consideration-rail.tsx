import type { DuplicateApplicationAttempt, OtherApplicationSummary } from '@comitium/schemas/applications';
import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { Skeleton } from '@comitium/ui/skeleton';
import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useEffect, useRef } from 'react';
import { cn, formatRelativeTime } from '@/lib/utils';

interface ConsiderationRailProps {
  orgId: string;
  currentApplicationId: string;
  considerations: OtherApplicationSummary[];
  totalConsiderations: number;
  isInitialLoading: boolean;
  isInitialError: boolean;
  isRetrying: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onApplicationClick: (applicationId: string) => void;
  duplicateAttempts: DuplicateApplicationAttempt[];
  totalDuplicateAttempts: number;
  isInitialDuplicateAttemptsLoading: boolean;
  isInitialDuplicateAttemptsError: boolean;
  isRetryingDuplicateAttempts: boolean;
  hasNextDuplicateAttemptsPage: boolean;
  isFetchingNextDuplicateAttemptsPage: boolean;
  isFetchNextDuplicateAttemptsPageError: boolean;
  onLoadMoreDuplicateAttempts: () => void;
  onRetryDuplicateAttempts: () => void;
  onDuplicateAttemptClick: (applicationId: string) => void;
}

export function ConsiderationRail({
  orgId,
  currentApplicationId,
  considerations,
  totalConsiderations,
  isInitialLoading,
  isInitialError,
  isRetrying,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onLoadMore,
  onRetry,
  onApplicationClick,
  duplicateAttempts,
  totalDuplicateAttempts,
  isInitialDuplicateAttemptsLoading,
  isInitialDuplicateAttemptsError,
  isRetryingDuplicateAttempts,
  hasNextDuplicateAttemptsPage,
  isFetchingNextDuplicateAttemptsPage,
  isFetchNextDuplicateAttemptsPageError,
  onLoadMoreDuplicateAttempts,
  onRetryDuplicateAttempts,
  onDuplicateAttemptClick,
}: ConsiderationRailProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-border bg-background">
      <div className="shrink-0 px-3 pb-2 pt-3">
        <p className="text-xs font-medium text-muted-foreground">Applications ({totalConsiderations})</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 px-2 pb-3">
          {considerations.map((app) => (
            <ConsiderationButton
              key={app.id}
              orgId={orgId}
              app={app}
              isCurrent={app.id === currentApplicationId}
              onClick={onApplicationClick}
            />
          ))}
          <InitialConsiderationsStatus
            isLoading={isInitialLoading}
            isError={isInitialError}
            isRetrying={isRetrying}
            loadingKind="application"
            errorLabel="Other applications could not be loaded."
            onRetry={onRetry}
          />
          <InfiniteCollectionStatus
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            loadingLabel="Loading applications..."
            errorLabel="Could not load more applications."
            onLoadMore={onLoadMore}
          />

          {totalDuplicateAttempts > 0 && (
            <>
              <p className="px-1 pb-1 pt-3 text-xs font-medium text-muted-foreground">
                Additional attempts ({totalDuplicateAttempts})
              </p>
              {duplicateAttempts.map((attempt) => (
                <DuplicateAttemptButton key={attempt.id} attempt={attempt} onClick={onDuplicateAttemptClick} />
              ))}
              <InitialConsiderationsStatus
                isLoading={isInitialDuplicateAttemptsLoading}
                isError={isInitialDuplicateAttemptsError}
                isRetrying={isRetryingDuplicateAttempts}
                loadingKind="attempt"
                errorLabel="Attempts could not be loaded."
                onRetry={onRetryDuplicateAttempts}
              />
              <InfiniteCollectionStatus
                hasNextPage={hasNextDuplicateAttemptsPage}
                isFetchingNextPage={isFetchingNextDuplicateAttemptsPage}
                isFetchNextPageError={isFetchNextDuplicateAttemptsPageError}
                loadingLabel="Loading attempts..."
                errorLabel="Could not load more attempts."
                onLoadMore={onLoadMoreDuplicateAttempts}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface InitialConsiderationsStatusProps {
  isLoading: boolean;
  isError: boolean;
  isRetrying: boolean;
  loadingKind: 'application' | 'attempt';
  errorLabel: string;
  onRetry: () => void;
}

function InitialConsiderationsStatus({
  isLoading,
  isError,
  isRetrying,
  loadingKind,
  errorLabel,
  onRetry,
}: InitialConsiderationsStatusProps) {
  if (isLoading) {
    return <InitialConsiderationsSkeleton kind={loadingKind} />;
  }

  if (!isError) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-2 px-2 py-2">
      <p className="text-xs text-destructive">{errorLabel}</p>
      <Button type="button" variant="outline" size="xs" disabled={isRetrying} onClick={onRetry}>
        {isRetrying ? 'Retrying...' : 'Try again'}
      </Button>
    </div>
  );
}

function InitialConsiderationsSkeleton({ kind }: { kind: InitialConsiderationsStatusProps['loadingKind'] }) {
  if (kind === 'attempt') {
    return (
      <div className="px-2 py-2" aria-busy>
        <output className="sr-only">Loading application attempts</output>
        <Skeleton className="h-3.5 w-32 rounded-md" />
        <div className="mt-2 flex items-center gap-1.5">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1" aria-busy>
      <output className="sr-only">Loading other applications</output>
      <ConsiderationRowSkeleton />
      <ConsiderationRowSkeleton short />
    </div>
  );
}

function ConsiderationRowSkeleton({ short = false }: { short?: boolean }) {
  return (
    <div className="border-l-2 border-l-transparent px-3 pb-3 pt-3" aria-hidden>
      <Skeleton className={short ? 'h-4 w-4/5 rounded-md' : 'h-4 w-full rounded-md'} />
      <Skeleton className="mt-2 h-3 w-24 rounded-md" />
      <Skeleton className="mt-1.5 h-3 w-16 rounded-md" />
      <Skeleton className="mt-3 h-3 w-14 rounded-md" />
    </div>
  );
}

interface ConsiderationButtonProps {
  orgId: string;
  app: OtherApplicationSummary;
  isCurrent: boolean;
  onClick: (applicationId: string) => void;
}

const ConsiderationButton = memo(function ConsiderationButton({
  orgId,
  app,
  isCurrent,
  onClick,
}: ConsiderationButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const status = getConsiderationStatusLabel(app);

  useEffect(() => {
    if (isCurrent && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isCurrent]);

  const handleClick = useCallback(() => {
    onClick(app.id);
  }, [onClick, app.id]);

  return (
    <div
      className={cn('rounded-l-none rounded-r-lg border-l-2 border-l-transparent transition-colors hover:bg-muted/40', {
        'border-l-primary bg-muted/60': isCurrent,
      })}
    >
      <Button
        ref={ref}
        variant="ghost"
        onClick={handleClick}
        aria-current={isCurrent ? 'true' : undefined}
        className="h-auto w-full justify-start rounded-none px-3 pb-1.5 pt-3 text-left hover:bg-transparent focus-visible:ring-inset"
      >
        <div className="w-full min-w-0">
          <p className="whitespace-normal break-words text-sm font-medium leading-5 text-foreground">
            {app.jobTitle || 'Untitled Job'}
          </p>

          <p className="mt-1 whitespace-normal break-words text-xs text-foreground/70">{status}</p>

          {app.appliedAt && <p className="mt-0.5 text-xs text-muted-foreground">{formatRelativeTime(app.appliedAt)}</p>}
        </div>
      </Button>

      <Button variant="link" size="sm" className="h-auto justify-start gap-1 px-3 pb-3 pt-1 text-xs" asChild>
        <Link
          to="/org/$orgId/jobs/$jobId/pipeline"
          params={{ orgId, jobId: app.jobId }}
          search={{ tab: 'active' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          View job
          <ArrowUpRightIcon className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
});

function getConsiderationStatusLabel(app: OtherApplicationSummary): string {
  if (app.terminalOutcome) {
    return APPLICATION_TERMINAL_OUTCOME_LABEL[app.terminalOutcome];
  }

  return app.currentStageName || 'Active';
}

interface DuplicateAttemptButtonProps {
  attempt: DuplicateApplicationAttempt;
  onClick: (applicationId: string) => void;
}

const DuplicateAttemptButton = memo(function DuplicateAttemptButton({ attempt, onClick }: DuplicateAttemptButtonProps) {
  const handleClick = useCallback(() => {
    onClick(attempt.id);
  }, [attempt.id, onClick]);
  const status = getDuplicateAttemptStatus(attempt);

  return (
    <Button variant="ghost" onClick={handleClick} className="h-auto w-full justify-start px-2 py-2 text-left">
      <div className="min-w-0">
        <p className="text-sm font-medium">Application attempt</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="h-4 px-1 py-0 text-[10px]">
            {status}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(attempt.appliedAt)}</span>
        </div>
      </div>
    </Button>
  );
});

function getDuplicateAttemptStatus(attempt: DuplicateApplicationAttempt): string {
  if (attempt.terminalOutcome) {
    return APPLICATION_TERMINAL_OUTCOME_LABEL[attempt.terminalOutcome];
  }

  return attempt.isResponded ? 'Responded' : 'Awaiting response';
}
