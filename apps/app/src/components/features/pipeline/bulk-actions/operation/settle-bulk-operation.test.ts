import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BulkOperation } from '@/lib/schemas/bulk-operations';
import { settleBulkOperation } from './settle-bulk-operation';

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess },
}));

const completedOperation = createOperation('completed');

describe('settleBulkOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes the sheet and confirms a clean completion', () => {
    const onCompleted = vi.fn();
    const onOpenChange = vi.fn();

    settleBulkOperation({
      operation: completedOperation,
      successMessage: 'Tags assigned',
      onCompleted,
      onOpenChange,
    });

    expect(onCompleted).toHaveBeenCalledWith(['application-1', 'application-2']);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Tags assigned');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps a partial result open while removing succeeded rows from the selection', () => {
    const onCompleted = vi.fn();
    const onOpenChange = vi.fn();

    settleBulkOperation({
      operation: createOperation('completed_with_errors'),
      successMessage: 'Tags assigned',
      onCompleted,
      onOpenChange,
    });

    expect(onCompleted).toHaveBeenCalledWith(['application-1']);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

function createOperation(status: BulkOperation['status']): BulkOperation {
  return {
    id: 'operation-1',
    operationType: 'application.assign_candidate_tag',
    operationVersion: 1,
    targetType: 'application',
    status,
    targetCount: 2,
    parameters: null,
    committedAt: '2026-09-01T00:00:00.000Z',
    startedAt: '2026-09-01T00:00:01.000Z',
    completedAt: '2026-09-01T00:00:02.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:02.000Z',
    counts: {
      ready: 0,
      excluded: 0,
      pending: 0,
      processing: 0,
      waiting: 0,
      succeeded: status === 'completed' ? 2 : 1,
      skipped: status === 'completed_with_errors' ? 1 : 0,
      failed: 0,
    },
    items: [
      {
        id: 'item-1',
        ordinal: 1,
        selectedTargetId: 'application-1',
        status: 'succeeded',
        exclusion: null,
        error: null,
        application: null,
        completedAt: '2026-09-01T00:00:02.000Z',
      },
      {
        id: 'item-2',
        ordinal: 2,
        selectedTargetId: 'application-2',
        status: status === 'completed_with_errors' ? 'skipped' : 'succeeded',
        exclusion: null,
        error: status === 'completed_with_errors' ? { code: 'target_changed', message: null } : null,
        application: null,
        completedAt: '2026-09-01T00:00:02.000Z',
      },
    ],
  };
}
