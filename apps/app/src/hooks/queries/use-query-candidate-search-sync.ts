import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { useSession } from '@comitium/auth/use-session';
import { createCryptoSessionIdentity } from '@comitium/crypto/session';
import { onlineManager, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { qk } from '@/hooks/query-keys';
import { CandidateSearchRuntime } from '@/lib/candidates/search/profile-corpus';
import { useQueryOrgVaultAccess } from './use-query-org-vault-access';

const subscribeOnline = (callback: () => void) => onlineManager.subscribe(callback);

export function useQueryCandidateSearchSync(orgId: string) {
  const { user } = useSession();
  const unlocked = useIsCryptoActive();

  const online = useSyncExternalStore(
    subscribeOnline,
    () => onlineManager.isOnline(),
    () => true,
  );

  const vault = useQueryOrgVaultAccess(orgId);
  const queryClient = useQueryClient();
  const [runtime, setRuntime] = useState<CandidateSearchRuntime | null>(null);
  const wrappedKey = user?.encryptedUserKey;
  const userId = user?.id;
  const access = vault.data;

  useEffect(() => {
    if (!unlocked || !online || !userId || !wrappedKey || !access) {
      setRuntime(null);

      return;
    }

    const next = new CandidateSearchRuntime(orgId, createCryptoSessionIdentity(wrappedKey, userId), access);
    setRuntime(next);

    return () => next.dispose();
  }, [orgId, userId, wrappedKey, unlocked, online, access]);

  const session = runtime?.id ?? 'inactive';
  const queryKey = qk.org.candidateSearchSync(orgId, session);

  const options = queryOptions({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!runtime) {
        throw new Error('Candidate search is unavailable');
      }

      return runtime.sync(signal);
    },
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  const query = useQuery({
    ...options,
    enabled: Boolean(runtime && unlocked && online),
    refetchInterval: (state) => {
      if (state.state.error || state.state.fetchStatus === 'fetching') {
        return false;
      }

      /**
       * Each pass already bounds its work. Yield through a timer between passes;
       * keep polling disabled during the request and slow it down once ready.
       */
      return state.state.data?.phase === 'ready' ? 60_000 : 1;
    },
    refetchIntervalInBackground: false,
  });

  const previousHead = useRef<string | null>(null);

  useEffect(() => {
    const status = query.data;

    if (!status || status.phase !== 'ready') {
      return;
    }

    const head = `${session}:${status.head}`;

    const changed = previousHead.current !== null && previousHead.current !== head;

    if (changed) {
      void queryClient.invalidateQueries(
        {
          queryKey: qk.candidate.directoryOrgRoot(orgId),
          predicate: (query) => query.meta?.privateCandidateSearch === false,
        },
        { cancelRefetch: false },
      );
    }

    previousHead.current = head;
  }, [queryClient, orgId, session, query.data]);

  useEffect(
    () => () => {
      void queryClient.cancelQueries({ queryKey });
    },
    [queryClient, orgId, session],
  );

  const active = runtime && unlocked && online && runtime.identity.userId === userId && runtime.orgId === orgId;

  return {
    runtime: active ? runtime : null,
    status: active && !query.error ? (query.data ?? null) : null,
    error: query.error,
    updatedAt: query.dataUpdatedAt,
    refresh: () => queryClient.fetchQuery(options),
  };
}
