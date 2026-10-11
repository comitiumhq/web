import { type CandidateProfile, formatCandidateName } from '@comitium/schemas/candidates';
import { Button } from '@comitium/ui/button';
import { KANBAN_COLUMN_BODY_CLASS, KANBAN_COLUMN_CLASS, KanbanColumnHeader } from '@comitium/ui/kanban';
import { Skeleton } from '@comitium/ui/skeleton';
import { useInfiniteScrollSentinel } from '@comitium/ui/use-infinite-scroll-sentinel';
import { useSortable } from '@dnd-kit/react/sortable';
import { memo, useCallback } from 'react';
import type { KanbanApplication } from '@/lib/schemas/pipeline';
import { cn } from '@/lib/utils';

import { KanbanCard } from './kanban-card';

interface KanbanColumnProps {
  id: string;
  name: string;
  applications: KanbanApplication[];
  total: number;
  nextCursor: string | null;
  isLoadingMore: boolean;
  hasLoadError: boolean;
  index: number;
  scrollable?: boolean;
  namesMap: Map<string, CandidateProfile>;
  onCardClick: (application: KanbanApplication) => void;
  onLoadMore?: (stageId: string) => void;
  onRetry?: (stageId: string) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  id,
  name,
  applications,
  total,
  nextCursor,
  isLoadingMore,
  hasLoadError,
  index,
  scrollable = true,
  namesMap,
  onCardClick,
  onLoadMore,
  onRetry,
}: KanbanColumnProps) {
  const handleLoadMore = useCallback(() => {
    onLoadMore?.(id);
  }, [id, onLoadMore]);
  const handleRetry = useCallback(() => {
    onRetry?.(id);
  }, [id, onRetry]);
  const loadMoreRef = useInfiniteScrollSentinel({
    hasMore: Boolean(nextCursor),
    isLoading: isLoadingMore,
    disabled: hasLoadError || !onLoadMore,
    onLoadMore: handleLoadMore,
  });
  const { ref, handleRef, isDropTarget } = useSortable({
    id,
    type: 'column',
    accept: ['column', 'item'],
    index,
  });

  return (
    <div
      ref={ref}
      className={cn(KANBAN_COLUMN_CLASS, 'transition-[background-color,box-shadow]', {
        'bg-primary/[0.05] ring-1 ring-primary/20 ring-inset': isDropTarget,
        'h-full': scrollable,
      })}
    >
      <span ref={handleRef} aria-hidden="true" className="sr-only" />

      <KanbanColumnHeader name={name} total={total} />

      <div
        className={cn(KANBAN_COLUMN_BODY_CLASS, {
          'overflow-y-auto': scrollable,
        })}
      >
        {applications.length === 0 ? (
          <div className="flex h-30 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70">
            <p className="text-xs text-muted-foreground">No candidates</p>
          </div>
        ) : (
          applications.map((application, appIndex) => {
            const profile = namesMap.get(application.candidateId ?? '');

            return (
              <KanbanCard
                key={application.id}
                application={application}
                index={appIndex}
                column={id}
                decryptedName={formatCandidateName(profile)}
                company={profile?.currentCompany?.trim() || null}
                onCardClick={onCardClick}
              />
            );
          })
        )}

        <div ref={loadMoreRef} className="flex flex-col gap-2">
          {isLoadingMore && (
            <>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </>
          )}
          {hasLoadError && (
            <div className="flex flex-col items-center gap-2 px-2 py-3 text-center text-xs text-destructive">
              <p>Could not load more candidates.</p>
              <Button type="button" variant="outline" size="xs" onClick={handleRetry}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
