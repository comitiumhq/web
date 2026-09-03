import { useCallback } from 'react';
import { useInfiniteScrollSentinel } from '../hooks/use-infinite-scroll-sentinel';
import { Button } from './button';

interface InfiniteCollectionStatusProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  loadingLabel: string;
  errorLabel: string;
  onLoadMore: () => void;
}

export function InfiniteCollectionStatus({
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  loadingLabel,
  errorLabel,
  onLoadMore,
}: InfiniteCollectionStatusProps) {
  const handleRetry = useCallback(() => {
    onLoadMore();
  }, [onLoadMore]);
  const ref = useInfiniteScrollSentinel({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    disabled: isFetchNextPageError,
    onLoadMore,
  });

  if (!hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
    return null;
  }

  return (
    <div ref={ref} className="flex min-h-8 items-center justify-center py-2 text-center text-xs text-muted-foreground">
      {isFetchingNextPage && loadingLabel}
      {isFetchNextPageError && (
        <span className="inline-flex items-center gap-2 text-destructive">
          {errorLabel}
          <Button type="button" variant="outline" size="xs" onClick={handleRetry}>
            Try again
          </Button>
        </span>
      )}
    </div>
  );
}
