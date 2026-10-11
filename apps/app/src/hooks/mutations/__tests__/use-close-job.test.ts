import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  closeJob: vi.fn(),
  invalidateQueries: vi.fn(),
  onCompleted: vi.fn(),
  mutationOptions: null as object | null,
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: object) => {
    mocks.mutationOptions = options;

    return { mutate: vi.fn(), isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), loading: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/api/jobs', () => ({ closeJob: mocks.closeJob }));

import { useCloseJob } from '../use-close-job';

const params = { orgId: 'org-1', jobId: 'job-1', closeReasonId: 'reason-1', expectedVersion: 1 };
type Options = {
  mutationFn: (input: typeof params) => Promise<{ version: number }>;
  onSuccess: (result: { version: number }, input: typeof params) => Promise<void>;
};

function options(): Options {
  useCloseJob({ onCompleted: mocks.onCompleted });

  return mocks.mutationOptions as Options;
}

describe('useCloseJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.closeJob.mockResolvedValue({ version: 2 });
  });
  it('closes with the selected reason and expected version', async () => {
    const result = await options().mutationFn(params);

    expect(result).toEqual({ version: 2 });
    expect(mocks.closeJob).toHaveBeenCalledExactlyOnceWith(params.jobId, 1, params.closeReasonId);
  });
  it('refreshes job and pipeline after closing', async () => {
    const mutation = options();

    await mutation.onSuccess(await mutation.mutationFn(params), params);
    expect(mocks.closeJob).toHaveBeenCalledOnce();
    expect(mocks.invalidateQueries).toHaveBeenCalled();
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
  });
});
