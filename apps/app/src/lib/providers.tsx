import { createAuthAccountApi } from '@comitium/auth/account-api';
import { createIdentityClient } from '@comitium/auth/auth-client';
import { AuthProvider } from '@comitium/auth/auth-provider';
import { CryptoProvider } from '@comitium/auth/crypto-provider';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useCspNonce } from '@comitium/ui/security-headers';
import { TooltipProvider } from '@comitium/ui/tooltip';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LucideProvider } from 'lucide-react';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { qk } from '@/hooks/query-keys';
import { api } from '@/lib/api/client';

const authAccountApi = createAuthAccountApi(api);
const authClient = createIdentityClient(import.meta.env.VITE_API);

export const Providers = ({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) => {
  const nonce = useCspNonce();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider
          client={authClient}
          getSession={authAccountApi.getSession}
          sessionQueryKey={qk.auth.session}
          staleTime={STALE_TIME_DEFAULT}
        >
          <CryptoProvider apiUrl={import.meta.env.VITE_API} sessionQueryKey={qk.auth.sessionRoot()}>
            <LucideProvider strokeWidth={1.5}>
              <TooltipProvider>{children}</TooltipProvider>
            </LucideProvider>
          </CryptoProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};
