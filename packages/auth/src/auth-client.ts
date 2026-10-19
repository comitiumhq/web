import { passkeyClient } from '@better-auth/passkey/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const SESSION_REFETCH_INTERVAL_SECONDS = 5 * 60;

export function createIdentityClient(apiUrl: string) {
  const baseURL = new URL('auth/identity', apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`).href;

  return createAuthClient({
    baseURL,
    fetchOptions: { credentials: 'include', cache: 'no-store' },
    sessionOptions: {
      refetchInterval: SESSION_REFETCH_INTERVAL_SECONDS,
      refetchOnWindowFocus: true,
      refetchWhenOffline: false,
    },
    plugins: [emailOTPClient(), passkeyClient()],
  });
}

export type IdentityClient = ReturnType<typeof createIdentityClient>;
export type IdentitySession = IdentityClient['$Infer']['Session'];
export type IdentityUser = IdentitySession['user'];
