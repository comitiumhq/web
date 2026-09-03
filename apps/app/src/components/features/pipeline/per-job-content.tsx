import type { CandidateProfile } from '@comitium/schemas/candidates';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { EmptyState } from '@comitium/ui/empty-state';
import { MagnifyingGlassMinusIcon, UsersIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { CandidateTable, type CandidateTableVariant } from '@/components/features/pipeline/shared/candidate-table';
import { KanbanBoard } from '@/components/features/pipeline/shared/kanban-board';
import { filterPipelineCandidates } from '@/components/features/pipeline/shared/pipeline-search';
import { PipelineSearchInput } from '@/components/features/pipeline/shared/pipeline-search-input';
import { PipelineContentSkeleton } from '@/components/features/pipeline/shared/pipeline-skeletons';
import type { KanbanApplication, KanbanStage, PipelineCandidate } from '@/lib/schemas/pipeline';
import { cn } from '@/lib/utils';

import { ArchivedSection } from './archived-section';

interface PerJobPipelineContentProps {
  className?: string;
  isArchived: boolean;
  showKanbanView: boolean;
  tableVariant: CandidateTableVariant;
  jobId: string;
  orgId: string;
  filteredStages: KanbanStage[];
  isLoadingKanban: boolean;
  tableCandidates: PipelineCandidate[];
  namesMap: Map<string, CandidateProfile>;
  onCardClick: (application: KanbanApplication) => void;
  onDragEnd: (sourceStageId: string, destStageId: string, applicationId: string) => boolean;
  onCandidateClick: (id: string) => void;
  onLoadMoreStage: (stageId: string) => void;
  onRetryStage: (stageId: string) => void;
  loadingStageIds: string[];
  failedStageIds: string[];
  search: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  hasMoreTableCandidates: boolean;
  isLoadingMoreTableCandidates: boolean;
  hasTableLoadError: boolean;
  onLoadMoreTableCandidates: () => void;
  onRetryTableCandidates: () => void;
}

export function PerJobPipelineContent({
  className,
  isArchived,
  showKanbanView,
  tableVariant,
  jobId,
  orgId,
  filteredStages,
  isLoadingKanban,
  tableCandidates,
  namesMap,
  onCardClick,
  onDragEnd,
  onCandidateClick,
  onLoadMoreStage,
  onRetryStage,
  loadingStageIds,
  failedStageIds,
  search,
  searchQuery,
  onSearchChange,
  onClearSearch,
  hasMoreTableCandidates,
  isLoadingMoreTableCandidates,
  hasTableLoadError,
  onLoadMoreTableCandidates,
  onRetryTableCandidates,
}: PerJobPipelineContentProps) {
  const hasActiveFilter = search.trim() !== '';
  const candidates = useMemo(
    () => filterPipelineCandidates(tableCandidates, namesMap, searchQuery, 'job'),
    [namesMap, searchQuery, tableCandidates],
  );
  const searchEmptyState = getCandidateSearchEmptyState({
    hasError: hasTableLoadError,
    hasMore: hasMoreTableCandidates,
    isLoading: isLoadingMoreTableCandidates,
  });

  if (isArchived) {
    return (
      <div className={cn('min-h-0 flex-1 overflow-hidden', className)}>
        <ArchivedSection jobId={jobId} orgId={orgId} onCandidateClick={onCandidateClick} />
      </div>
    );
  }

  if (isLoadingKanban) {
    return <PipelineContentSkeleton activeTab={showKanbanView ? 'active' : tableVariant} className={className} />;
  }

  if (showKanbanView) {
    return (
      <Card size="sm" className={cn('min-h-0 flex-1 py-0', className)}>
        <KanbanBoard
          stages={filteredStages}
          isLoading={isLoadingKanban}
          namesMap={namesMap}
          onCardClick={onCardClick}
          onDragEnd={onDragEnd}
          onLoadMoreStage={onLoadMoreStage}
          onRetryStage={onRetryStage}
          loadingStageIds={loadingStageIds}
          failedStageIds={failedStageIds}
        />
      </Card>
    );
  }

  if (tableCandidates.length === 0) {
    return (
      <Card size="sm" className={cn('min-h-0 flex-1', className)}>
        <EmptyState
          icon={UsersIcon}
          title="No candidates in this stage"
          description="Candidates will appear here when they move into this stage."
          className="min-h-80"
        />
      </Card>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-hidden', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <PipelineSearchInput
          className="w-full sm:w-[230px]"
          placeholder="Search candidates..."
          value={search}
          onValueChange={onSearchChange}
        />
      </div>

      {candidates.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          {searchQuery && hasMoreTableCandidates && !hasTableLoadError && (
            <p className="pb-2 text-copy-14 text-muted-foreground">Loading all candidates for complete results...</p>
          )}
          <CandidateTable
            className="min-h-0"
            variant={tableVariant}
            scope="job"
            candidates={candidates}
            namesMap={namesMap}
            orgId={orgId}
            onCandidateClick={onCandidateClick}
            hasNextPage={hasMoreTableCandidates}
            loadingMore={isLoadingMoreTableCandidates}
            onLoadMore={onLoadMoreTableCandidates}
          />
          {hasTableLoadError && (
            <div className="flex items-center justify-center gap-2 py-2 text-center text-xs text-destructive">
              <span>Could not load more candidates.</span>
              <Button type="button" variant="outline" size="xs" onClick={onRetryTableCandidates}>
                Try again
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card size="sm" className="min-h-0 flex-1">
          <EmptyState
            icon={MagnifyingGlassMinusIcon}
            title={searchEmptyState.title}
            description={searchEmptyState.description}
            className="min-h-80"
          >
            {hasActiveFilter && (
              <Button variant="outline" size="sm" className="mt-4" onClick={onClearSearch}>
                Clear search
              </Button>
            )}
          </EmptyState>
        </Card>
      )}
    </div>
  );
}

function getCandidateSearchEmptyState({
  hasError,
  hasMore,
  isLoading,
}: {
  hasError: boolean;
  hasMore: boolean;
  isLoading: boolean;
}): { title: string; description: string } {
  if (hasError) {
    return {
      title: 'Search incomplete',
      description: 'Some candidates could not be loaded. Clear the search or try again after refreshing.',
    };
  }

  if (hasMore || isLoading) {
    return {
      title: 'Searching all candidates',
      description: 'More candidate records are loading to complete this search.',
    };
  }

  return {
    title: 'No candidates match',
    description: 'Try a different search or clear the search.',
  };
}
