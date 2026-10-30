import type { CandidateFilterOptionsInput } from '@comitium/schemas/candidate-search';
import { type QueryFunctionContext, type QueryKey, useInfiniteQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getCandidateFilterOptions } from '@/lib/api/candidate-search';

export function useQueryCandidateFilterOptions(
  orgId: string,
  input: Omit<CandidateFilterOptionsInput, 'after'>,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: qk.candidate.filterOptions(orgId, input),
    /**
     * Keep short metadata reads cached across picker unmounts and StrictMode replay.
     */
    queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, string | null>) =>
      getCandidateFilterOptions(orgId, { ...input, after: pageParam ?? undefined }),
    initialPageParam: null,
    getNextPageParam: (page) => page.nextAfter ?? undefined,
    staleTime: 30_000,
    enabled,
  });
}
