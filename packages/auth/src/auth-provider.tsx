import { CryptoProxy } from '@comitium/crypto';
import { ApiError } from '@comitium/schemas/api-errors';
import type { User } from '@comitium/schemas/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import type { AccountStage } from './account-stage';
import type { IdentityClient } from './auth-client';
import { AuthClientContext } from './auth-context';
import { FreshAuthentication } from './fresh-authentication';
import { type AccountReadiness, AccountReadinessContext } from './use-account-readiness';

interface AuthProviderProps {
  children: ReactNode;
  client: IdentityClient;
  getSession: () => Promise<User | null>;
  sessionQueryKey: (authUserId: string | null) => readonly unknown[];
  staleTime: number;
}

export function AuthProvider({ children, client, getSession, sessionQueryKey, staleTime }: AuthProviderProps) {
  const auth = client.useSession();
  const authUserId = auth.data?.user.id ?? null;
  const queryClient = useQueryClient();
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [resolvedIdentity, setResolvedIdentity] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<Error | null>(null);

  useEffect(() => {
    if (!auth.isPending) {
      setHasCheckedSession(true);
    }
  }, [auth.isPending]);

  useEffect(() => {
    if (authUserId === resolvedIdentity) {
      return;
    }

    let cancelled = false;

    async function resetIdentity() {
      try {
        await CryptoProxy.clear();

        if (cancelled) {
          return;
        }

        queryClient.clear();
        setIdentityError(null);
        setResolvedIdentity(authUserId);
      } catch {
        if (!cancelled) {
          setIdentityError(new Error('Could not clear the previous account session'));
        }
      }
    }

    void resetIdentity();

    return () => {
      cancelled = true;
    };
  }, [authUserId, queryClient, resolvedIdentity]);

  const identityReady = authUserId === resolvedIdentity && identityError === null;

  const query = useQuery<User | null>({
    queryKey: sessionQueryKey(authUserId),
    queryFn: async () => {
      const user = await getSession();

      if (user && user.authUserId !== authUserId) {
        await auth.refetch();

        throw new ApiError(409, 'Authentication identity changed; try again');
      }

      return user;
    },
    enabled: authUserId !== null && identityReady,
    staleTime,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  let stage: AccountStage;

  if ((!hasCheckedSession && auth.isPending) || !identityReady) {
    stage = 'authenticating';
  } else if (!authUserId) {
    stage = 'anonymous';
  } else if (!query.isSuccess) {
    stage = 'resolving-session';
  } else {
    stage = 'ready';
  }

  const user = stage === 'ready' ? (query.data ?? null) : null;
  const readiness = useMemo<AccountReadiness>(() => ({ stage, user }), [stage, user]);

  if (identityError) {
    throw identityError;
  }

  if (auth.error && auth.error.status !== 401 && !auth.data && !hasCheckedSession) {
    throw new ApiError(auth.error.status, 'Could not check your sign-in. Try again.');
  }

  if (authUserId && identityReady && (query.isError || (query.isSuccess && !query.data))) {
    throw new ApiError(
      query.error instanceof ApiError ? query.error.status : 503,
      'Could not load your account. Try again.',
    );
  }

  return (
    <AuthClientContext.Provider value={client}>
      <AccountReadinessContext.Provider value={readiness}>
        <FreshAuthentication>{children}</FreshAuthentication>
      </AccountReadinessContext.Provider>
    </AuthClientContext.Provider>
  );
}
