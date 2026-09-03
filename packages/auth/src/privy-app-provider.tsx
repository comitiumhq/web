import type { User } from '@comitium/schemas/auth';
import {
  type PrivyClientConfig,
  PrivyProvider,
  useAuthorizationSignature,
  useIdentityToken,
  usePrivy,
} from '@privy-io/react-auth';
import { useTheme } from 'next-themes';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';

import { AccountReadinessProvider } from './account-readiness-provider';
import { PRIVY_APP_ID, PRIVY_AUTH_TRANSPORT, privyConfig } from './privy-config';

interface ApiAuthTokens {
  accessToken: string | null;
  identityToken: string | null;
}

type RegisterApiAuthTokenProvider = (provider: () => Promise<ApiAuthTokens>) => () => void;
type RegisterWalletAuthorizationProvider = (provider: (payload: Uint8Array) => Promise<string>) => () => void;

interface PrivyAppProviderProps {
  children: ReactNode;
  getSession: () => Promise<User | null>;
  onWalletProvisioningError?: (message: string) => void;
  registerApiAuthTokenProvider: RegisterApiAuthTokenProvider;
  registerWalletAuthorizationProvider: RegisterWalletAuthorizationProvider;
  sessionQueryKey: (privyUserId: string | null) => readonly unknown[];
  staleTime: number;
}

export function PrivyAppProvider({
  children,
  getSession,
  onWalletProvisioningError,
  registerApiAuthTokenProvider,
  registerWalletAuthorizationProvider,
  sessionQueryKey,
  staleTime,
}: PrivyAppProviderProps) {
  const { resolvedTheme } = useTheme();
  const config = useMemo<PrivyClientConfig>(
    () => ({
      ...privyConfig,
      appearance: {
        ...privyConfig.appearance,
        theme: resolvedTheme === 'dark' ? 'dark' : 'light',
      },
    }),
    [resolvedTheme],
  );

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={config}>
      <PrivyApiBridge
        registerApiAuthTokenProvider={registerApiAuthTokenProvider}
        registerWalletAuthorizationProvider={registerWalletAuthorizationProvider}
      />
      <AccountReadinessProvider
        getSession={getSession}
        sessionQueryKey={sessionQueryKey}
        staleTime={staleTime}
        onWalletProvisioningError={onWalletProvisioningError}
      >
        {children}
      </AccountReadinessProvider>
    </PrivyProvider>
  );
}

interface PrivyApiBridgeProps {
  registerApiAuthTokenProvider: RegisterApiAuthTokenProvider;
  registerWalletAuthorizationProvider: RegisterWalletAuthorizationProvider;
}

function PrivyApiBridge({ registerApiAuthTokenProvider, registerWalletAuthorizationProvider }: PrivyApiBridgeProps) {
  const { authenticated, getAccessToken, ready } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { generateAuthorizationSignature } = useAuthorizationSignature();
  const authState = useRef({ authenticated, generateAuthorizationSignature, getAccessToken, identityToken, ready });

  authState.current = { authenticated, generateAuthorizationSignature, getAccessToken, identityToken, ready };

  useEffect(
    () =>
      registerWalletAuthorizationProvider(async (payload) => {
        const result = await authState.current.generateAuthorizationSignature(payload);

        return result.signature;
      }),
    [registerWalletAuthorizationProvider],
  );

  useEffect(() => {
    if (PRIVY_AUTH_TRANSPORT !== 'headers') {
      return;
    }

    return registerApiAuthTokenProvider(async () => {
      const current = authState.current;

      if (!current.ready || !current.authenticated) {
        return { accessToken: null, identityToken: null };
      }

      return {
        accessToken: await current.getAccessToken(),
        identityToken: authState.current.identityToken,
      };
    });
  }, [registerApiAuthTokenProvider]);

  return null;
}
