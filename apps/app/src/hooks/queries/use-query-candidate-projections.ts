import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { useSession } from '@comitium/auth/use-session';
import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useQueryOrgVaultAccess } from '@/hooks/queries/use-query-org-vault-access';
import { qk } from '@/hooks/query-keys';
import { getErrorStatus } from '@/lib/api/client';
import { runCandidateProjectionPass } from '@/lib/candidates/run-projections';

const LIST_REFRESH_INTERVAL_MS = 10_000;

export function useQueryCandidateProjections(orgId: string) {
  const { user } = useSession();
  const isCryptoActive = useIsCryptoActive();
  const vault = useQueryOrgVaultAccess(orgId);
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const enabled = Boolean(userId && isCryptoActive && vault.isSuccess);
  const access = vault.data;
  const vaultGeneration = access
    ? `${access.vaultKeyVersion}:${access.recipientKeyVersion}:${access.searchKey.searchKeyVersion}`
    : 'unavailable';

  const queryKey = useMemo(
    () => qk.org.candidateProjections(orgId, userId, vaultGeneration),
    [orgId, userId, vaultGeneration],
  );

  const listRefresh = useMemo(() => ({ pending: false, lastRefreshAt: 0 }), [queryKey]);

  const query = useQuery<{ hasMore: boolean }>({
    queryKey,
    enabled,
    retry: false,
    gcTime: 0,
    refetchInterval: (state) => (state.state.data?.hasMore ? 1_000 : 15_000),
    refetchIntervalInBackground: true,
    queryFn: async ({ signal }) => {
      if (!access) {
        throw new Error('Vault access is unavailable');
      }

      const result = await runCandidateProjectionPass(orgId, access, signal);

      signal.throwIfAborted();

      if (result.candidateIds.length > 0) {
        listRefresh.pending = true;

        await Promise.all([
          ...result.candidateIds.flatMap((id) => [
            queryClient.invalidateQueries({ queryKey: qk.candidate.detail(id) }),
            queryClient.invalidateQueries({ queryKey: qk.application.candidateCustomFieldValues(id) }),
          ]),
          ...result.applicationIds.map((id) => queryClient.invalidateQueries({ queryKey: qk.application.detail(id) })),
        ]);
      }

      signal.throwIfAborted();

      if (listRefresh.pending) {
        const refreshNow = !result.hasMore || Date.now() - listRefresh.lastRefreshAt >= LIST_REFRESH_INTERVAL_MS;
        const refetchType = refreshNow ? 'active' : 'none';

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: qk.pipeline.candidatesRoot(), refetchType }),
          queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot(), refetchType }),
          queryClient.invalidateQueries({ predicate: (query) => qk.jobs.isKanban(query.queryKey), refetchType }),
        ]);

        if (refreshNow) {
          listRefresh.pending = false;
          listRefresh.lastRefreshAt = Date.now();
        }
      }

      signal.throwIfAborted();

      return { hasMore: result.hasMore };
    },
  });

  useEffect(() => {
    if (!enabled) {
      void queryClient.cancelQueries({ queryKey });
    }
  }, [queryClient, queryKey, enabled]);

  useEffect(() => {
    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (!online) {
        void queryClient.cancelQueries({ queryKey });
      } else {
        void queryClient.invalidateQueries({ queryKey });
      }
    });

    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') {
        void queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => {
      unsubscribeOnline();
      unsubscribeMutations();
      void queryClient.cancelQueries({ queryKey });
    };
  }, [queryClient, queryKey]);

  useEffect(() => {
    if (getErrorStatus(query.error) === 403) {
      void queryClient.invalidateQueries({ queryKey: qk.org.vaultAccess(orgId) });
      void queryClient.invalidateQueries({ queryKey: qk.org.permissions(orgId) });
    }
  }, [query.error, queryClient, orgId]);

  return query;
}
