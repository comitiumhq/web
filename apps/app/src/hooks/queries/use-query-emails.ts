import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qk } from '@/hooks/query-keys';
import { getEmails } from '@/lib/api/applications-data';
import { DEFAULT_CURSOR_PAGE_SIZE } from '@/lib/api/cursor-pagination';
import type { EmailListResponse, EmailResponse } from '@/lib/schemas/emails';

/**
 * Fetch encrypted emails for an application.
 * Returns encrypted content — caller must decrypt via vault key or personal key.
 */
export function useQueryEmails(applicationId: string | null) {
  const query = useInfiniteQuery<EmailListResponse>({
    queryKey: qk.application.emails(applicationId),
    queryFn: applicationId
      ? ({ pageParam }) => getEmails(applicationId, DEFAULT_CURSOR_PAGE_SIZE, pageParam as string | undefined)
      : skipToken,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: STALE_TIME_SHORT,
  });
  const data = useMemo<EmailResponse[] | undefined>(
    () => query.data?.pages.flatMap((page) => page.data),
    [query.data?.pages],
  );

  return { ...query, data };
}
