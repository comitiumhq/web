import { useMemo } from 'react';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import { useQueryKanban } from '@/hooks/queries/use-query-kanban';
import { useQueryPipeline } from '@/hooks/queries/use-query-pipeline';
import type { KanbanFilters, KanbanStage, PipelineCandidate, StageTypeCounts } from '@/lib/schemas/pipeline';

import type { PipelineTab } from './types';

const EMPTY_KANBAN_FILTERS: KanbanFilters = {};

export function usePipelineData(
  jobIdParam: string,
  activeTab: PipelineTab,
  filters: KanbanFilters = EMPTY_KANBAN_FILTERS,
) {
  const { data: job, isLoading: isLoadingJob } = useQueryJobSummary(jobIdParam);
  const { data: pipeline, isLoading: isLoadingPipeline, error: pipelineError } = useQueryPipeline(jobIdParam);
  const {
    data: kanban,
    isLoading: isLoadingKanban,
    error: kanbanError,
    refetch: refetchKanban,
    kanbanQueryKey,
    loadNextStage,
    retryStage,
    loadingStageIds,
    failedStageIds,
  } = useQueryKanban(jobIdParam, filters);

  const allStages = useMemo((): KanbanStage[] => kanban?.stages ?? [], [kanban?.stages]);

  const isArchived = activeTab === 'archived';

  const filteredStages = useMemo(() => {
    if (isArchived) {
      return [];
    }

    return allStages.filter((stage) => stage.stageType === activeTab);
  }, [activeTab, allStages, isArchived]);

  const stageTypeCounts = useMemo((): StageTypeCounts => {
    const counts: StageTypeCounts = { lead: 0, review: 0, active: 0, offer: 0, hired: 0 };

    for (const stage of allStages) {
      counts[stage.stageType] += stage.total;
    }

    return counts;
  }, [allStages]);

  const tableCandidates = useMemo((): PipelineCandidate[] => {
    if (!job || filteredStages.length === 0) {
      return [];
    }

    return filteredStages.flatMap((stage) =>
      stage.applications.map((app) => ({
        id: app.id,
        candidateId: app.candidateId,
        candidateProfile: app.candidateProfile,
        jobId: job.id,
        jobOnChainId: job.jobId,
        jobTitle: job.title,
        appliedAt: app.appliedAt,
        responseDeadline: app.responseDeadline,
        isResponded: app.isResponded,
        terminalOutcome: app.terminalOutcome,
        terminalOutcomeAt: app.terminalOutcomeAt,
        currentStageId: app.currentStageId,
        currentStageName: stage.name,
        currentStageEnteredAt: app.currentStageEnteredAt,
        interviewStatus: app.interviewStatus,
        interviewScheduledAt: app.interviewScheduledAt,
        stageType: stage.stageType,
        archivedAt: null,
        archivedAtStageName: null,
        archiveReasonId: null,
        archiveReasonLabel: null,
        archiveReasonType: null,
        searchProjection: app.searchProjection,
        criterionSummary: app.criterionSummary,
        updatedAt: app.updatedAt,
        tagIds: app.tagIds,
        reviewStatus: app.reviewStatus,
        duplicateAttemptCount: app.duplicateAttemptCount,
      })),
    );
  }, [job, filteredStages]);

  return {
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
    archivedCount: kanban?.archivedCount ?? 0,
    kanbanQueryKey: job ? kanbanQueryKey : undefined,
    loadNextStage,
    retryStage,
    loadingStageIds,
    failedStageIds,
  };
}
