import { ApiError } from '@comitium/schemas/api-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyStandardJobWorkflow: vi.fn(),
  assertEncryptionKeyBundle: vi.fn(),
  invalidateQueries: vi.fn(),
  isAuthenticated: true,
  mutationOptions: null as object | null,
  mutate: vi.fn(),
  onCompleted: vi.fn(),
  onZkIdentityRequired: vi.fn(),
  toastError: vi.fn(),
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  user: { id: 'applicant-1' } as { id: string } | null,
  useMutation: vi.fn((options: object) => {
    mocks.mutationOptions = options;

    return { mutate: mocks.mutate, isPending: false };
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}));

vi.mock('@comitium/auth/use-is-authenticated', () => ({
  useIsAuthenticated: () => mocks.isAuthenticated,
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => ({ user: mocks.user }),
}));

vi.mock('@comitium/crypto/key-bundle', () => ({
  assertEncryptionKeyBundle: mocks.assertEncryptionKeyBundle,
}));

vi.mock('@/lib/jobs/workflows/apply-standard-job', () => ({
  applyStandardJobWorkflow: mocks.applyStandardJobWorkflow,
}));

import { useApplyStandardJob } from '../use-apply-standard-job';

type MutationOptions = {
  onError: (error: unknown) => void;
};

function getMutationOptions(): MutationOptions {
  useApplyStandardJob({
    onCompleted: mocks.onCompleted,
    onZkIdentityRequired: mocks.onZkIdentityRequired,
  });

  return mocks.mutationOptions as MutationOptions;
}

describe('useApplyStandardJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthenticated = true;
    mocks.mutationOptions = null;
    mocks.user = { id: 'applicant-1' };
  });

  it('shows the duplicate Application error without completing the flow', () => {
    const options = getMutationOptions();
    const error = new ApiError(409, 'You have already applied to this job', 'ALREADY_APPLIED');

    options.onError(error);

    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith('You have already applied to this job', {
      id: 'apply-job',
    });
    expect(mocks.onCompleted).not.toHaveBeenCalled();
    expect(mocks.onZkIdentityRequired).not.toHaveBeenCalled();
  });
});
