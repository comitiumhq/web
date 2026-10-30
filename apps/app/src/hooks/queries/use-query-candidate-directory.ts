import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { CandidateSearchDefinition } from '@comitium/schemas/candidate-search';
import { type QueryFunctionContext, type QueryKey, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useCandidateSearchSync } from '@/components/auth/candidate-search-coordinator';
import { qk } from '@/hooks/query-keys';
import { queryCandidates } from '@/lib/api/candidate-search';
import {
  type CandidateDirectoryPage,
  CandidateSearchChanged,
  PrivateCandidateSearch,
} from '@/lib/candidates/search/candidate-query';
import { compileCandidateSearch } from '@/lib/candidates/search/query-definition';

interface CandidateDirectoryCursor {
  page: number;
  cursor: string | null;
}

interface CandidateDirectoryScan {
  search: PrivateCandidateSearch;
  page: number;
}

interface CandidateDirectoryState {
  scan: CandidateDirectoryScan | null;
}

export function useQueryCandidateDirectory(orgId: string, definition: CandidateSearchDefinition, requestId: string) {
  const unlocked = useIsCryptoActive();
  const sync = useCandidateSearchSync();
  const queryClient = useQueryClient();
  const compiled = useMemo(() => compileCandidateSearch(definition), [definition]);
  const state = useMemo<CandidateDirectoryState>(() => ({ scan: null }), [orgId, requestId]);
  const enabled = unlocked && (!compiled.privateFilter || Boolean(sync.runtime && sync.status?.phase === 'ready'));
  const queryKey = qk.candidate.directory(orgId, requestId);

  const initialPageParam: CandidateDirectoryCursor = { page: 0, cursor: null };

  const query = useInfiniteQuery({
    queryKey,
    meta: { privateCandidateSearch: Boolean(compiled.privateFilter) },
    enabled,
    retry: false,
    gcTime: 0,
    staleTime: compiled.privateFilter ? Number.POSITIVE_INFINITY : STALE_TIME_SHORT,
    refetchOnWindowFocus: !compiled.privateFilter,
    refetchOnReconnect: !compiled.privateFilter,
    queryFn: async (
      context: QueryFunctionContext<QueryKey, CandidateDirectoryCursor>,
    ): Promise<CandidateDirectoryPage> => {
      const { pageParam } = context;

      if (compiled.privateFilter) {
        const { signal } = context;
        const ready = sync.status?.ready;

        if (!ready || !sync.runtime) {
          throw new Error('Candidate search is preparing');
        }

        /**
         * A refetch starts at page zero and rebuilds the ordered continuation.
         */
        if (pageParam.page === 0) {
          state.scan?.search.cancel();
          state.scan = {
            search: new PrivateCandidateSearch(orgId, compiled.server, compiled.privateFilter),
            page: 0,
          };
        }

        const current = state.scan;

        if (!current) {
          throw new CandidateSearchChanged();
        }

        /**
         * Retrying a failed page resumes it without consuming its buffered matches twice.
         */
        if (current.page !== pageParam.page) {
          current.search.advance();
          current.page = pageParam.page;
        }

        return current.search.page(sync.runtime, ready, signal);
      }

      const response = await queryCandidates(orgId, { ...compiled.server, cursor: pageParam.cursor ?? undefined });

      if (response.mode !== 'list') {
        throw new Error('Invalid candidate list response');
      }

      return {
        rows: response.data,
        hasMore: response.pagination.hasMore,
        nextCursor: response.pagination.nextCursor,
        incomplete: response.coverage.professional === 'incomplete',
        approximate: response.retrieval === 'approximate',
        unreadable: 0,
        scanning: false,
      };
    },
    initialPageParam,
    getNextPageParam: (
      lastPage: CandidateDirectoryPage,
      pages: CandidateDirectoryPage[],
    ): CandidateDirectoryCursor | undefined => {
      if (!lastPage.hasMore) {
        return undefined;
      }

      return { page: pages.length, cursor: lastPage.nextCursor };
    },
  });

  useEffect(() => {
    if (!unlocked || !compiled.privateFilter) {
      return;
    }

    return () => {
      void queryClient.cancelQueries({ queryKey });
      state.scan?.search.cancel();
      state.scan = null;
    };
  }, [queryClient, orgId, requestId, unlocked, compiled.privateFilter, state]);

  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.rows) ?? [], [query.data]);

  return {
    ...query,
    rows,
    preparing: Boolean(compiled.privateFilter && !enabled && !sync.error),
    preparationError: compiled.privateFilter ? sync.error : null,
    retryPreparation: sync.refresh,
    next: () => {
      if (!query.hasNextPage || query.isFetching) {
        return;
      }

      void query.fetchNextPage({ cancelRefetch: false });
    },
  };
}
