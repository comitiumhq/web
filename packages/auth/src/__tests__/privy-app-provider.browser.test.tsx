import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { PrivyAppProvider } from '../privy-app-provider';

interface ApiAuthTokens {
  accessToken: string | null;
  identityToken: string | null;
}

const mocks = vi.hoisted(() => ({
  authorizationSignature: vi.fn(),
  getAccessToken: vi.fn(),
  identityToken: null as string | null,
  privy: {
    authenticated: false,
    ready: true,
  },
}));

vi.mock('@privy-io/react-auth', () => ({
  PrivyProvider: ({ children }: { children: ReactNode }) => children,
  useAuthorizationSignature: () => ({ generateAuthorizationSignature: mocks.authorizationSignature }),
  useCreateWallet: () => ({ createWallet: vi.fn() }),
  useIdentityToken: () => ({ identityToken: mocks.identityToken }),
  usePrivy: () => ({ ...mocks.privy, getAccessToken: mocks.getAccessToken }),
  useUser: () => ({
    refreshUser: vi.fn(),
    user: {
      id: 'did:privy:user-1',
      linkedAccounts: [
        {
          type: 'wallet',
          address: '0x1111111111111111111111111111111111111111',
          chainType: 'ethereum',
          id: 'wallet-id',
          walletClientType: 'privy',
          walletIndex: 0,
        },
      ],
    },
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

beforeEach(() => {
  mocks.authorizationSignature.mockReset();
  mocks.authorizationSignature.mockResolvedValue({ signature: 'first-signature' });
  mocks.getAccessToken.mockReset();
  mocks.getAccessToken.mockResolvedValue('first-access-token');
  mocks.identityToken = null;
  mocks.privy = { authenticated: false, ready: true };
});

describe('PrivyAppProvider API bridge', () => {
  it('registers stable providers that read the latest tokens and authorization signer', async () => {
    const unregisterTokens = vi.fn();
    const unregisterAuthorization = vi.fn();
    const registerApiAuthTokenProvider = vi.fn((_provider: () => Promise<ApiAuthTokens>) => unregisterTokens);
    const registerWalletAuthorizationProvider = vi.fn(
      (_provider: (payload: Uint8Array) => Promise<string>) => unregisterAuthorization,
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = () => (
      <QueryClientProvider client={client}>
        <PrivyAppProvider
          getSession={vi.fn().mockResolvedValue(null)}
          registerApiAuthTokenProvider={registerApiAuthTokenProvider}
          registerWalletAuthorizationProvider={registerWalletAuthorizationProvider}
          sessionQueryKey={(privyUserId) => ['session', privyUserId]}
          staleTime={0}
        >
          <main>Application</main>
        </PrivyAppProvider>
      </QueryClientProvider>
    );
    const screen = await render(tree());

    await vi.waitFor(() => {
      expect(registerApiAuthTokenProvider).toHaveBeenCalledTimes(1);
      expect(registerWalletAuthorizationProvider).toHaveBeenCalledTimes(1);
    });
    const tokenProvider = registerApiAuthTokenProvider.mock.calls[0]?.[0];
    const authorizationProvider = registerWalletAuthorizationProvider.mock.calls[0]?.[0];

    expect(tokenProvider).toBeDefined();
    expect(authorizationProvider).toBeDefined();
    await expect(tokenProvider?.()).resolves.toEqual({ accessToken: null, identityToken: null });

    mocks.getAccessToken.mockResolvedValue('current-access-token');
    mocks.identityToken = 'current-identity-token';
    mocks.privy = { authenticated: true, ready: true };
    mocks.authorizationSignature.mockResolvedValue({ signature: 'current-signature' });
    await screen.rerender(tree());

    await expect(tokenProvider?.()).resolves.toEqual({
      accessToken: 'current-access-token',
      identityToken: 'current-identity-token',
    });
    const payload = new Uint8Array([1, 2, 3]);
    await expect(authorizationProvider?.(payload)).resolves.toBe('current-signature');
    expect(mocks.authorizationSignature).toHaveBeenCalledExactlyOnceWith(payload);

    await screen.unmount();
    expect(unregisterTokens).toHaveBeenCalledTimes(1);
    expect(unregisterAuthorization).toHaveBeenCalledTimes(1);
  });
});
