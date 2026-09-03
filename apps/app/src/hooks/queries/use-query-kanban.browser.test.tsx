import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { qk } from '@/hooks/query-keys';
import type { KanbanApplication, KanbanFilters, KanbanResponse, KanbanStage } from '@/lib/schemas/pipeline';
import { useQueryKanban } from './use-query-kanban';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const mocks = vi.hoisted(() => ({
  getKanban: vi.fn(),
}));

vi.mock('@/lib/api/jobs-pipeline', () => ({
  getArchivedKanban: vi.fn(),
  getKanban: mocks.getKanban,
}));

const JOB_ID = 'job-1';
const STAGE_ID = 'stage-1';

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function application(id: string, stageId = STAGE_ID): KanbanApplication {
  return {
    id,
    candidateId: null,
    candidateProfile: null,
    appliedAt: '2026-08-28T08:00:00.000Z',
    responseDeadline: null,
    isResponded: true,
    terminalOutcome: null,
    terminalOutcomeAt: null,
    currentStageId: stageId,
    currentStageEnteredAt: null,
    searchProjection: null,
    criterionSummary: null,
    updatedAt: null,
    tagIds: [],
    interviewStatus: null,
    interviewScheduledAt: null,
    reviewStatus: {
      totalReviewers: 0,
      submittedReviewers: 0,
      currentUserHasPendingReview: false,
      currentUserHasSubmittedReview: false,
      needsDecision: false,
    },
    duplicateAttemptCount: 0,
  };
}

function stage(id: string, applications: KanbanApplication[], nextCursor: string | null): KanbanStage {
  return {
    id,
    name: id,
    stageOrder: id === STAGE_ID ? 0 : 1,
    stageType: 'active',
    applications,
    total: applications.length,
    nextCursor,
  };
}

function kanban(nextCursor: string | null = 'cursor-2'): KanbanResponse {
  return {
    stages: [stage(STAGE_ID, [application('application-1')], nextCursor)],
    archivedCount: 0,
  };
}

function page(applicationId = 'application-2'): KanbanResponse {
  return {
    stages: [stage(STAGE_ID, [application(applicationId)], null)],
    archivedCount: 0,
  };
}

function createHarness(filters: KanbanFilters = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  queryClient.setQueryData(qk.jobs.kanban(JOB_ID, { ...filters, limit: 50 }), kanban());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useQueryKanban', () => {
  it('coalesces concurrent pagination requests for the same stage', async () => {
    const request = deferred<KanbanResponse>();
    mocks.getKanban.mockReturnValue(request.promise);
    const { queryClient, wrapper } = createHarness();
    const hook = await renderHook(() => useQueryKanban(JOB_ID), { wrapper });

    const first = hook.result.current.loadNextStage(STAGE_ID);
    const second = hook.result.current.loadNextStage(STAGE_ID);

    await vi.waitFor(() => expect(mocks.getKanban).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(hook.result.current.loadingStageIds).toEqual([STAGE_ID]));

    request.resolve(page());
    await Promise.all([first, second]);

    await vi.waitFor(() => {
      const data = queryClient.getQueryData<KanbanResponse>(qk.jobs.kanban(JOB_ID, { limit: 50 }));
      expect(data?.stages[0]?.applications.map((item) => item.id)).toEqual(['application-1', 'application-2']);
    });
    await vi.waitFor(() => expect(hook.result.current.loadingStageIds).toEqual([]));
  });

  it('blocks automatic retries after failure and retries only on explicit request', async () => {
    mocks.getKanban.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(page());
    const { queryClient, wrapper } = createHarness();
    const hook = await renderHook(() => useQueryKanban(JOB_ID), { wrapper });

    await hook.result.current.loadNextStage(STAGE_ID);
    await vi.waitFor(() => expect(hook.result.current.failedStageIds).toEqual([STAGE_ID]));

    await hook.result.current.loadNextStage(STAGE_ID);
    expect(mocks.getKanban).toHaveBeenCalledTimes(1);

    hook.result.current.retryStage(STAGE_ID);

    await vi.waitFor(() => expect(mocks.getKanban).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(hook.result.current.failedStageIds).toEqual([]));
    await vi.waitFor(() => {
      const data = queryClient.getQueryData<KanbanResponse>(qk.jobs.kanban(JOB_ID, { limit: 50 }));
      expect(data?.stages[0]?.nextCursor).toBeNull();
    });
  });

  it('merges a page into the latest cache without replacing concurrent sibling updates', async () => {
    const request = deferred<KanbanResponse>();
    mocks.getKanban.mockReturnValue(request.promise);
    const { queryClient, wrapper } = createHarness();
    const queryKey = qk.jobs.kanban(JOB_ID, { limit: 50 });
    const hook = await renderHook(() => useQueryKanban(JOB_ID), { wrapper });

    const loading = hook.result.current.loadNextStage(STAGE_ID);
    await vi.waitFor(() => expect(mocks.getKanban).toHaveBeenCalledTimes(1));
    queryClient.setQueryData<KanbanResponse>(queryKey, (current) => ({
      ...(current ?? kanban()),
      stages: [...(current?.stages ?? kanban().stages), stage('stage-2', [application('sibling', 'stage-2')], null)],
    }));

    request.resolve(page());
    await loading;

    const data = queryClient.getQueryData<KanbanResponse>(queryKey);
    expect(data?.stages.map((item) => item.id)).toEqual([STAGE_ID, 'stage-2']);
    expect(data?.stages[1]?.applications[0]?.id).toBe('sibling');
  });

  it('clears a failed stage when the active filters change', async () => {
    mocks.getKanban.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(page('application-filtered'));
    const { queryClient, wrapper } = createHarness();
    const hook = await renderHook(
      (props?: { filters: KanbanFilters }) => useQueryKanban(JOB_ID, props?.filters ?? {}),
      { initialProps: { filters: {} }, wrapper },
    );

    await hook.result.current.loadNextStage(STAGE_ID);
    await vi.waitFor(() => expect(hook.result.current.failedStageIds).toEqual([STAGE_ID]));

    const nextFilters = { q: 'updated' };
    queryClient.setQueryData(qk.jobs.kanban(JOB_ID, { ...nextFilters, limit: 50 }), kanban());
    await hook.rerender({ filters: nextFilters });

    await vi.waitFor(() => expect(hook.result.current.failedStageIds).toEqual([]));
    await hook.result.current.loadNextStage(STAGE_ID);
    await vi.waitFor(() => expect(mocks.getKanban).toHaveBeenCalledTimes(2));
  });
});
