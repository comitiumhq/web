import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  closeJob: vi.fn(),
  invalidateQueries: vi.fn(),
  mutationOptions: null as object | null,
  observe: vi.fn(),
  onCompleted: vi.fn(),
  prepareJobClose: vi.fn(),
  requireConnectedWallet: vi.fn(),
  submitAndConfirm: vi.fn(),
  useAccount: vi.fn(),
  useActiveWallet: vi.fn(),
  useMutation: vi.fn((options: object) => {
    mocks.mutationOptions = options;

    return { mutate: vi.fn(), isPending: false };
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), loading: vi.fn(), success: vi.fn() },
}));

vi.mock('@comitium/chain/use-onchain-settlement-observer', () => ({
  useOnchainSettlementObserver: () => ({ observe: mocks.observe, isConfirming: false }),
}));

vi.mock('@/lib/api/jobs', () => ({
  closeJob: mocks.closeJob,
  prepareJobClose: mocks.prepareJobClose,
}));

vi.mock('@/lib/onchain-operation-signatures', () => ({
  submitAndConfirmPreparedRelayedOperation: mocks.submitAndConfirm,
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: mocks.useAccount,
  useActiveWallet: mocks.useActiveWallet,
}));

vi.mock('@comitium/auth/require-wallet-account', () => ({
  requireConnectedWallet: mocks.requireConnectedWallet,
}));

import { useCloseJob } from '../use-close-job';

const params = {
  orgId: '11111111-1111-4111-8111-111111111111',
  jobId: '22222222-2222-4222-8222-222222222222',
  closeReasonId: '33333333-3333-4333-8333-333333333333',
  expectedVersion: 1,
  commitmentSettlementRequired: true,
};
const prepared = { operationId: '44444444-4444-4444-8444-444444444444' };

type CloseResult =
  | { kind: 'closed' }
  | { kind: 'settlement'; prepared: typeof prepared; state: 'completed' | 'confirmed' | 'confirming' };

type MutationOptions = {
  mutationFn: (input: typeof params) => Promise<CloseResult>;
  onSuccess: (result: CloseResult, input: typeof params) => Promise<void>;
};

function options(): MutationOptions {
  useCloseJob({ onCompleted: mocks.onCompleted });

  return mocks.mutationOptions as MutationOptions;
}

describe('useCloseJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationOptions = null;
    mocks.useAccount.mockReturnValue({ isConnected: true });
    mocks.useActiveWallet.mockReturnValue({ getAccount: vi.fn() });
    mocks.requireConnectedWallet.mockReturnValue({ account: { address: '0x1' } });
    mocks.prepareJobClose.mockResolvedValue(prepared);
    mocks.submitAndConfirm.mockResolvedValue({ kind: 'confirmed' });
    mocks.closeJob.mockResolvedValue({ version: 2 });
  });

  it('prepares a durable Job close before submitting settlement', async () => {
    let confirm = () => {};
    mocks.submitAndConfirm.mockReturnValue(
      new Promise((resolve) => {
        confirm = () => resolve({ kind: 'confirmed' });
      }),
    );
    const pending = options().mutationFn(params);

    await vi.waitFor(() => expect(mocks.submitAndConfirm).toHaveBeenCalledOnce());
    expect(mocks.closeJob).not.toHaveBeenCalled();
    expect(mocks.prepareJobClose).toHaveBeenCalledExactlyOnceWith(
      params.jobId,
      params.expectedVersion,
      params.closeReasonId,
    );
    confirm();

    await expect(pending).resolves.toEqual({ kind: 'settlement', prepared, state: 'confirmed' });
  });

  it('closes directly after an already-finalized Commitment', async () => {
    const directParams = { ...params, commitmentSettlementRequired: false };
    const mutation = options();
    const result = await mutation.mutationFn(directParams);

    expect(result).toEqual({ kind: 'closed' });
    expect(mocks.requireConnectedWallet).not.toHaveBeenCalled();
    expect(mocks.closeJob).toHaveBeenCalledExactlyOnceWith(params.jobId, params.expectedVersion, params.closeReasonId);
  });

  it('does not issue a second close request after durable settlement completion', async () => {
    mocks.submitAndConfirm.mockResolvedValue({ kind: 'completed' });
    const mutation = options();
    const result = await mutation.mutationFn(params);

    await mutation.onSuccess(result, params);

    expect(mocks.closeJob).not.toHaveBeenCalled();
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
  });
});
