import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageContainer } from '@comitium/ui/page-container';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CandidateSheetMount, type CandidateSheetSelection } from '@/components/features/candidate-sheet';
import { CreateJobDialog } from '@/components/features/jobs-list/create-job-dialog';
import { BulkOperations } from '@/components/features/pipeline/bulk-actions';
import { BulkOperationsUnavailable } from '@/components/features/pipeline/bulk-actions/bulk-operations-unavailable';
import { usePipelineBulkSelection } from '@/components/features/pipeline/bulk-actions/hooks/use-pipeline-bulk-selection';
import { filterPipelineCandidates, filterPipelineJobs } from '@/components/features/pipeline/shared/pipeline-search';
import { PipelineSearchInput } from '@/components/features/pipeline/shared/pipeline-search-input';
import { PipelineStageControlsSkeleton } from '@/components/features/pipeline/shared/pipeline-skeletons';
import { ArchivedPipelineButton, StageTypeTabs } from '@/components/features/pipeline/shared/stage-type-tabs';
import { useQueryBulkOperationCapabilities } from '@/hooks/queries/use-query-bulk-operation-capabilities';
import { useQueryJobCreationContext } from '@/hooks/queries/use-query-job-creation-context';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import {
  getFlatPipelineCandidates,
  useInfiniteQueryPipelineCandidates,
} from '@/hooks/queries/use-query-pipeline-candidates';
import { getFlatPipelineJobs, useInfiniteQueryPipelineJobs } from '@/hooks/queries/use-query-pipeline-jobs';
import { useQueryPipelineSummary } from '@/hooks/queries/use-query-pipeline-summary';
import { useDecryptCandidateNames } from '@/hooks/use-decrypt-candidate-names';
import { usePermissions } from '@/hooks/use-permissions';
import type { PipelineCandidate, PipelineCandidateSorting, PipelineJob, StageType } from '@/lib/schemas/pipeline';
import type { PipelineTab } from '../types';
import { DashboardEmptyState } from './empty-state';
import { PipelineContent } from './pipeline-content';

interface GlobalPipelineDashboardProps {
  org: MyOrg;
  activeTab: PipelineTab;
  onTabChange: (tab: PipelineTab) => void;
}

type CandidateTableTab = Exclude<PipelineTab, 'active'>;

const DEFAULT_CANDIDATE_SORTING: Record<CandidateTableTab, PipelineCandidateSorting> = {
  review: { sort: 'applied', direction: 'desc' },
  offer: { sort: 'applied', direction: 'desc' },
  hired: { sort: 'applied', direction: 'desc' },
  archived: { sort: 'terminal', direction: 'desc' },
};

export function GlobalPipelineDashboard({ org, activeTab, onTabChange }: GlobalPipelineDashboardProps) {
  const [selectedApp, setSelectedApp] = useState<CandidateSheetSelection | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sortingByTab, setSortingByTab] = useState(DEFAULT_CANDIDATE_SORTING);
  const [search, setSearch] = useState('');
  const { isAdmin } = usePermissions();
  const { data: creationContext } = useQueryJobCreationContext(org.id);
  const searchQuery = search.trim();
  const isActiveTab = activeTab === 'active';
  const isCandidateTableView = !isActiveTab;
  const bulkCapabilitiesQuery = useQueryBulkOperationCapabilities(isCandidateTableView ? org.id : null);
  const maxBulkSelection = bulkCapabilitiesQuery.data?.maxItems;
  const canCreateJob = creationContext?.orgWide === true || (creationContext?.departmentIds.length ?? 0) > 0;

  useEffect(() => {
    setSelectedApp(null);
    setSearch('');
  }, [activeTab, org.id]);

  const isArchived = activeTab === 'archived';
  const stageTypeFilter: StageType | undefined = isArchived ? undefined : activeTab;
  const candidateTableTab: CandidateTableTab = activeTab === 'active' ? 'review' : activeTab;
  const candidateSorting = sortingByTab[candidateTableTab];

  const { data: summary, isError: isSummaryError, refetch: refetchSummary } = useQueryPipelineSummary(org.id);

  const candidateFilters = useMemo(
    () => ({
      stageType: stageTypeFilter,
      view: isArchived ? ('archived' as const) : ('active' as const),
      sort: candidateSorting.sort,
      direction: candidateSorting.direction,
      limit: 50,
    }),
    [candidateSorting, isArchived, stageTypeFilter],
  );

  const jobsFilters = useMemo(() => ({ limit: 50 }), []);
  const {
    data: jobsData,
    isLoading: isJobsLoading,
    fetchNextPage: fetchNextJobPage,
    hasNextPage: hasNextJobPage,
    isFetchingNextPage: isFetchingNextJobPage,
    isFetchNextPageError: isFetchNextJobPageError,
    isError: isJobsError,
    refetch: refetchJobs,
  } = useInfiniteQueryPipelineJobs(isActiveTab ? org.id : undefined, jobsFilters);
  const {
    data: candidatesData,
    fetchNextPage: fetchNextCandidatePage,
    hasNextPage: hasNextCandidatePage,
    isFetchingNextPage: isFetchingNextCandidatePage,
    isLoading: isCandidatesLoading,
    isFetchNextPageError: isFetchNextCandidatePageError,
    isError: isCandidatesError,
    refetch: refetchCandidates,
  } = useInfiniteQueryPipelineCandidates(isCandidateTableView ? org.id : undefined, candidateFilters);

  const jobs = useMemo(() => getFlatPipelineJobs(jobsData), [jobsData]);
  const candidates = useMemo(() => getFlatPipelineCandidates(candidatesData), [candidatesData]);
  const namesMap = useDecryptCandidateNames(candidates, org.id);
  const filteredJobs = useMemo(() => filterPipelineJobs(jobs, searchQuery), [jobs, searchQuery]);
  const filteredCandidates = useMemo(
    () => filterPipelineCandidates(candidates, namesMap, searchQuery, 'global'),
    [candidates, namesMap, searchQuery],
  );
  const candidateIds = useMemo(() => filteredCandidates.map((candidate) => candidate.id), [filteredCandidates]);
  const showSkeleton = isActiveTab ? isJobsLoading && !jobsData : isCandidatesLoading && candidates.length === 0;
  const bulkSelection = usePipelineBulkSelection(filteredCandidates, maxBulkSelection);

  useEffect(() => {
    bulkSelection.clear();
  }, [activeTab, bulkSelection.clear, org.id]);

  const selectFromCandidate = useCallback(
    (candidate: PipelineCandidate): CandidateSheetSelection => ({
      id: candidate.id,
      jobId: candidate.jobId,
      jobOnChainId: candidate.jobOnChainId,
      jobTitle: candidate.jobTitle,
      stages: [],
    }),
    [],
  );

  const handleTableCandidateClick = useCallback(
    (candidateId: string) => {
      const candidate = candidates.find((c) => c.id === candidateId);

      if (candidate) {
        setSelectedApp(selectFromCandidate(candidate));
      }
    },
    [candidates, selectFromCandidate],
  );

  const handleAccordionCandidateClick = useCallback((candidateId: string, job: PipelineJob) => {
    setSelectedApp({
      id: candidateId,
      jobId: job.id,
      jobOnChainId: job.jobId,
      jobTitle: job.title,
      stages: job.stages,
    });
  }, []);

  const handleNavigate = useCallback(
    (appId: string) => {
      const candidate = candidates.find((c) => c.id === appId);

      if (candidate) {
        setSelectedApp(selectFromCandidate(candidate));
      }
    },
    [candidates, selectFromCandidate],
  );

  const handleApplicationSwitch = useCallback((app: OtherApplicationSummary) => {
    setSelectedApp({
      id: app.id,
      jobId: app.jobId,
      jobOnChainId: app.jobOnChainId,
      jobTitle: app.jobTitle,
      stages: [],
    });
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedApp(null);
  }, []);

  const handleSortChange = useCallback(
    (value: PipelineCandidateSorting) => {
      if (activeTab === 'active') {
        return;
      }

      setSortingByTab((current) => ({
        ...current,
        [activeTab]: value,
      }));
      bulkSelection.clear();
    },
    [activeTab, bulkSelection.clear],
  );

  const handleCandidateLoadMore = useCallback(() => {
    if (!hasNextCandidatePage || isFetchingNextCandidatePage) {
      return;
    }

    fetchNextCandidatePage();
  }, [fetchNextCandidatePage, hasNextCandidatePage, isFetchingNextCandidatePage]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      bulkSelection.clear();
    },
    [bulkSelection.clear],
  );

  const handleClearSearch = useCallback(() => {
    setSearch('');
    bulkSelection.clear();
  }, [bulkSelection.clear]);

  const handleJobLoadMore = useCallback(() => {
    if (!hasNextJobPage || isFetchingNextJobPage) {
      return;
    }

    fetchNextJobPage();
  }, [fetchNextJobPage, hasNextJobPage, isFetchingNextJobPage]);

  const handleArchivedTabClick = useCallback(() => {
    onTabChange('archived');
  }, [onTabChange]);

  const handleCreateJobClick = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleRetryCurrentView = useCallback(() => {
    refetchSummary();

    if (isActiveTab) {
      refetchJobs();

      return;
    }

    refetchCandidates();
  }, [isActiveTab, refetchCandidates, refetchJobs, refetchSummary]);

  const hasNoPipelineData = summary && summary.jobCount === 0 && summary.archived === 0;

  if (hasNoPipelineData) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <DashboardEmptyState isAdmin={isAdmin} onCreateJob={canCreateJob ? handleCreateJobClick : undefined} />
        <CreateJobDialog orgId={org.id} open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    );
  }

  if (isSummaryError || (isActiveTab && isJobsError) || (!isActiveTab && isCandidatesError)) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-6">
        <EmptyState
          icon={WarningCircleIcon}
          title="Pipeline could not be loaded"
          description="Retry the request before continuing."
        >
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRetryCurrentView}>
            Try again
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="z-20 shrink-0 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
        <PageContainer className="flex flex-col gap-3 py-4 xl:flex-row xl:items-center xl:justify-between xl:py-6">
          {summary ? (
            <>
              <div className="min-w-0 overflow-x-auto scrollbar-hide">
                <StageTypeTabs counts={summary.stageTypes} activeTab={activeTab} onTabChange={onTabChange} />
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <PipelineSearchInput
                  className="min-w-0 flex-1 xl:w-64 xl:flex-none"
                  placeholder={isActiveTab ? 'Search jobs...' : 'Search candidates...'}
                  value={search}
                  onValueChange={handleSearchChange}
                />
                <ArchivedPipelineButton
                  count={summary.archived}
                  active={activeTab === 'archived'}
                  onClick={handleArchivedTabClick}
                />
              </div>
            </>
          ) : (
            <PipelineStageControlsSkeleton activeTab={activeTab} showSearch />
          )}
        </PageContainer>
      </div>

      {isCandidateTableView && bulkCapabilitiesQuery.isError ? (
        <BulkOperationsUnavailable retry={() => void bulkCapabilitiesQuery.refetch()} />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <PipelineContent
          showSkeleton={showSkeleton}
          activeTab={activeTab}
          jobs={filteredJobs}
          candidates={filteredCandidates}
          orgId={org.id}
          namesMap={namesMap}
          searchQuery={searchQuery}
          sorting={candidateSorting}
          hasNextCandidatePage={hasNextCandidatePage}
          isFetchingNextCandidatePage={isFetchingNextCandidatePage}
          isFetchNextCandidatePageError={isFetchNextCandidatePageError}
          onCandidateClick={handleTableCandidateClick}
          onCandidateLoadMore={handleCandidateLoadMore}
          onCandidateRowSelectionChange={bulkSelection.onRowSelectionChange}
          onClearSearch={handleClearSearch}
          onCandidateSortChange={handleSortChange}
          candidateRowSelection={bulkSelection.rowSelection}
          maxCandidateSelection={maxBulkSelection}
          onAccordionCandidateClick={handleAccordionCandidateClick}
          hasNextJobPage={Boolean(hasNextJobPage)}
          isFetchingNextJobPage={isFetchingNextJobPage}
          isFetchNextJobPageError={isFetchNextJobPageError}
          onJobLoadMore={handleJobLoadMore}
        />
      </div>

      <CandidateSheetMount
        selectedApp={selectedApp}
        orgId={org.id}
        onClose={handleSheetClose}
        onNavigate={isCandidateTableView ? handleNavigate : undefined}
        onApplicationSwitch={handleApplicationSwitch}
        candidateIds={isCandidateTableView ? candidateIds : undefined}
      />

      {isCandidateTableView ? (
        <BulkOperations
          key={org.id}
          activeTab={activeTab}
          selectedApplications={bulkSelection.selectedApplications}
          pipelineApplications={candidates}
          namesMap={namesMap}
          orgId={org.id}
          maxItems={maxBulkSelection}
          onClear={bulkSelection.clear}
          onCompleted={bulkSelection.removeCompleted}
        />
      ) : null}
    </div>
  );
}
