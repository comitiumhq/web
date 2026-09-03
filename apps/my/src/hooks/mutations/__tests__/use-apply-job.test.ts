import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  backgroundOperationId: null as string | null,
  applyJobWorkflow: vi.fn(),
  assertEncryptionKeyBundle: vi.fn(),
  isAuthenticated: true,
  invalidateQueries: vi.fn(),
  mutationOptions: null as object | null,
  mutate: vi.fn(),
  onCompleted: vi.fn(),
  refreshAfterOnchainOperationSettles: vi.fn(),
  routerInvalidate: vi.fn(),
  setBackgroundOperationId: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  useMutation: vi.fn((options: object) => {
    mocks.mutationOptions = options;

    return { mutate: mocks.mutate, isPending: false };
  }),
  user: null as { walletAddress: string } | null,
  wallet: null as { address: string } | null,
}));

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useState: () => [mocks.backgroundOperationId, mocks.setBackgroundOperationId],
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

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => ({ user: mocks.user }),
}));

vi.mock('@comitium/auth/use-is-authenticated', () => ({
  useIsAuthenticated: () => mocks.isAuthenticated,
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useActiveWallet: () => mocks.wallet,
}));

vi.mock('@comitium/crypto/key-bundle', () => ({
  assertEncryptionKeyBundle: mocks.assertEncryptionKeyBundle,
}));

vi.mock('@/lib/jobs/workflows/apply-job', async (importOriginal) => ({
  ...(await importOriginal()),
  applyJobWorkflow: mocks.applyJobWorkflow,
}));

vi.mock('@comitium/chain/onchain-operation-observer', () => ({
  refreshAfterOnchainOperationSettles: mocks.refreshAfterOnchainOperationSettles,
}));

import { SignatureError } from '@comitium/schemas/product-errors';
import { useApplyJob } from '../use-apply-job';

const OPERATION_ID = '11111111-1111-4111-8111-111111111111';
const variables = {
  jobData: { jobId: 7 },
} as unknown as Parameters<ReturnType<typeof useApplyJob>['submit']>[0];

interface ApplyMutationOptions {
  mutationFn: (params: typeof variables) => Promise<unknown>;
  onSuccess: (
    result: { kind: 'completed' | 'confirmed' | 'confirming'; operationId: string },
    params: typeof variables,
  ) => void;
  onError: (error: unknown, params: typeof variables) => Promise<void>;
}

function getMutationOptions(): ApplyMutationOptions {
  useApplyJob({ onCompleted: mocks.onCompleted });

  return mocks.mutationOptions as ApplyMutationOptions;
}

describe('apply job product settlement boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.backgroundOperationId = null;
    mocks.applyJobWorkflow.mockResolvedValue({
      isErr: () => false,
      value: { kind: 'completed', operationId: OPERATION_ID },
    });
    mocks.assertEncryptionKeyBundle.mockReturnValue(undefined);
    mocks.isAuthenticated = true;
    mocks.mutationOptions = null;
    mocks.refreshAfterOnchainOperationSettles.mockResolvedValue('completed');
    mocks.user = { walletAddress: '0x1111111111111111111111111111111111111111' };
    mocks.wallet = { address: '0x1111111111111111111111111111111111111111' };
  });

  it('fails before workflow work when the visitor is not authenticated', async () => {
    mocks.isAuthenticated = false;
    const options = getMutationOptions();

    await expect(options.mutationFn(variables)).rejects.toThrow('Not authenticated');
    expect(mocks.applyJobWorkflow).not.toHaveBeenCalled();
  });

  it('fails before workflow work when no canonical wallet is ready', async () => {
    mocks.wallet = null;
    const options = getMutationOptions();

    await expect(options.mutationFn(variables)).rejects.toThrow('Wallet not connected');
    expect(mocks.applyJobWorkflow).not.toHaveBeenCalled();
  });

  it('fails before workflow work when the encryption bundle is incomplete', async () => {
    mocks.assertEncryptionKeyBundle.mockImplementation(() => {
      throw new Error('Encryption key bundle is incomplete');
    });
    const options = getMutationOptions();

    await expect(options.mutationFn(variables)).rejects.toThrow('Encryption key bundle is incomplete');
    expect(mocks.applyJobWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a canonical wallet that does not belong to the authenticated account', async () => {
    mocks.wallet = { address: '0x2222222222222222222222222222222222222222' };
    const options = getMutationOptions();
    const completeVariables = {
      ...variables,
      address: '0x1111111111111111111111111111111111111111',
    } as typeof variables;

    await expect(options.mutationFn(completeVariables)).rejects.toThrow('another wallet');
    expect(mocks.applyJobWorkflow).not.toHaveBeenCalled();
  });

  it('keeps operation identity private and completes immediately after a confirmed receipt', () => {
    const result = useApplyJob({ onCompleted: mocks.onCompleted });
    const options = mocks.mutationOptions as ApplyMutationOptions;

    expect(result).toEqual({ submit: expect.any(Function), isPending: false, isConfirming: false });

    options.onSuccess({ kind: 'confirmed', operationId: OPERATION_ID }, variables);

    expect(mocks.refreshAfterOnchainOperationSettles).toHaveBeenCalledWith(OPERATION_ID, expect.any(Function));
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Application submitted successfully!', { id: 'apply-job' });
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
  });

  it('defers product completion until background settlement completes', async () => {
    let complete = (_stage: 'completed') => {};
    const settlement = new Promise<'completed'>((resolve) => {
      complete = resolve;
    });
    mocks.refreshAfterOnchainOperationSettles.mockReturnValue(settlement);
    const options = getMutationOptions();

    options.onSuccess({ kind: 'confirming', operationId: OPERATION_ID }, variables);

    expect(mocks.setBackgroundOperationId).toHaveBeenCalledWith(OPERATION_ID);
    expect(mocks.onCompleted).not.toHaveBeenCalled();

    complete('completed');
    await settlement;
    await vi.waitFor(() => expect(mocks.onCompleted).toHaveBeenCalledOnce());
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Application submitted successfully!', { id: 'apply-job' });
  });

  it('keeps the application actionable when background settlement fails', async () => {
    mocks.refreshAfterOnchainOperationSettles.mockResolvedValue('failed');
    const options = getMutationOptions();

    options.onSuccess({ kind: 'confirming', operationId: OPERATION_ID }, variables);

    await vi.waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith('Application could not be confirmed. Please try again.', {
        id: 'apply-job',
      }),
    );
    expect(mocks.onCompleted).not.toHaveBeenCalled();
  });

  it('reloads the current job policy after a finalization policy conflict', async () => {
    const options = getMutationOptions();
    const policyConflictVariables = {
      ...variables,
      jobData: { commitmentContract: '0x1111111111111111111111111111111111111111' },
    } as unknown as typeof variables;
    mocks.routerInvalidate.mockResolvedValue(undefined);

    await options.onError(
      new SignatureError(409, 'Policy changed', 'AI_CRITERIA_EVALUATION_POLICY_CHANGED'),
      policyConflictVariables,
    );

    expect(mocks.routerInvalidate).toHaveBeenCalledOnce();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['careers'], refetchType: 'none' });
    expect(mocks.toastError).toHaveBeenCalledWith(
      'The hiring organization changed its AI-assisted evaluation setting. Review the updated choice before submitting again.',
      { id: 'apply-job' },
    );
  });
});
