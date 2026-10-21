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
      bootstrapAccount={authAccountApi.bootstrapAccount}
      accountQueryKey={qk.auth.account}
      staleTime={STALE_TIME_DEFAULT}
    >
      <CryptoProvider apiUrl={import.meta.env.VITE_API} accountQueryKey={qk.auth.accountRoot()}>
        {children}
      </CryptoProvider>
    </AuthProvider>
  );
}
