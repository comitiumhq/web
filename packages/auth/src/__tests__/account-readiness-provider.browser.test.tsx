import type { User } from '@comitium/schemas/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AccountReadinessProvider } from '../account-readiness-provider';
import { useAccountReadiness } from '../use-account-readiness';

const mocks = vi.hoisted(() => ({
  createWallet: vi.fn(),
  identityToken: 'identity-token' as string | null,
  privy: { authenticated: true, ready: true },
  privyUser: {
    id: 'did:privy:user-1',
    linkedAccounts: [] as Array<Record<string, unknown>>,
  },
  refreshUser: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({
  useCreateWallet: () => ({ createWallet: mocks.createWallet }),
  useIdentityToken: () => ({ identityToken: mocks.identityToken }),
  usePrivy: () => mocks.privy,
  useUser: () => ({ refreshUser: mocks.refreshUser, user: mocks.privyUser }),
}));

const canonicalWallet = {
  type: 'wallet',
  address: '0x1111111111111111111111111111111111111111',
  chainType: 'ethereum',
  id: 'wallet-id',
  walletClientType: 'privy',
  walletIndex: 0,
};

const user = {
  id: 'user-1',
  walletAddress: canonicalWallet.address,
  publicKey: null,
  encryptedPersonalKey: null,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
} as User;

function StageProbe() {
  const { stage } = useAccountReadiness();

  return <output aria-label="Account stage">{stage}</output>;
}

function createTree(queryClient: QueryClient, getSession: () => Promise<User | null>, onError = vi.fn()) {
  return (
    <QueryClientProvider client={queryClient}>
      <AccountReadinessProvider
        getSession={getSession}
        onWalletProvisioningError={onError}
        sessionQueryKey={(privyUserId) => ['session', privyUserId]}
        staleTime={0}
      >
        <StageProbe />
      </AccountReadinessProvider>
    </QueryClientProvider>
  );
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  mocks.createWallet.mockReset();
  mocks.createWallet.mockResolvedValue(undefined);
  mocks.identityToken = 'identity-token';
  mocks.privy = { authenticated: true, ready: true };
  mocks.privyUser = {
    id: 'did:privy:user-1',
    linkedAccounts: [],
  };
  mocks.refreshUser.mockReset();
  mocks.refreshUser.mockResolvedValue(undefined);
});

describe('AccountReadinessProvider', () => {
  it('loads the Comitium session only after both the auth token and canonical wallet are ready', async () => {
    mocks.identityToken = null;
    mocks.privyUser.linkedAccounts = [canonicalWallet];
    const getSession = vi.fn().mockResolvedValue(user);
    const client = queryClient();
    const screen = await render(createTree(client, getSession));

    await expect.element(screen.getByLabelText('Account stage')).toHaveTextContent('authenticating');
    expect(getSession).not.toHaveBeenCalled();

    mocks.identityToken = 'identity-token';
    await screen.rerender(createTree(client, getSession));

    await expect.element(screen.getByLabelText('Account stage')).toHaveTextContent('ready');
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it('starts wallet provisioning once per Privy identity', async () => {
    const getSession = vi.fn().mockResolvedValue(user);
    const client = queryClient();
    const screen = await render(createTree(client, getSession));

    await expect.element(screen.getByLabelText('Account stage')).toHaveTextContent('provisioning-wallet');
    expect(mocks.createWallet).toHaveBeenCalledTimes(1);

    await screen.rerender(createTree(client, getSession));
    expect(mocks.createWallet).toHaveBeenCalledTimes(1);

    mocks.privyUser = { id: 'did:privy:user-2', linkedAccounts: [] };
    await screen.rerender(createTree(client, getSession));
    expect(mocks.createWallet).toHaveBeenCalledTimes(2);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('reports wallet provisioning failure and refreshes Privy state once', async () => {
    const failure = new Error('Wallet provisioning failed');
    mocks.createWallet.mockRejectedValue(failure);
    const onError = vi.fn();
    const getSession = vi.fn().mockResolvedValue(user);

    await render(createTree(queryClient(), getSession, onError));

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledExactlyOnceWith('Wallet provisioning failed');
      expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
    });
    expect(getSession).not.toHaveBeenCalled();
  });
});
