import { createAuthAccountApi } from '@comitium/auth/account-api';
import { createIdentityClient } from '@comitium/auth/auth-client';
import { AuthProvider } from '@comitium/auth/auth-provider';
import { CryptoProvider } from '@comitium/auth/crypto-provider';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import type { ReactNode } from 'react';
import { qk } from '@/hooks/query-keys';
import { api } from '@/lib/api/client';

const authAccountApi = createAuthAccountApi(api);
const authClient = createIdentityClient(import.meta.env.VITE_API);

export function CandidateProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider
      client={authClient}
      getSession={authAccountApi.getSession}
      sessionQueryKey={qk.auth.session}
      staleTime={STALE_TIME_DEFAULT}
    >
      <CryptoProvider apiUrl={import.meta.env.VITE_API} sessionQueryKey={qk.auth.sessionRoot()}>
        {children}
      </CryptoProvider>
    </AuthProvider>
  );
}
