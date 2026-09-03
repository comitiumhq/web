import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KanbanApplication, KanbanResponse, KanbanStage } from '@/lib/schemas/pipeline';

const mocks = vi.hoisted(() => ({
  changeStage: vi.fn(),
  hasApiErrorCode: vi.fn(),
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: mocks.setQueryData,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

vi.mock('@/hooks/mutations/use-stage-change', () => ({
  useStageChange: () => ({ mutate: mocks.changeStage }),
}));

vi.mock('@/lib/api/client', () => ({
  hasApiErrorCode: mocks.hasApiErrorCode,
}));

import { useKanbanDrag } from '../use-kanban-drag';

const KANBAN_QUERY_KEY = ['jobs', 'job-1', 'kanban'] as const;

function application(id = 'application-1'): KanbanApplication {
  return {
    id,
    currentStageId: 'source-stage',
  } as KanbanApplication;
}

function stage(id: string, applications: KanbanApplication[], total = applications.length): KanbanStage {
  return {
    id,
    name: id,
    applications,
    total,
  } as KanbanStage;
}

function setup() {
  const source = stage('source-stage', [application()], 2);
  const destination = stage('destination-stage', [], 4);
  const stages = [source, destination];
  const handleDragEnd = useKanbanDrag({
    stages,
    jobId: 'job-1',
    kanbanQueryKey: KANBAN_QUERY_KEY,
  }).handleDragEnd;

  return { destination, handleDragEnd, source, stages };
}

describe('useKanbanDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasApiErrorCode.mockReturnValue(false);
  });

  it('moves the candidate optimistically and sends the expected-stage guard', () => {
    const { handleDragEnd, stages } = setup();

    expect(handleDragEnd('source-stage', 'destination-stage', 'application-1')).toBe(true);

    expect(mocks.setQueryData).toHaveBeenCalledExactlyOnceWith(KANBAN_QUERY_KEY, expect.any(Function));
    const update = mocks.setQueryData.mock.calls[0]?.[1] as (old: KanbanResponse) => KanbanResponse;
    const next = update({ stages, archivedCount: 0 });

    expect(next.stages[0]).toMatchObject({ applications: [], total: 1 });
    expect(next.stages[1]).toMatchObject({
      applications: [{ id: 'application-1', currentStageId: 'destination-stage' }],
      total: 5,
    });
    expect(mocks.changeStage).toHaveBeenCalledExactlyOnceWith(
      {
        applicationId: 'application-1',
        expectedStageId: 'source-stage',
        jobId: 'job-1',
        stageId: 'destination-stage',
      },
      expect.objectContaining({ onError: expect.any(Function), onSuccess: expect.any(Function) }),
    );
  });

  it.each([
    ['missing source stage', 'missing-stage', 'destination-stage', 'application-1'],
    ['missing destination stage', 'source-stage', 'missing-stage', 'application-1'],
    ['missing application', 'source-stage', 'destination-stage', 'missing-application'],
  ])('rejects %s without changing cache or server state', (_label, sourceId, destinationId, applicationId) => {
    const { handleDragEnd } = setup();

    expect(handleDragEnd(sourceId, destinationId, applicationId)).toBe(false);
    expect(mocks.setQueryData).not.toHaveBeenCalled();
    expect(mocks.changeStage).not.toHaveBeenCalled();
  });

  it('invalidates optimistic state and explains a concurrent stage conflict', () => {
    const { handleDragEnd } = setup();
    mocks.hasApiErrorCode.mockReturnValue(true);

    handleDragEnd('source-stage', 'destination-stage', 'application-1');
    const options = mocks.changeStage.mock.calls[0]?.[1] as { onError: (error: Error) => void };
    const error = new Error('conflict');
    options.onError(error);

    expect(mocks.invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: KANBAN_QUERY_KEY });
    expect(mocks.hasApiErrorCode).toHaveBeenCalledExactlyOnceWith(error, API_ERROR_CODES.stageConflict);
    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith('Stage was changed by another user. Refreshing...');
  });

  it('reports a generic move failure after restoring cache from the server', () => {
    const { handleDragEnd } = setup();

    handleDragEnd('source-stage', 'destination-stage', 'application-1');
    const options = mocks.changeStage.mock.calls[0]?.[1] as { onError: (error: Error) => void };
    options.onError(new Error('network failure'));

    expect(mocks.invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: KANBAN_QUERY_KEY });
    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith('Failed to move candidate');
  });
});
