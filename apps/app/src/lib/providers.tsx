import { createAuthAccountApi } from '@comitium/auth/account-api';
import { PrivyAppProvider } from '@comitium/auth/privy-app-provider';
import {
  registerUserWalletAuthorizationSignatureProvider,
  registerUserWalletOperationTransport,
} from '@comitium/auth/user-wallet-operation';
import { registerOnchainOperationTransport } from '@comitium/chain/onchain-operation-observer';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { logger } from '@comitium/ui/logger';
import { TooltipProvider } from '@comitium/ui/tooltip';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { type JSX, useEffect } from 'react';
import { qk } from '@/hooks/query-keys';
import { api, isTransientApiError, registerApiAuthTokenProvider } from '@/lib/api/client';
import { getOnchainOperationStatus, submitUserWalletTransaction } from '@/lib/api/onchain-operations';

const authAccountApi = createAuthAccountApi(api);

function logWalletProvisioningError(message: string) {
  logger.warn('Canonical embedded wallet creation failed', { error: message });
}

function OnchainOperationTransportBridge() {
  useEffect(() => {
    const unregisterObserver = registerOnchainOperationTransport({
      getStatus: getOnchainOperationStatus,
      isTransientError: isTransientApiError,
    });
    const unregisterWalletTransport = registerUserWalletOperationTransport(submitUserWalletTransaction);

    return () => {
      unregisterObserver();
      unregisterWalletTransport();
    };
  }, []);

  return null;
}

export const Providers = ({ queryClient, children }: { queryClient: QueryClient; children: JSX.Element }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <OnchainOperationTransportBridge />
        <PrivyAppProvider
          getSession={authAccountApi.getSession}
          sessionQueryKey={qk.auth.session}
          staleTime={STALE_TIME_DEFAULT}
          onWalletProvisioningError={logWalletProvisioningError}
          registerApiAuthTokenProvider={registerApiAuthTokenProvider}
          registerWalletAuthorizationProvider={registerUserWalletAuthorizationSignatureProvider}
        >
          <TooltipProvider>{children}</TooltipProvider>
        </PrivyAppProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};
