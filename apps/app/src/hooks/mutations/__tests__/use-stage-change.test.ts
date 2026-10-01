import { beforeEach, describe, expect, it, vi } from 'vitest';
import { qk } from '@/hooks/query-keys';

const mocks = vi.hoisted(() => ({
  changeStage: vi.fn(),
  invalidateApplicationPipelineStatus: vi.fn(),
  invalidateQueries: vi.fn(),
  mutationOptions: null as MutationOptions | null,
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: MutationOptions) => {
    mocks.mutationOptions = options;

    return { mutate: vi.fn(), isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@/hooks/mutations/invalidate-application-pipeline-status', () => ({
  invalidateApplicationPipelineStatus: mocks.invalidateApplicationPipelineStatus,
}));

vi.mock('@/lib/api/applications-actions', () => ({
  changeStage: mocks.changeStage,
}));

import { type StageChangeParams, useStageChange } from '../use-stage-change';

interface MutationOptions {
  mutationFn: (variables: StageChangeParams) => Promise<unknown>;
  onSuccess: (result: unknown, variables: StageChangeParams) => void;
}

const params: StageChangeParams = {
  applicationId: '11111111-1111-4111-8111-111111111111',
  stageId: '22222222-2222-4222-8222-222222222222',
  expectedStageId: '33333333-3333-4333-8333-333333333333',
  jobId: '44444444-4444-4444-8444-444444444444',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mutationOptions = null;
});

describe('stage change', () => {
  it('refreshes interviews after the server finalizes terminal stage workflows', async () => {
    mocks.changeStage.mockResolvedValue({ success: true });
    useStageChange();
    const options = mocks.mutationOptions as MutationOptions;

    await options.mutationFn(params);
    options.onSuccess(undefined, params);

    expect(mocks.changeStage).toHaveBeenCalledExactlyOnceWith(
      params.applicationId,
      params.stageId,
      params.expectedStageId,
    );
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: qk.application.interviews(params.applicationId),
    });
  });
});
