import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { qk } from '@/hooks/query-keys';
import { getArchivedKanban, getKanban } from '@/lib/api/jobs-pipeline';
import { mergeKanbanStagePage } from '@/lib/pipeline/kanban-pagination';
import type { ArchivedResponse, KanbanFilters, KanbanResponse } from '@/lib/schemas/pipeline';

const KANBAN_PAGE_SIZE = 50;
const ARCHIVED_PAGE_SIZE = 50;
const DEFAULT_KANBAN_FILTERS: KanbanFilters = {};

export function useQueryKanban(jobId: string | null, filters: KanbanFilters = DEFAULT_KANBAN_FILTERS) {
  const queryClient = useQueryClient();
  const loadingStageIdsRef = useRef(new Set<string>());
  const failedStageIdsRef = useRef(new Set<string>());
  const [loadingStageIds, setLoadingStageIds] = useState<string[]>([]);
  const [failedStageIds, setFailedStageIds] = useState<string[]>([]);
  const baseFilters = useMemo(() => ({ ...filters, limit: KANBAN_PAGE_SIZE }), [filters]);
  const queryKey = qk.jobs.kanban(jobId, baseFilters);
  const query = useQuery<KanbanResponse>({
    queryKey,
    queryFn: jobId ? () => getKanban(jobId, baseFilters) : skipToken,
    staleTime: STALE_TIME_SHORT,
  });

  useEffect(() => {
    loadingStageIdsRef.current.clear();
    failedStageIdsRef.current.clear();
    setLoadingStageIds([]);
    setFailedStageIds([]);
  }, [baseFilters, jobId]);

  const loadNextStage = useCallback(
    async (stageId: string) => {
      if (!jobId || loadingStageIdsRef.current.has(stageId) || failedStageIdsRef.current.has(stageId)) {
        return;
      }

      const current = queryClient.getQueryData<KanbanResponse>(queryKey);
      const stage = current?.stages.find((item) => item.id === stageId);

      if (!current || !stage?.nextCursor) {
        return;
      }

      const cursor = stage.nextCursor;
      loadingStageIdsRef.current.add(stageId);
      setLoadingStageIds((ids) => [...ids, stageId]);

      try {
        const page = await queryClient.fetchQuery({
          queryKey: qk.jobs.kanbanStagePage(jobId, baseFilters, stageId, cursor),
          queryFn: () => getKanban(jobId, { ...baseFilters, stage: stageId, cursor }),
          staleTime: STALE_TIME_SHORT,
        });
        queryClient.setQueryData<KanbanResponse>(queryKey, (latest) =>
          latest ? mergeKanbanStagePage(latest, page, stageId) : latest,
        );
      } catch {
        failedStageIdsRef.current.add(stageId);
        setFailedStageIds((ids) => (ids.includes(stageId) ? ids : [...ids, stageId]));
      } finally {
        loadingStageIdsRef.current.delete(stageId);
        setLoadingStageIds((ids) => ids.filter((id) => id !== stageId));
      }
    },
    [baseFilters, jobId, queryClient, queryKey],
  );

  const retryStage = useCallback(
    (stageId: string) => {
      failedStageIdsRef.current.delete(stageId);
      setFailedStageIds((ids) => ids.filter((id) => id !== stageId));
      loadNextStage(stageId);
    },
    [loadNextStage],
  );

  return { ...query, kanbanQueryKey: queryKey, loadNextStage, retryStage, loadingStageIds, failedStageIds };
}

export function useQueryArchivedApplications(jobId: string | null) {
  const query = useInfiniteQuery<ArchivedResponse>({
    queryKey: qk.jobs.archivedKanban(jobId),
    queryFn: jobId
      ? ({ pageParam }) =>
          getArchivedKanban(jobId, {
            cursor: pageParam as string | undefined,
            limit: ARCHIVED_PAGE_SIZE,
          })
      : skipToken,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
    staleTime: STALE_TIME_SHORT,
  });
  const archived = useMemo(() => query.data?.pages.flatMap((page) => page.archived) ?? [], [query.data?.pages]);
  const total = query.data?.pages[0]?.total ?? 0;

  return { ...query, archived, total };
}
