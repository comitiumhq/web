import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageContainer } from '@comitium/ui/page-container';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CandidateSheet } from '@/components/features/candidate-sheet';
import type { CandidateTableVariant } from '@/components/features/pipeline/shared/candidate-table';
import { PerJobPipelinePageSkeleton } from '@/components/features/pipeline/shared/pipeline-skeletons';
import { ArchivedPipelineButton, StageTypeTabs } from '@/components/features/pipeline/shared/stage-type-tabs';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useDebounce } from '@/hooks/use-debounce';
import { useDecryptCandidateNames } from '@/hooks/use-decrypt-candidate-names';
import { useKanbanDrag } from '@/hooks/use-kanban-drag';
import { hasApiErrorCode } from '@/lib/api/client';
import type { KanbanApplication } from '@/lib/schemas/pipeline';

import { PerJobPipelineContent } from './per-job-content';
import type { PipelineTab } from './types';
import { usePipelineData } from './use-pipeline-data';

export type { PipelineTab } from './types';

interface PipelineViewProps {
  org: MyOrg;
  jobId: string;
  activeTab: PipelineTab;
  onTabChange: (tab: PipelineTab) => void;
  selectedApplicationId: string | null;
  onSelectedApplicationChange: (applicationId: string | null) => void;
}

export function PipelineView({
  org,
  jobId: jobIdParam,
  activeTab,
  onTabChange,
  selectedApplicationId,
  onSelectedApplicationChange,
}: PipelineViewProps) {
  const previousActiveTab = useRef(activeTab);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const searchQuery = search.trim();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    job,
    pipeline,
    pipelineError,
    isLoadingJob,
    isLoadingPipeline,
    isLoadingKanban,
    kanbanError,
    refetchKanban,
    allStages,
    filteredStages,
    stageTypeCounts,
    tableCandidates,
    archivedCount,
    kanbanQueryKey,
    loadNextStage,
    retryStage,
    loadingStageIds,
    failedStageIds,
  } = usePipelineData(jobIdParam, activeTab);

  const allApplications = useMemo(() => allStages.flatMap((s) => s.applications), [allStages]);
  const namesMap = useDecryptCandidateNames(allApplications, org.id);

  useEffect(() => {
    if (previousActiveTab.current === activeTab) {
      return;
    }

    previousActiveTab.current = activeTab;
    setSearch('');
    onSelectedApplicationChange(null);
  }, [activeTab, onSelectedApplicationChange]);

  const { handleDragEnd } = useKanbanDrag({
    stages: filteredStages,
    jobId: job?.id ?? '',
    kanbanQueryKey,
  });

  const handleCardClick = useCallback(
    (application: KanbanApplication) => {
      onSelectedApplicationChange(application.id);
    },
    [onSelectedApplicationChange],
  );

  const handleApplicationSwitch = useCallback(
    (app: OtherApplicationSummary) => {
      const targetJobId = String(app.jobId);

      if (targetJobId === jobIdParam) {
        onSelectedApplicationChange(app.id);

        return;
      }

      navigate({
        to: '/org/$orgId/jobs/$jobId/pipeline',
        params: { orgId: org.id, jobId: targetJobId },
        search: { tab: 'active', selected: app.id },
      });
    },
    [jobIdParam, navigate, onSelectedApplicationChange, org.id],
  );

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onSelectedApplicationChange(null);
      }
    },
    [onSelectedApplicationChange],
  );

  const handleArchivedTabClick = useCallback(() => {
    onTabChange('archived');
  }, [onTabChange]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch('');
  }, []);

  const handleLoadMoreTable = useCallback(() => {
    const stage = filteredStages.find(
      (item) => item.nextCursor && !loadingStageIds.includes(item.id) && !failedStageIds.includes(item.id),
    );

    if (stage) {
      loadNextStage(stage.id);
    }
  }, [failedStageIds, filteredStages, loadNextStage, loadingStageIds]);

  const handleRetryTable = useCallback(() => {
    const stage = filteredStages.find((item) => failedStageIds.includes(item.id));

    if (stage) {
      retryStage(stage.id);
    }
  }, [failedStageIds, filteredStages, retryStage]);

  const handleRetryKanban = useCallback(() => {
    refetchKanban();
  }, [refetchKanban]);

  useEffect(() => {
    if (!debouncedSearchQuery) {
      return;
    }

    const stage = filteredStages.find(
      (item) => item.nextCursor && !loadingStageIds.includes(item.id) && !failedStageIds.includes(item.id),
    );

    if (stage) {
      loadNextStage(stage.id);
    }
  }, [debouncedSearchQuery, failedStageIds, filteredStages, loadNextStage, loadingStageIds]);

  if (isLoadingJob || isLoadingPipeline) {
    return <PerJobPipelinePageSkeleton activeTab={activeTab} />;
  }

  if (hasApiErrorCode(pipelineError, API_ERROR_CODES.noPipeline)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-lg font-medium mb-2">No pipeline configured</p>
        <p className="text-sm text-muted-foreground">This job does not have a hiring pipeline attached.</p>
      </div>
    );
  }

  if (!pipeline || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Failed to load pipeline</p>
      </div>
    );
  }

  if (kanbanError) {
    return (
      <PageContainer className="flex h-full items-center justify-center py-6">
        <EmptyState
          icon={WarningCircleIcon}
          title="Candidates could not be loaded"
          description="Retry the pipeline request before continuing."
        >
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRetryKanban}>
            Try again
          </Button>
        </EmptyState>
      </PageContainer>
    );
  }

  const isArchived = activeTab === 'archived';
  const tableVariant = getCandidateTableVariant(activeTab);

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <PageContainer className="flex min-h-0 flex-1 flex-col gap-4 py-4 sm:py-5">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="min-w-0 overflow-x-auto scrollbar-hide">
              <StageTypeTabs counts={stageTypeCounts} activeTab={activeTab} onTabChange={onTabChange} />
            </div>

            <ArchivedPipelineButton
              count={archivedCount}
              active={activeTab === 'archived'}
              onClick={handleArchivedTabClick}
            />
          </div>

          <PerJobPipelineContent
            className="min-h-0 flex-1"
            isArchived={isArchived}
            showKanbanView={activeTab === 'active'}
            tableVariant={tableVariant}
            jobId={job.id}
            orgId={org.id}
            filteredStages={filteredStages}
            isLoadingKanban={isLoadingKanban}
            tableCandidates={tableCandidates}
            namesMap={namesMap}
            onCardClick={handleCardClick}
            onDragEnd={handleDragEnd}
            onCandidateClick={onSelectedApplicationChange}
            onLoadMoreStage={loadNextStage}
            onRetryStage={retryStage}
            loadingStageIds={loadingStageIds}
            failedStageIds={failedStageIds}
            search={search}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
            hasMoreTableCandidates={filteredStages.some(
              (stage) => Boolean(stage.nextCursor) && !failedStageIds.includes(stage.id),
            )}
            isLoadingMoreTableCandidates={filteredStages.some((stage) => loadingStageIds.includes(stage.id))}
            hasTableLoadError={filteredStages.some((stage) => failedStageIds.includes(stage.id))}
            onLoadMoreTableCandidates={handleLoadMoreTable}
            onRetryTableCandidates={handleRetryTable}
          />
        </PageContainer>
      </div>

      <CandidateSheet
        applicationId={selectedApplicationId}
        jobId={job.id}
        jobOnChainId={job.jobId}
        orgId={org.id}
        stages={pipeline.stages}
        jobTitle={job.title}
        open={!!selectedApplicationId}
        onOpenChange={handleSheetOpenChange}
        onNavigate={onSelectedApplicationChange}
        onApplicationSwitch={handleApplicationSwitch}
      />
    </>
  );
}

function getCandidateTableVariant(activeTab: PipelineTab): CandidateTableVariant {
  if (activeTab === 'offer' || activeTab === 'hired') {
    return activeTab;
  }

  return 'review';
}
