import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { CandidateNotesResponse } from '@comitium/schemas/candidates';
import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qk } from '@/hooks/query-keys';
import { getCandidateNotes } from '@/lib/api/candidates';
import { DEFAULT_CURSOR_PAGE_SIZE } from '@/lib/api/cursor-pagination';

export function useQueryCandidateNotes(candidateId: string | null) {
  const isAuthenticated = useIsAuthenticated();
  const query = useInfiniteQuery<CandidateNotesResponse>({
    queryKey: qk.application.candidateNotes(candidateId),
    queryFn: candidateId
      ? ({ pageParam }) => getCandidateNotes(candidateId, DEFAULT_CURSOR_PAGE_SIZE, pageParam as string | undefined)
      : skipToken,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: STALE_TIME_SHORT,
    enabled: isAuthenticated,
  });
  const notes = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data?.pages]);
  const total = query.data?.pages[0]?.total ?? 0;

  return { ...query, notes, total };
}
