import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { DuplicateApplicationAttemptsResponse } from '@comitium/schemas/applications';
import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qk } from '@/hooks/query-keys';
import { getDuplicateApplicationAttempts } from '@/lib/api/applications-data';
import { DEFAULT_CURSOR_PAGE_SIZE } from '@/lib/api/cursor-pagination';

export function useQueryDuplicateApplicationAttempts(applicationId: string | null, enabled: boolean) {
  const isAuthenticated = useIsAuthenticated();
  const query = useInfiniteQuery<DuplicateApplicationAttemptsResponse>({
    queryKey: qk.application.duplicateAttempts(applicationId),
    queryFn: applicationId
      ? ({ pageParam }) =>
          getDuplicateApplicationAttempts(applicationId, DEFAULT_CURSOR_PAGE_SIZE, pageParam as string | undefined)
      : skipToken,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: STALE_TIME_SHORT,
    enabled: enabled && isAuthenticated,
  });
  const attempts = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data?.pages]);
  const total = query.data?.pages[0]?.total ?? 0;

  return { ...query, attempts, total };
}
