import type { CandidateProfile } from '@comitium/schemas/candidates';
import { Button } from '@comitium/ui/button';
import { EmptyStatePanel } from '@comitium/ui/empty-state-panel';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { PageContainer } from '@comitium/ui/page-container';
import {
  ArchiveIcon,
  BriefcaseIcon,
  FlagIcon,
  MagnifyingGlassMinusIcon,
  type Icon as PhosphorIcon,
  SealCheckIcon,
} from '@phosphor-icons/react';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { memo, useCallback } from 'react';
import { ArchivedCandidateTable, CandidateTable } from '@/components/features/pipeline/shared/candidate-table';
import { GlobalPipelineContentSkeleton } from '@/components/features/pipeline/shared/pipeline-skeletons';
import { ApplicationReviewIcon } from '@/lib/constants/domain-icons';
import type { PipelineCandidate, PipelineCandidateSorting, PipelineJob, StageType } from '@/lib/schemas/pipeline';
import type { PipelineTab } from '../types';
import { JobAccordion } from './job-accordion';

const EMPTY_BY_TAB: Record<PipelineTab, { icon: PhosphorIcon; title: string; description: string }> = {
  review: {
    icon: ApplicationReviewIcon,
    title: 'Nothing to review',
    description: 'Applications waiting for your review will appear here.',
  },
  active: {
    icon: BriefcaseIcon,
    title: 'No active candidates',
    description: 'Candidates moving through interviews will appear here.',
  },
  offer: {
    icon: FlagIcon,
    title: 'No offers out yet',
    description: 'Candidates who reach the offer stage will show up here.',
  },
  hired: {
    icon: SealCheckIcon,
    title: 'No hires yet',
    description: 'Candidates you hire will be collected here.',
  },
  archived: {
    icon: ArchiveIcon,
    title: 'No archived candidates',
    description: 'Rejected or withdrawn candidates will appear here.',
  },
};

interface PipelineContentProps {
  showSkeleton: boolean;
  activeTab: PipelineTab;
  jobs: PipelineJob[];
  candidates: PipelineCandidate[];
  orgId: string;
  namesMap: Map<string, CandidateProfile>;
  searchQuery: string;
  sorting: PipelineCandidateSorting;
  hasNextCandidatePage?: boolean;
  isFetchingNextCandidatePage?: boolean;
  isFetchNextCandidatePageError: boolean;
  onCandidateClick?: (id: string) => void;
  onCandidateLoadMore: () => void;
  onCandidateRowSelectionChange: OnChangeFn<RowSelectionState>;
  onClearSearch: () => void;
  onCandidateSortChange: (sorting: PipelineCandidateSorting) => void;
  candidateRowSelection: RowSelectionState;
  maxCandidateSelection?: number;
  onAccordionCandidateClick: (id: string, job: PipelineJob) => void;
  hasNextJobPage: boolean;
  isFetchingNextJobPage: boolean;
  isFetchNextJobPageError: boolean;
  onJobLoadMore: () => void;
}

interface JobAccordionItemProps {
  job: PipelineJob;
  index: number;
  orgId: string;
  stageType: StageType;
  onAccordionCandidateClick: (applicationId: string, job: PipelineJob) => void;
}

export function PipelineContent({
  showSkeleton,
  activeTab,
  jobs,
  candidates,
  orgId,
  namesMap,
  searchQuery,
  sorting,
  hasNextCandidatePage,
  isFetchingNextCandidatePage,
  isFetchNextCandidatePageError,
  onCandidateClick,
  onCandidateLoadMore,
  onCandidateRowSelectionChange,
  onClearSearch,
  onCandidateSortChange,
  candidateRowSelection,
  maxCandidateSelection,
  onAccordionCandidateClick,
  hasNextJobPage,
  isFetchingNextJobPage,
  isFetchNextJobPageError,
  onJobLoadMore,
}: PipelineContentProps) {
  if (showSkeleton) {
    return <GlobalPipelineContentSkeleton activeTab={activeTab} />;
  }

  const isSearching = Boolean(searchQuery);

  if (activeTab === 'active') {
    if (jobs.length === 0) {
      if (searchQuery) {
        return <PipelineSearchEmptyState subject="jobs" onClear={onClearSearch} />;
      }

      return (
        <EmptyStatePanel
          fill
          icon={EMPTY_BY_TAB.active.icon}
          title={EMPTY_BY_TAB.active.title}
          description={EMPTY_BY_TAB.active.description}
        />
      );
    }

    const jobAccordionItems = jobs.map((job, index) => (
      <JobAccordionItem
        key={job.id}
        job={job}
        index={index}
        orgId={orgId}
        stageType={activeTab}
        onAccordionCandidateClick={onAccordionCandidateClick}
      />
    ));

    return (
      <PageContainer className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-6">
        {jobAccordionItems}
        <InfiniteCollectionStatus
          hasNextPage={!isSearching && hasNextJobPage}
          isFetchingNextPage={isFetchingNextJobPage}
          isFetchNextPageError={isFetchNextJobPageError}
          loadingLabel="Loading jobs..."
          errorLabel="Could not load more jobs."
          onLoadMore={onJobLoadMore}
        />
      </PageContainer>
    );
  }

  if (candidates.length === 0) {
    if (searchQuery) {
      return <PipelineSearchEmptyState subject="candidates" onClear={onClearSearch} />;
    }

    const empty = EMPTY_BY_TAB[activeTab];

    return <EmptyStatePanel fill icon={empty.icon} title={empty.title} description={empty.description} />;
  }

  if (activeTab === 'archived') {
    return (
      <PageContainer className="flex min-h-0 flex-1 flex-col pb-6">
        <ArchivedCandidateTable
          className="min-h-0"
          maxHeightClassName="max-h-full"
          candidates={candidates}
          namesMap={namesMap}
          orgId={orgId}
          sorting={sorting}
          hasNextPage={!isSearching && hasNextCandidatePage}
          loadingMore={isFetchingNextCandidatePage}
          maxSelectedRows={maxCandidateSelection}
          onCandidateClick={onCandidateClick}
          onLoadMore={onCandidateLoadMore}
          onRowSelectionChange={onCandidateRowSelectionChange}
          rowSelection={candidateRowSelection}
          onSortChange={onCandidateSortChange}
        />
        {isFetchNextCandidatePageError && (
          <InfiniteCollectionStatus
            hasNextPage={false}
            isFetchingNextPage={false}
            isFetchNextPageError
            loadingLabel=""
            errorLabel="Could not load more candidates."
            onLoadMore={onCandidateLoadMore}
          />
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex min-h-0 flex-1 flex-col pb-6">
      <CandidateTable
        className="min-h-0"
        maxHeightClassName="max-h-full"
        variant={activeTab}
        candidates={candidates}
        namesMap={namesMap}
        orgId={orgId}
        sorting={sorting}
        hasNextPage={!isSearching && hasNextCandidatePage}
        loadingMore={isFetchingNextCandidatePage}
        maxSelectedRows={maxCandidateSelection}
        onCandidateClick={onCandidateClick}
        onLoadMore={onCandidateLoadMore}
        onRowSelectionChange={onCandidateRowSelectionChange}
        rowSelection={candidateRowSelection}
        onSortChange={onCandidateSortChange}
      />
      {isFetchNextCandidatePageError && (
        <InfiniteCollectionStatus
          hasNextPage={false}
          isFetchingNextPage={false}
          isFetchNextPageError
          loadingLabel=""
          errorLabel="Could not load more candidates."
          onLoadMore={onCandidateLoadMore}
        />
      )}
    </PageContainer>
  );
}

function PipelineSearchEmptyState({ subject, onClear }: { subject: 'candidates' | 'jobs'; onClear: () => void }) {
  return (
    <EmptyStatePanel
      fill
      icon={MagnifyingGlassMinusIcon}
      title={`No ${subject} match`}
      description="Try a different search or clear the search."
    >
      <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
        Clear search
      </Button>
    </EmptyStatePanel>
  );
}

const JobAccordionItem = memo(function JobAccordionItem({
  job,
  index,
  orgId,
  stageType,
  onAccordionCandidateClick,
}: JobAccordionItemProps) {
  const handleCandidateClick = useCallback(
    (applicationId: string) => {
      onAccordionCandidateClick(applicationId, job);
    },
    [job, onAccordionCandidateClick],
  );

  return (
    <JobAccordion
      job={job}
      orgId={orgId}
      stageType={stageType}
      defaultExpanded={index === 0}
      onApplicationClick={handleCandidateClick}
    />
  );
});
