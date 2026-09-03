import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import type { BulkOperation, BulkOperationEmailPayload } from '@/lib/schemas/bulk-operations';
import { useBulkOperation } from './use-bulk-operation';

const mocks = vi.hoisted(() => ({
  attachBulkOperationPayloads: vi.fn(),
  commitBulkOperation: vi.fn(),
  createBulkOperationDraft: vi.fn(),
  getBulkOperation: vi.fn(),
}));

vi.mock('@/lib/api/bulk-operations', () => mocks);

const ORG_ID = 'org-bulk-operation-test';
const APPLICATION_A = 'application-a';
const APPLICATION_B = 'application-b';

function operation(id: string, overrides: Partial<BulkOperation> = {}): BulkOperation {
  return {
    id,
    operationType: 'application.email',
    operationVersion: 1,
    targetType: 'application',
    status: 'draft',
    targetCount: 1,
    parameters: null,
    committedAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
    counts: {
      ready: 1,
      excluded: 0,
      pending: 0,
      processing: 0,
      waiting: 0,
      succeeded: 0,
      skipped: 0,
      failed: 0,
    },
    items: [],
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return wrapper;
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useBulkOperation', () => {
  it('creates one server draft for the exact open selection', async () => {
    const draft = operation('operation-a');
    mocks.createBulkOperationDraft.mockResolvedValue(draft);
    mocks.getBulkOperation.mockResolvedValue(draft);
    const hook = await renderHook(
      () =>
        useBulkOperation({
          orgId: ORG_ID,
          operationType: 'application.email',
          targetIds: [APPLICATION_A],
          open: true,
        }),
      { wrapper: createWrapper() },
    );

    await vi.waitFor(() => expect(hook.result.current.operation?.id).toBe(draft.id));
    expect(mocks.createBulkOperationDraft).toHaveBeenCalledTimes(1);
    expect(mocks.createBulkOperationDraft).toHaveBeenCalledWith(ORG_ID, {
      operationType: 'application.email',
      targetIds: [APPLICATION_A],
      idempotencyKey: expect.any(String),
    });
  });

  it('reuses the same random idempotency key when draft creation is retried', async () => {
    const draft = operation('operation-retried');

    mocks.createBulkOperationDraft.mockRejectedValueOnce(new TypeError('Response was lost')).mockResolvedValue(draft);
    mocks.getBulkOperation.mockResolvedValue(draft);

    const hook = await renderHook(
      () =>
        useBulkOperation({
          orgId: ORG_ID,
          operationType: 'application.email',
          targetIds: [APPLICATION_A],
          open: true,
        }),
      { wrapper: createWrapper() },
    );

    await vi.waitFor(() => expect(hook.result.current.error).not.toBeNull());

    const firstRequest = mocks.createBulkOperationDraft.mock.calls[0][1];

    hook.result.current.retryDraft();

    await vi.waitFor(() => expect(hook.result.current.operation?.id).toBe(draft.id));

    const retriedRequest = mocks.createBulkOperationDraft.mock.calls[1][1];

    expect(firstRequest.idempotencyKey).toBe(retriedRequest.idempotencyKey);
  });

  it('uses the exact organization and ordered target set as the client request identity', async () => {
    const firstDraft = operation('operation-first');
    const reorderedDraft = operation('operation-reordered');
    const otherOrgDraft = operation('operation-other-org');
    const drafts = new Map([
      [firstDraft.id, firstDraft],
      [reorderedDraft.id, reorderedDraft],
      [otherOrgDraft.id, otherOrgDraft],
    ]);

    mocks.createBulkOperationDraft
      .mockResolvedValueOnce(firstDraft)
      .mockResolvedValueOnce(reorderedDraft)
      .mockResolvedValueOnce(otherOrgDraft);
    mocks.getBulkOperation.mockImplementation(async (_orgId: string, operationId: string) => drafts.get(operationId));

    const hook = await renderHook(
      (props?: { orgId: string; targetIds: string[] }) =>
        useBulkOperation({
          orgId: props?.orgId ?? ORG_ID,
          operationType: 'application.email',
          targetIds: props?.targetIds ?? [],
          open: true,
        }),
      { initialProps: { orgId: ORG_ID, targetIds: [APPLICATION_A, APPLICATION_B] }, wrapper: createWrapper() },
    );

    await vi.waitFor(() => expect(hook.result.current.operation?.id).toBe(firstDraft.id));
    const firstIdempotencyKey = mocks.createBulkOperationDraft.mock.calls[0][1].idempotencyKey;

    await hook.rerender({ orgId: ORG_ID, targetIds: [APPLICATION_B, APPLICATION_A] });
    await vi.waitFor(() => expect(hook.result.current.operation?.id).toBe(reorderedDraft.id));
    expect(mocks.createBulkOperationDraft.mock.calls[1][1]).toMatchObject({
      targetIds: [APPLICATION_B, APPLICATION_A],
    });
    expect(mocks.createBulkOperationDraft.mock.calls[1][1].idempotencyKey).not.toBe(firstIdempotencyKey);

    await hook.rerender({ orgId: 'org-bulk-operation-other', targetIds: [APPLICATION_B, APPLICATION_A] });
    await vi.waitFor(() => expect(hook.result.current.operation?.id).toBe(otherOrgDraft.id));
    expect(mocks.createBulkOperationDraft.mock.calls[2][0]).toBe('org-bulk-operation-other');
  });

  it('uploads the bounded payload set once and commits the server operation', async () => {
    const draft = operation('operation-email');
    const running = operation(draft.id, {
      status: 'running',
      committedAt: '2026-08-31T00:01:00.000Z',
      startedAt: '2026-08-31T00:01:00.000Z',
      counts: { ...draft.counts, ready: 0, processing: 1 },
    });
    mocks.createBulkOperationDraft.mockResolvedValue(draft);
    mocks.getBulkOperation.mockResolvedValue(draft);
    mocks.attachBulkOperationPayloads.mockResolvedValue(draft);
    mocks.commitBulkOperation.mockResolvedValue(running);
    const hook = await renderHook(
      () =>
        useBulkOperation({
          orgId: ORG_ID,
          operationType: 'application.email',
          targetIds: [APPLICATION_A],
          open: true,
        }),
      { wrapper: createWrapper() },
    );
    const payload = {
      itemId: 'item-a',
      content: {},
      deliveryGrantKey: {},
    } as BulkOperationEmailPayload;

    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('draft'));
    await hook.result.current.commit({}, [payload]);

    expect(mocks.attachBulkOperationPayloads).toHaveBeenCalledOnce();
    expect(mocks.attachBulkOperationPayloads).toHaveBeenCalledWith(ORG_ID, draft.id, [payload]);
    expect(mocks.commitBulkOperation).toHaveBeenCalledWith(ORG_ID, draft.id, {
      parameters: {},
      excludedItemIds: undefined,
    });
  });

  it('does not commit through a stale callback after the draft is discarded', async () => {
    const draft = operation('operation-discarded');
    mocks.createBulkOperationDraft.mockResolvedValue(draft);
    mocks.getBulkOperation.mockResolvedValue(draft);
    const hook = await renderHook(
      () =>
        useBulkOperation({
          orgId: ORG_ID,
          operationType: 'application.email',
          targetIds: [APPLICATION_A],
          open: true,
        }),
      { wrapper: createWrapper() },
    );

    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('draft'));

    const staleCommit = hook.result.current.commit;

    hook.result.current.discardDraft();
    await staleCommit({});

    expect(mocks.attachBulkOperationPayloads).not.toHaveBeenCalled();
    expect(mocks.commitBulkOperation).not.toHaveBeenCalled();
  });

  it('does not commit when the draft is discarded while payload attachment is in flight', async () => {
    const draft = operation('operation-discarded-during-attachment');
    let finishAttachment: ((value: BulkOperation) => void) | undefined;
    const attachment = new Promise<BulkOperation>((resolve) => {
      finishAttachment = resolve;
    });
    mocks.createBulkOperationDraft.mockResolvedValue(draft);
    mocks.getBulkOperation.mockResolvedValue(draft);
    mocks.attachBulkOperationPayloads.mockReturnValue(attachment);
    const hook = await renderHook(
      () =>
        useBulkOperation({
          orgId: ORG_ID,
          operationType: 'application.email',
          targetIds: [APPLICATION_A],
          open: true,
        }),
      { wrapper: createWrapper() },
    );
    const payload = {
      itemId: 'item-a',
      content: {},
      deliveryGrantKey: {},
    } as BulkOperationEmailPayload;

    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('draft'));

    const commit = hook.result.current.commit({}, [payload]);

    await vi.waitFor(() => expect(mocks.attachBulkOperationPayloads).toHaveBeenCalledOnce());
    hook.result.current.discardDraft();
    finishAttachment?.(draft);
    await commit;

    expect(mocks.commitBulkOperation).not.toHaveBeenCalled();
  });

  it('keeps the terminal result visible when settled rows are removed from the selection', async () => {
    const draft = operation('operation-completed', {
      targetCount: 2,
      counts: {
        ready: 2,
        excluded: 0,
        pending: 0,
        processing: 0,
        waiting: 0,
        succeeded: 0,
        skipped: 0,
        failed: 0,
      },
    });
    const completed = operation(draft.id, {
      targetCount: 2,
      status: 'completed_with_errors',
      committedAt: '2026-08-31T00:01:00.000Z',
      startedAt: '2026-08-31T00:01:00.000Z',
      completedAt: '2026-08-31T00:02:00.000Z',
      counts: {
        ready: 0,
        excluded: 0,
        pending: 0,
        processing: 0,
        waiting: 0,
        succeeded: 1,
        skipped: 0,
        failed: 1,
      },
    });
    const replacementDraft = operation('operation-replacement');
    const onSettled = vi.fn();

    mocks.createBulkOperationDraft.mockResolvedValueOnce(draft).mockResolvedValueOnce(replacementDraft);
    mocks.getBulkOperation.mockResolvedValue(draft);
    mocks.commitBulkOperation.mockResolvedValue(completed);

    const hook = await renderHook(
      (props?: { targetIds: string[]; open: boolean }) =>
        useBulkOperation({
          orgId: ORG_ID,
          operationType: 'application.email',
          targetIds: props?.targetIds ?? [],
          open: props?.open ?? false,
          onSettled,
        }),
      { initialProps: { targetIds: [APPLICATION_A, APPLICATION_B], open: true }, wrapper: createWrapper() },
    );

    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('draft'));
    await hook.result.current.commit({});
    await vi.waitFor(() => expect(onSettled).toHaveBeenCalledWith(completed));

    await hook.rerender({ targetIds: [APPLICATION_B], open: true });

    expect(hook.result.current.operation).toEqual(completed);
    expect(mocks.createBulkOperationDraft).toHaveBeenCalledTimes(1);
  });

  it('keeps polling accepted work across selection changes and starts the next draft after it settles', async () => {
    const draft = operation('operation-running');
    const running = operation(draft.id, {
      status: 'running',
      committedAt: '2026-08-31T00:01:00.000Z',
      startedAt: '2026-08-31T00:01:00.000Z',
      counts: { ...draft.counts, ready: 0, processing: 1 },
    });
    const completed = operation(draft.id, {
      status: 'completed',
      committedAt: running.committedAt,
      startedAt: running.startedAt,
      completedAt: '2026-08-31T00:02:00.000Z',
      counts: { ...draft.counts, ready: 0, succeeded: 1 },
    });
    const secondDraft = operation('operation-b');
    let serverOperation = draft;

    mocks.createBulkOperationDraft.mockResolvedValueOnce(draft).mockResolvedValueOnce(secondDraft);
    mocks.getBulkOperation.mockImplementation(async (_orgId: string, operationId: string) =>
      operationId === draft.id ? serverOperation : secondDraft,
    );
    mocks.commitBulkOperation.mockImplementation(async () => {
      serverOperation = running;
      return running;
    });
    const hook = await renderHook(
      (props?: { targetIds: string[]; open: boolean }) =>
        useBulkOperation({
          orgId: ORG_ID,
          operationType: 'application.email',
          targetIds: props?.targetIds ?? [],
          open: props?.open ?? false,
        }),
      { initialProps: { targetIds: [APPLICATION_A], open: true }, wrapper: createWrapper() },
    );

    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('draft'));
    await hook.result.current.commit({});
    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('running'));
    await hook.rerender({ targetIds: [APPLICATION_A], open: false });
    hook.result.current.discardDraft();
    expect(hook.result.current.operation?.status).toBe('running');

    await hook.rerender({ targetIds: [APPLICATION_B], open: true });
    expect(hook.result.current.operation?.status).toBe('running');
    expect(mocks.createBulkOperationDraft).toHaveBeenCalledTimes(1);

    serverOperation = completed;
    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('completed'), { timeout: 3_000 });

    await hook.rerender({ targetIds: [APPLICATION_B], open: false });
    await vi.waitFor(() => expect(hook.result.current.operation).toBeNull());

    await hook.rerender({ targetIds: [APPLICATION_B], open: true });
    await vi.waitFor(() => expect(hook.result.current.operation?.id).toBe(secondDraft.id));
    await hook.rerender({ targetIds: [APPLICATION_B], open: false });
    hook.result.current.discardDraft();
    await vi.waitFor(() => expect(hook.result.current.operation).toBeNull());
  });

  it('reconciles an ambiguously accepted commit with the server while mounted', async () => {
    const draft = operation('operation-ambiguous');
    const running = operation(draft.id, {
      status: 'running',
      committedAt: '2026-08-31T00:01:00.000Z',
      startedAt: '2026-08-31T00:01:00.000Z',
      counts: { ...draft.counts, ready: 0, processing: 1 },
    });
    let serverOperation = draft;
    mocks.createBulkOperationDraft.mockResolvedValue(draft);
    mocks.getBulkOperation.mockImplementation(async () => serverOperation);
    mocks.commitBulkOperation.mockImplementation(async () => {
      serverOperation = running;
      throw new TypeError('Response was lost');
    });
    const props = {
      orgId: ORG_ID,
      operationType: 'application.email' as const,
      targetIds: [APPLICATION_A],
      open: true,
    };
    const hook = await renderHook(() => useBulkOperation(props), { wrapper: createWrapper() });

    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('draft'));
    await hook.act(() => hook.result.current.commit({}));
    await vi.waitFor(() => expect(hook.result.current.operation?.status).toBe('running'));
    expect(hook.result.current.error).toBeNull();

    expect(mocks.createBulkOperationDraft).toHaveBeenCalledTimes(1);
    expect(mocks.getBulkOperation).toHaveBeenCalledWith(ORG_ID, draft.id);
  });
});
