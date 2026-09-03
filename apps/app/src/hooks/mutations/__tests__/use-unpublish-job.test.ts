import { BACKGROUND_CONFIRMATION_COPY } from '@comitium/ui/action-confirmation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  mutationOptions: null as object | null,
  onCompleted: vi.fn(),
  prepareUnpublishJob: vi.fn(),
  refreshAfterSettlement: vi.fn(),
  requireConnectedWallet: vi.fn(),
  submitPrepared: vi.fn(),
  toastInfo: vi.fn(),
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
  toast: { error: vi.fn(), info: mocks.toastInfo, loading: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/api/jobs', () => ({ prepareUnpublishJob: mocks.prepareUnpublishJob }));
vi.mock('@/lib/onchain-operation-signatures', () => ({
  submitPreparedRelayedOperation: mocks.submitPrepared,
}));
vi.mock('@comitium/chain/onchain-operation-observer', () => ({
  refreshAfterOnchainOperationSettles: mocks.refreshAfterSettlement,
}));
vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: mocks.useAccount,
  useActiveWallet: mocks.useActiveWallet,
}));
vi.mock('@comitium/auth/require-wallet-account', () => ({ requireConnectedWallet: mocks.requireConnectedWallet }));

import { useUnpublishJob } from '../use-unpublish-job';

const params = {
  orgId: '11111111-1111-4111-8111-111111111111',
  jobId: '22222222-2222-4222-8222-222222222222',
};
const prepared = { operationId: '33333333-3333-4333-8333-333333333333' };

type MutationOptions = {
  mutationFn: (input: typeof params) => Promise<typeof prepared>;
  onSuccess: (result: typeof prepared, input: typeof params) => void;
};

describe('useUnpublishJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationOptions = null;
    mocks.useAccount.mockReturnValue({ isConnected: true });
    mocks.useActiveWallet.mockReturnValue({ getAccount: vi.fn() });
    mocks.requireConnectedWallet.mockReturnValue({ account: { address: '0x1' } });
    mocks.prepareUnpublishJob.mockResolvedValue(prepared);
    mocks.submitPrepared.mockResolvedValue(undefined);
    mocks.refreshAfterSettlement.mockResolvedValue('completed');
  });

  it('returns after durable signature acceptance and reconciles in background', async () => {
    useUnpublishJob({ onCompleted: mocks.onCompleted });
    const mutation = mocks.mutationOptions as MutationOptions;
    const result = await mutation.mutationFn(params);

    expect(result).toEqual(prepared);
    expect(mocks.submitPrepared).toHaveBeenCalledOnce();
    mutation.onSuccess(result, params);
    expect(mocks.toastInfo).toHaveBeenCalledWith(BACKGROUND_CONFIRMATION_COPY.toast, { id: 'unpublish-job' });
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
    expect(mocks.refreshAfterSettlement).toHaveBeenCalledWith(prepared.operationId, expect.any(Function));
  });
});
