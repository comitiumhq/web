import type { User } from '@comitium/schemas/auth';
import { getErrorMessage } from '@comitium/schemas/error';
import { useCreateWallet, useIdentityToken, usePrivy, useUser } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';

import { getAccountStage } from './account-stage';
import { PRIVY_AUTH_TRANSPORT } from './privy-config';
import { type AccountReadiness, AccountReadinessContext } from './use-account-readiness';
import { isCanonicalLinkedWallet } from './wallet';

interface AccountReadinessProviderProps {
  children: ReactNode;
  getSession: () => Promise<User | null>;
  onWalletProvisioningError?: (message: string) => void;
  sessionQueryKey: (privyUserId: string | null) => readonly unknown[];
  staleTime: number;
}

export function AccountReadinessProvider({
  children,
  getSession,
  onWalletProvisioningError,
  sessionQueryKey,
  staleTime,
}: AccountReadinessProviderProps) {
  const { authenticated, ready } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { refreshUser, user: privyUser } = useUser();
  const { createWallet } = useCreateWallet();
  const provisionedUserId = useRef<string | null>(null);

  const hasAuthTokens = PRIVY_AUTH_TRANSPORT === 'cookies' || identityToken !== null;
  const hasCanonicalWallet = privyUser?.linkedAccounts.some(isCanonicalLinkedWallet) ?? false;
  const canLoadSession = ready && authenticated && hasAuthTokens && hasCanonicalWallet;

  const query = useQuery<User | null>({
    queryKey: sessionQueryKey(privyUser?.id ?? null),
    queryFn: getSession,
    enabled: canLoadSession,
    staleTime,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!ready || !authenticated || !privyUser || hasCanonicalWallet) {
      return;
    }

    if (provisionedUserId.current === privyUser.id) {
      return;
    }

    provisionedUserId.current = privyUser.id;
    createWallet().catch(async (error: unknown) => {
      onWalletProvisioningError?.(getErrorMessage(error));
      await refreshUser();
    });
  }, [authenticated, createWallet, hasCanonicalWallet, onWalletProvisioningError, privyUser, ready, refreshUser]);

  const user = canLoadSession ? (query.data ?? null) : null;
  const stage = getAccountStage({
    authenticated,
    hasAccount: user !== null,
    hasAuthTokens,
    hasCanonicalWallet,
    isSessionSettled: query.isSuccess || query.isError,
    privyReady: ready,
  });
  const value = useMemo<AccountReadiness>(() => ({ stage, user }), [stage, user]);

  return <AccountReadinessContext.Provider value={value}>{children}</AccountReadinessContext.Provider>;
}
