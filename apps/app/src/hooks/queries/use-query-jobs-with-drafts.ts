import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { JobDraftListItem, OrgJobListItem } from '@comitium/schemas/jobs';
import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { qk } from '@/hooks/query-keys';
import { getDrafts, getOrgJobs } from '@/lib/api/jobs';
import { isDefined } from '@/lib/utils';

export type StatusFilter = 'open' | 'closed' | 'draft' | 'archived' | 'all';

const PAGE_LIMIT = 100;

export function useJobsWithDrafts(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();
  const canLoad = isAuthenticated && isDefined(orgId);

  const jobsQuery = useInfiniteQuery({
    queryKey: qk.jobs.orgAllPages(orgId),
    queryFn: isDefined(orgId)
      ? ({ pageParam }) => getOrgJobs(orgId, { status: 'all', limit: PAGE_LIMIT, cursor: pageParam })
      : skipToken,
    enabled: isAuthenticated,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
    staleTime: STALE_TIME_SHORT,
  });

  const draftsQuery = useInfiniteQuery({
    queryKey: qk.jobs.draftsAllPages(orgId),
    queryFn: isDefined(orgId)
      ? ({ pageParam }) => getDrafts(orgId, { limit: PAGE_LIMIT, cursor: pageParam })
      : skipToken,
    enabled: isAuthenticated,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
    staleTime: STALE_TIME_SHORT,
  });

  const archivedQuery = useInfiniteQuery({
    queryKey: qk.jobs.archivedAllPages(orgId),
    queryFn: isDefined(orgId)
      ? ({ pageParam }) => getOrgJobs(orgId, { status: 'archived', limit: PAGE_LIMIT, cursor: pageParam })
      : skipToken,
    enabled: isAuthenticated,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
    staleTime: STALE_TIME_SHORT,
  });

  const {
    hasNextPage: jobsHasNextPage,
    isFetchingNextPage: jobsFetchingNext,
    fetchNextPage: fetchNextJobs,
  } = jobsQuery;
  const {
    hasNextPage: draftsHasNextPage,
    isFetchingNextPage: draftsFetchingNext,
    fetchNextPage: fetchNextDrafts,
  } = draftsQuery;
  const {
    hasNextPage: archivedHasNextPage,
    isFetchingNextPage: archivedFetchingNext,
    fetchNextPage: fetchNextArchived,
  } = archivedQuery;

  useEffect(() => {
    if (jobsHasNextPage && !jobsFetchingNext) {
      fetchNextJobs();
    }
  }, [jobsHasNextPage, jobsFetchingNext, fetchNextJobs]);

  useEffect(() => {
    if (draftsHasNextPage && !draftsFetchingNext) {
      fetchNextDrafts();
    }
  }, [draftsHasNextPage, draftsFetchingNext, fetchNextDrafts]);

  useEffect(() => {
    if (archivedHasNextPage && !archivedFetchingNext) {
      fetchNextArchived();
    }
  }, [archivedHasNextPage, archivedFetchingNext, fetchNextArchived]);

  const activeJobs: OrgJobListItem[] = jobsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const archivedJobs: OrgJobListItem[] = archivedQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const jobs = [...activeJobs, ...archivedJobs];
  const drafts: JobDraftListItem[] = draftsQuery.data?.pages.flatMap((page) => page.data) ?? [];

  const isLoading =
    (canLoad && jobsQuery.isLoading) || (canLoad && draftsQuery.isLoading) || (canLoad && archivedQuery.isLoading);

  return { jobs, drafts, isLoading };
}
