import type { DuplicateApplicationAttempt, OtherApplicationSummary } from '@comitium/schemas/applications';
import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { Button } from '@comitium/ui/button';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@comitium/ui/select';
import { Skeleton } from '@comitium/ui/skeleton';
import { useCallback } from 'react';

interface ConsiderationSelectorProps {
  currentApplicationId: string;
  considerations: OtherApplicationSummary[];
  duplicateAttempts: DuplicateApplicationAttempt[];
  totalDuplicateAttempts: number;
  isInitialLoading: boolean;
  isInitialError: boolean;
  isRetrying: boolean;
  hasNextConsiderationsPage: boolean;
  isFetchingNextConsiderationsPage: boolean;
  isFetchNextConsiderationsPageError: boolean;
  hasNextDuplicateAttemptsPage: boolean;
  isFetchingNextDuplicateAttemptsPage: boolean;
  isFetchNextDuplicateAttemptsPageError: boolean;
  isInitialDuplicateAttemptsLoading: boolean;
  isInitialDuplicateAttemptsError: boolean;
  isRetryingDuplicateAttempts: boolean;
  onConsiderationChange: (applicationId: string) => void;
  onDuplicateAttemptChange: (applicationId: string) => void;
  onLoadMoreConsiderations: () => void;
  onRetryConsiderations: () => void;
  onLoadMoreDuplicateAttempts: () => void;
  onRetryDuplicateAttempts: () => void;
}

export function ConsiderationSelector({
  currentApplicationId,
  considerations,
  duplicateAttempts,
  totalDuplicateAttempts,
  isInitialLoading,
  isInitialError,
  isRetrying,
  hasNextConsiderationsPage,
  isFetchingNextConsiderationsPage,
  isFetchNextConsiderationsPageError,
  hasNextDuplicateAttemptsPage,
  isFetchingNextDuplicateAttemptsPage,
  isFetchNextDuplicateAttemptsPageError,
  isInitialDuplicateAttemptsLoading,
  isInitialDuplicateAttemptsError,
  isRetryingDuplicateAttempts,
  onConsiderationChange,
  onDuplicateAttemptChange,
  onLoadMoreConsiderations,
  onRetryConsiderations,
  onLoadMoreDuplicateAttempts,
  onRetryDuplicateAttempts,
}: ConsiderationSelectorProps) {
  const handleValueChange = useCallback(
    (applicationId: string) => {
      const isDuplicateAttempt = duplicateAttempts.some((attempt) => attempt.id === applicationId);

      if (isDuplicateAttempt) {
        onDuplicateAttemptChange(applicationId);

        return;
      }

      onConsiderationChange(applicationId);
    },
    [duplicateAttempts, onConsiderationChange, onDuplicateAttemptChange],
  );

  return (
    <div className="shrink-0 border-b border-border bg-background px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Applications</span>
        <Select value={currentApplicationId} onValueChange={handleValueChange}>
          <SelectTrigger className="w-full sm:max-w-sm">
            <SelectValue placeholder="Select application" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Applications</SelectLabel>
              {considerations.map((consideration) => (
                <SelectItem key={consideration.id} value={consideration.id}>
                  <span className="truncate">{getConsiderationLabel(consideration)}</span>
                </SelectItem>
              ))}
            </SelectGroup>

            {(hasNextConsiderationsPage || isFetchingNextConsiderationsPage || isFetchNextConsiderationsPageError) && (
              <InfiniteCollectionStatus
                hasNextPage={hasNextConsiderationsPage}
                isFetchingNextPage={isFetchingNextConsiderationsPage}
                isFetchNextPageError={isFetchNextConsiderationsPageError}
                loadingLabel="Loading applications..."
                errorLabel="Could not load more applications."
                onLoadMore={onLoadMoreConsiderations}
              />
            )}

            {totalDuplicateAttempts > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Additional attempts ({totalDuplicateAttempts})</SelectLabel>
                  {duplicateAttempts.map((attempt) => (
                    <SelectItem key={attempt.id} value={attempt.id}>
                      Application attempt · {getDuplicateAttemptLabel(attempt)}
                    </SelectItem>
                  ))}
                </SelectGroup>

                {(hasNextDuplicateAttemptsPage ||
                  isFetchingNextDuplicateAttemptsPage ||
                  isFetchNextDuplicateAttemptsPageError) && (
                  <InfiniteCollectionStatus
                    hasNextPage={hasNextDuplicateAttemptsPage}
                    isFetchingNextPage={isFetchingNextDuplicateAttemptsPage}
                    isFetchNextPageError={isFetchNextDuplicateAttemptsPageError}
                    loadingLabel="Loading attempts..."
                    errorLabel="Could not load more attempts."
                    onLoadMore={onLoadMoreDuplicateAttempts}
                  />
                )}
              </>
            )}
          </SelectContent>
        </Select>
        {isInitialLoading && (
          <div aria-busy>
            <span className="sr-only">Loading other applications</span>
            <Skeleton aria-hidden className="h-3 w-28 rounded-full" />
          </div>
        )}
        {isInitialError && (
          <span className="inline-flex items-center gap-2 text-xs text-destructive">
            Other applications could not be loaded.
            <Button type="button" variant="outline" size="xs" disabled={isRetrying} onClick={onRetryConsiderations}>
              {isRetrying ? 'Retrying...' : 'Try again'}
            </Button>
          </span>
        )}
        {isInitialDuplicateAttemptsLoading && (
          <div aria-busy>
            <span className="sr-only">Loading additional attempts</span>
            <Skeleton aria-hidden className="h-3 w-24 rounded-full" />
          </div>
        )}
        {isInitialDuplicateAttemptsError && (
          <span className="inline-flex items-center gap-2 text-xs text-destructive">
            Attempts could not be loaded.
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={isRetryingDuplicateAttempts}
              onClick={onRetryDuplicateAttempts}
            >
              {isRetryingDuplicateAttempts ? 'Retrying...' : 'Try again'}
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}

function getConsiderationLabel(consideration: OtherApplicationSummary): string {
  const jobTitle = consideration.jobTitle || 'Untitled Job';

  if (consideration.terminalOutcome) {
    return `${jobTitle} · ${APPLICATION_TERMINAL_OUTCOME_LABEL[consideration.terminalOutcome]}`;
  }

  return `${jobTitle} · ${consideration.currentStageName || 'Active'}`;
}

function getDuplicateAttemptLabel(attempt: DuplicateApplicationAttempt): string {
  if (attempt.terminalOutcome) {
    return APPLICATION_TERMINAL_OUTCOME_LABEL[attempt.terminalOutcome];
  }

  return attempt.isResponded ? 'Responded' : 'Awaiting response';
}
