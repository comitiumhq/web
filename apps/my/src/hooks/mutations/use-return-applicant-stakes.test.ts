import type { ApplicantStakeReturnAvailability } from '@comitium/schemas/applications';
import { TransactionError } from '@comitium/schemas/product-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  isConnected: true,
  mutationOptions: null as Record<string, (...args: never[]) => unknown> | null,
  returnApplicantStakes: vi.fn(),
  setQueryData: vi.fn(),
  toastError: vi.fn(),
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  wallet: { id: 'wallet-id' } as object | null,
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: () => ({ isConnected: mocks.isConnected, wallet: mocks.wallet }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: Record<string, (...args: never[]) => unknown>) => {
    mocks.mutationOptions = options;
    return { mutate: vi.fn(), isPending: false };
  },
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: mocks.setQueryData,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}));

vi.mock('@/lib/applications/stake-return', () => ({
  returnApplicantStakes: mocks.returnApplicantStakes,
}));

import { useReturnApplicantStakes } from './use-return-applicant-stakes';

const availability = {
  count: 2,
  totalAmount: '10000000',
  groups: [{ chainId: 84532, commitmentContract: '0x1111111111111111111111111111111111111111', applicationIds: [] }],
} as ApplicantStakeReturnAvailability;

interface MutationOptions {
  mutationFn: () => Promise<void>;
  onMutate: () => void;
  onSuccess: () => void;
  onError: (error: unknown) => void;
  onSettled: () => Promise<void>;
}

function options(): MutationOptions {
  useReturnApplicantStakes(availability);
  return mocks.mutationOptions as unknown as MutationOptions;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isConnected = true;
  mocks.mutationOptions = null;
  mocks.returnApplicantStakes.mockResolvedValue(undefined);
  mocks.wallet = { id: 'wallet-id' };
});

describe('useReturnApplicantStakes', () => {
  it('submits every eligible group through the canonical wallet', async () => {
    const mutation = options();

    await mutation.mutationFn();

    expect(mocks.returnApplicantStakes).toHaveBeenCalledExactlyOnceWith(mocks.wallet, availability.groups);
  });

  it('fails before transport when the canonical wallet is unavailable', async () => {
    mocks.isConnected = false;
    mocks.wallet = null;
    const mutation = options();

    await expect(mutation.mutationFn()).rejects.toThrow();
    expect(mocks.returnApplicantStakes).not.toHaveBeenCalled();
  });

  it('wraps a transport failure in the applicant deposit-return product boundary', async () => {
    mocks.returnApplicantStakes.mockRejectedValue(new Error('receipt failed'));
    const mutation = options();

    await expect(mutation.mutationFn()).rejects.toBeInstanceOf(TransactionError);
  });

  it('clears the aggregate availability and refreshes applications after success', async () => {
    const mutation = options();

    mutation.onMutate();
    mutation.onSuccess();
    await mutation.onSettled();

    expect(mocks.toastLoading).toHaveBeenCalledWith('Confirm the deposit return in your wallet…', {
      id: 'return-applicant-stakes',
    });
    expect(mocks.setQueryData).toHaveBeenCalledWith(expect.any(Array), {
      count: 0,
      totalAmount: '0',
      groups: [],
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Deposits returned', { id: 'return-applicant-stakes' });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: expect.any(Array) });
  });
});
