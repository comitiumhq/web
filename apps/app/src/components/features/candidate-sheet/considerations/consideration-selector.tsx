import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { Button } from '@comitium/ui/button';
import { Combobox, type ComboboxOption } from '@comitium/ui/combobox';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { Skeleton } from '@comitium/ui/skeleton';
import { useMemo } from 'react';

interface ConsiderationSelectorProps {
  currentApplicationId: string;
  considerations: OtherApplicationSummary[];
  isInitialLoading: boolean;
  isInitialError: boolean;
  isRetrying: boolean;
  hasNextConsiderationsPage: boolean;
  isFetchingNextConsiderationsPage: boolean;
  isFetchNextConsiderationsPageError: boolean;
  onConsiderationChange: (applicationId: string) => void;
  onLoadMoreConsiderations: () => void;
  onRetryConsiderations: () => void;
}

export function ConsiderationSelector({
  currentApplicationId,
  considerations,
  isInitialLoading,
  isInitialError,
  isRetrying,
  hasNextConsiderationsPage,
  isFetchingNextConsiderationsPage,
  isFetchNextConsiderationsPageError,
  onConsiderationChange,
  onLoadMoreConsiderations,
  onRetryConsiderations,
}: ConsiderationSelectorProps) {
  const options = useMemo<ComboboxOption[]>(
    () => [
      ...considerations.map((consideration) => ({
        value: consideration.id,
        label: getConsiderationLabel(consideration),
        group: 'Applications',
      })),
    ],
    [considerations],
  );

  const hasConsiderationCollectionStatus =
    hasNextConsiderationsPage || isFetchingNextConsiderationsPage || isFetchNextConsiderationsPageError;
  const hasCollectionStatus = hasConsiderationCollectionStatus;

  return (
    <div className="shrink-0 border-b border-separator bg-background px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Applications</span>
        <Combobox
          ariaLabel="Application"
          options={options}
          value={currentApplicationId}
          clearable={false}
          onValueChange={(applicationId) => applicationId && onConsiderationChange(applicationId)}
          placeholder="Select application"
          searchPlaceholder="Search applications…"
          emptyMessage="No matching applications found."
          className="w-full sm:max-w-sm"
          listFooter={
            hasCollectionStatus ? (
              <div className="flex flex-col">
                {hasConsiderationCollectionStatus && (
                  <InfiniteCollectionStatus
                    hasNextPage={hasNextConsiderationsPage}
                    isFetchingNextPage={isFetchingNextConsiderationsPage}
                    isFetchNextPageError={isFetchNextConsiderationsPageError}
                    loadingLabel="Loading applications..."
                    errorLabel="Could not load more applications."
                    onLoadMore={onLoadMoreConsiderations}
                  />
                )}
              </div>
            ) : null
          }
        />
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
