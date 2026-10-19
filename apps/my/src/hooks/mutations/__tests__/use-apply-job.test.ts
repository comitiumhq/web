import type { ApplicationResult } from '@comitium/schemas/product-errors';
import { ApplicationRequestError } from '@comitium/schemas/product-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyJobWorkflow: vi.fn(),
  invalidateQueries: vi.fn(),
  isAuthenticated: true,
  mutationOptions: null as object | null,
  mutate: vi.fn(),
  observeSettlement: vi.fn(),
  onCompleted: vi.fn(),
  onZkIdentityRequired: vi.fn(),
  routerInvalidate: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  useMutation: vi.fn((options: object) => {
    mocks.mutationOptions = options;

    return { mutate: mocks.mutate, isPending: false };
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.routerInvalidate }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}));

vi.mock('@comitium/auth/use-is-authenticated', () => ({
  useIsAuthenticated: () => mocks.isAuthenticated,
}));

vi.mock('@/lib/jobs/workflows/apply-job', async (importOriginal) => ({
  ...(await importOriginal()),
  applyJobWorkflow: mocks.applyJobWorkflow,
}));

import { useApplyJob } from '../use-apply-job';

const variables = {
  jobData: {
    id: '22222222-2222-4222-8222-222222222222',
    postingId: '33333333-3333-4333-8333-333333333333',
    orgId: 'org-1',
  },
} as unknown as Parameters<ReturnType<typeof useApplyJob>['submit']>[0];

interface ApplyMutationOptions {
  mutationFn: (params: typeof variables) => Promise<ApplicationResult>;
  onSuccess: (result: ApplicationResult) => void;
  onError: (error: unknown) => Promise<void>;
}

function getMutationOptions(): ApplyMutationOptions {
  useApplyJob({
    onCompleted: mocks.onCompleted,
    onZkIdentityRequired: mocks.onZkIdentityRequired,
  });

  return mocks.mutationOptions as ApplyMutationOptions;
}

describe('useApplyJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyJobWorkflow.mockResolvedValue({
      isErr: () => false,
      value: { kind: 'completed' },
    });
    mocks.isAuthenticated = true;
    mocks.mutationOptions = null;
    mocks.routerInvalidate.mockResolvedValue(undefined);
  });

  it('fails before workflow work when the visitor is not authenticated', async () => {
    mocks.isAuthenticated = false;
    const options = getMutationOptions();

    await expect(options.mutationFn(variables)).rejects.toThrow('Sign in to apply');
    expect(mocks.applyJobWorkflow).not.toHaveBeenCalled();
  });

  it('submits for an authenticated candidate without personal-key setup', async () => {
    const options = getMutationOptions();

    await expect(options.mutationFn(variables)).resolves.toEqual({ kind: 'completed' });
    expect(mocks.applyJobWorkflow).toHaveBeenCalledWith(expect.objectContaining(variables));
  });

  it('completes an offchain application immediately', () => {
    const options = getMutationOptions();

    options.onSuccess({ kind: 'completed' });

    expect(mocks.invalidateQueries).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Application submitted successfully!', { id: 'apply-job' });
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
  });

  it('reloads the current job policy after a finalization policy conflict', async () => {
    const options = getMutationOptions();

    await options.onError(new ApplicationRequestError(409, 'Policy changed', 'AI_CRITERIA_EVALUATION_POLICY_CHANGED'));

    expect(mocks.routerInvalidate).toHaveBeenCalledOnce();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['careers'], refetchType: 'none' });
    expect(mocks.toastError).toHaveBeenCalledWith(
      'The hiring organization changed its AI-assisted evaluation setting. Review the updated choice before submitting again.',
      { id: 'apply-job' },
    );
  });

  it('reloads changed Posting skills and tells the applicant to review them', async () => {
    const options = getMutationOptions();

    await options.onError(new ApplicationRequestError(409, 'Posting skills changed', 'POSTING_SKILLS_CHANGED'));

    expect(mocks.routerInvalidate).toHaveBeenCalledOnce();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['careers'], refetchType: 'none' });
    expect(mocks.toastError).toHaveBeenCalledWith(
      'The skills for this role changed. Review the updated requirements before submitting again.',
      { id: 'apply-job' },
    );
  });

  it('shows a retryable application preparation error', async () => {
    const options = getMutationOptions();

    await options.onError(new ApplicationRequestError(500, 'Application request failed'));

    expect(mocks.toastError).toHaveBeenCalledWith('Application submission could not be prepared. Please try again.', {
      id: 'apply-job',
    });
  });
});
