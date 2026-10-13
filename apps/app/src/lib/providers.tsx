import { createAuthAccountApi } from '@comitium/auth/account-api';
import { PrivyAppProvider } from '@comitium/auth/privy-app-provider';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { logger } from '@comitium/ui/logger';
import { useCspNonce } from '@comitium/ui/security-headers';
import { TooltipProvider } from '@comitium/ui/tooltip';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LucideProvider } from 'lucide-react';
import { ThemeProvider } from 'next-themes';
import type { JSX } from 'react';
import { qk } from '@/hooks/query-keys';
import { api, registerApiAuthTokenProvider } from '@/lib/api/client';

const authAccountApi = createAuthAccountApi(api);

function logWalletProvisioningError(message: string) {
  logger.warn('Canonical embedded wallet creation failed', { error: message });
}

export const Providers = ({ queryClient, children }: { queryClient: QueryClient; children: JSX.Element }) => {
  const nonce = useCspNonce();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
      <QueryClientProvider client={queryClient}>
        <PrivyAppProvider
          getSession={authAccountApi.getSession}
          sessionQueryKey={qk.auth.session}
          staleTime={STALE_TIME_DEFAULT}
          onWalletProvisioningError={logWalletProvisioningError}
          registerApiAuthTokenProvider={registerApiAuthTokenProvider}
        >
          <LucideProvider strokeWidth={1.5}>
            <TooltipProvider>{children}</TooltipProvider>
          </LucideProvider>
        </PrivyAppProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};
