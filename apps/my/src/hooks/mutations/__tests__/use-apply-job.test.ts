import type { ApplicationResult } from '@comitium/schemas/product-errors';
import { SignatureError } from '@comitium/schemas/product-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyJobWorkflow: vi.fn(),
  assertEncryptionKeyBundle: vi.fn(),
  invalidateQueries: vi.fn(),
  isAuthenticated: true,
  mutationOptions: null as object | null,
  mutate: vi.fn(),
  observeSettlement: vi.fn(),
  onCompleted: vi.fn(),
  onZkIdentityRequired: vi.fn(),
  refreshAfterOnchainOperationSettles: vi.fn(),
  routerInvalidate: vi.fn(),
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

vi.mock('@comitium/chain/use-onchain-settlement-observer', () => ({
  useOnchainSettlementObserver: () => ({
    isConfirming: false,
    observe: mocks.observeSettlement,
  }),
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

import { useApplyJob } from '../use-apply-job';

const OPERATION_ID = '11111111-1111-4111-8111-111111111111';
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
    mocks.assertEncryptionKeyBundle.mockReturnValue(undefined);
    mocks.isAuthenticated = true;
    mocks.mutationOptions = null;
    mocks.routerInvalidate.mockResolvedValue(undefined);
    mocks.user = { walletAddress: '0x1111111111111111111111111111111111111111' };
    mocks.wallet = { address: '0x1111111111111111111111111111111111111111' };
  });

  it('fails before workflow work when the visitor is not authenticated', async () => {
    mocks.isAuthenticated = false;
    const options = getMutationOptions();

    await expect(options.mutationFn(variables)).rejects.toThrow('Sign in to apply');
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

  it('completes an offchain application immediately', () => {
    const options = getMutationOptions();

    options.onSuccess({ kind: 'completed' });

    expect(mocks.invalidateQueries).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Application submitted successfully!', { id: 'apply-job' });
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
  });

  it('observes a response commitment submission before completing the UI flow', () => {
    const options = getMutationOptions();

    options.onSuccess({ kind: 'confirming', operationId: OPERATION_ID });

    expect(mocks.observeSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: OPERATION_ID,
        onCompleted: expect.any(Function),
        onFailed: expect.any(Function),
      }),
    );
    expect(mocks.onCompleted).not.toHaveBeenCalled();
  });

  it('refreshes after a confirmed wallet submission', () => {
    const options = getMutationOptions();

    options.onSuccess({ kind: 'confirmed', operationId: OPERATION_ID });

    expect(mocks.refreshAfterOnchainOperationSettles).toHaveBeenCalledWith(OPERATION_ID, expect.any(Function));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Application submitted successfully!', { id: 'apply-job' });
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
  });

  it('reloads the current job policy after a finalization policy conflict', async () => {
    const options = getMutationOptions();

    await options.onError(new SignatureError(409, 'Policy changed', 'AI_CRITERIA_EVALUATION_POLICY_CHANGED'));

    expect(mocks.routerInvalidate).toHaveBeenCalledOnce();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['careers'], refetchType: 'none' });
    expect(mocks.toastError).toHaveBeenCalledWith(
      'The hiring organization changed its AI-assisted evaluation setting. Review the updated choice before submitting again.',
      { id: 'apply-job' },
    );
  });

  it('describes preparation failures without wallet terminology', async () => {
    const options = getMutationOptions();

    await options.onError(new SignatureError(500, 'Wallet signature failed'));

    expect(mocks.toastError).toHaveBeenCalledWith('Application submission could not be prepared. Please try again.', {
      id: 'apply-job',
    });
  });
});
