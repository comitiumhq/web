import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublishDraftParams } from '../use-publish-draft';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  navigate: vi.fn(),
  observeSettlement: vi.fn(),
  publishDraftWorkflow: vi.fn(),
  requireConnectedWallet: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  useAccount: vi.fn(),
  useActiveWallet: vi.fn(),
  useMutation: vi.fn((options: object) => ({ ...options, isPending: false })),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: mocks.navigate }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}));

vi.mock('@/lib/jobs/workflows/publish-draft', () => ({
  publishDraftWorkflow: mocks.publishDraftWorkflow,
}));

vi.mock('@comitium/chain/use-onchain-settlement-observer', () => ({
  useOnchainSettlementObserver: () => ({
    isConfirming: false,
    observe: mocks.observeSettlement,
  }),
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: mocks.useAccount,
  useActiveWallet: mocks.useActiveWallet,
}));

vi.mock('@comitium/auth/require-wallet-account', () => ({
  requireConnectedWallet: mocks.requireConnectedWallet,
}));

import { usePublishDraft } from '../use-publish-draft';

const JOB_ID = '11111111-1111-4111-8111-111111111111';
const OPERATION_ID = '22222222-2222-4222-8222-222222222222';
const params = {
  orgId: '33333333-3333-4333-8333-333333333333',
  jobId: JOB_ID,
} as PublishDraftParams;

interface PublishMutationOptions {
  onSuccess: (
    result: { id: string; operationId: string; state: 'confirmed' | 'confirming' },
    variables: PublishDraftParams,
  ) => void;
}

function getMutationOptions(): PublishMutationOptions {
  return usePublishDraft() as unknown as PublishMutationOptions;
}

describe('publish draft background confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAccount.mockReturnValue({ isConnected: true });
    mocks.useActiveWallet.mockReturnValue({});
  });

  it('navigates to the pipeline after a background publish settles', async () => {
    const options = getMutationOptions();

    options.onSuccess(
      {
        id: JOB_ID,
        operationId: OPERATION_ID,
        state: 'confirming',
      },
      params,
    );

    const [{ onCompleted }] = mocks.observeSettlement.mock.calls[0] as [{ onCompleted: () => Promise<void> }];
    await onCompleted();
    await vi.waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Job published', { id: 'publish-draft' }));

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/org/$orgId/jobs/$jobId/pipeline',
      params: { orgId: params.orgId, jobId: JOB_ID },
      search: { tab: 'active' },
    });
  });
});
