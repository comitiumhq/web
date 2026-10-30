import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_DEFAULT, STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { type InfiniteData, skipToken, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { invalidateInterviewProjections } from '@/hooks/mutations/invalidate-interview-projections';
import { qk } from '@/hooks/query-keys';
import { DEFAULT_CURSOR_PAGE_SIZE } from '@/lib/api/cursor-pagination';
import {
  getApplicationInterviewProgress,
  getApplicationInterviews,
  getCalendarStatus,
  getInterviewBriefing,
  getMyInterviews,
} from '@/lib/api/interviews';
import type { CalendarStatus, InterviewProgressResponse, InterviewsList, MyInterview } from '@/lib/schemas/interviews';

const INTERVIEW_BOOKING_POLL_INTERVAL_MS = 2_000;

function hasPendingInterviewBookings(data: InfiniteData<InterviewsList> | undefined): boolean {
  return (
    data?.pages.some((page) => page.data.some((schedule) => schedule.events.some((event) => event.bookingPending))) ??
    false
  );
}

export function useQueryApplicationInterviews(applicationId: string | null) {
  const isAuthenticated = useIsAuthenticated();
  const queryClient = useQueryClient();
  const pendingApplicationId = useRef<string | null>(null);

  const query = useInfiniteQuery<InterviewsList>({
    queryKey: qk.application.interviews(applicationId),
    queryFn: applicationId
      ? ({ pageParam }) =>
          getApplicationInterviews(applicationId, DEFAULT_CURSOR_PAGE_SIZE, pageParam as string | undefined)
      : skipToken,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: STALE_TIME_SHORT,
    enabled: isAuthenticated,
    refetchInterval: (state) =>
      hasPendingInterviewBookings(state.state.data) ? INTERVIEW_BOOKING_POLL_INTERVAL_MS : false,
  });
  const bookingPending = hasPendingInterviewBookings(query.data);

  useEffect(() => {
    if (!query.isSuccess) {
      return;
    }

    const previousApplicationId = pendingApplicationId.current;
    pendingApplicationId.current = bookingPending ? applicationId : null;

    if (applicationId && previousApplicationId === applicationId && !bookingPending) {
      invalidateInterviewProjections(queryClient, applicationId);
    }
  }, [applicationId, bookingPending, query.isSuccess, queryClient]);

  const data = useMemo<InterviewsList | undefined>(() => {
    if (!query.data) {
      return undefined;
    }

    const firstPage = query.data.pages[0];
    const lastPage = query.data.pages.at(-1);

    return {
      data: query.data.pages.flatMap((page) => page.data),
      total: firstPage?.total ?? 0,
      pagination: lastPage?.pagination ?? { nextCursor: null, hasMore: false },
    };
  }, [query.data]);

  return { ...query, data };
}

export function useQueryApplicationInterviewProgress(applicationId: string | null) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<InterviewProgressResponse>({
    queryKey: qk.application.interviewProgress(applicationId),
    queryFn: applicationId ? () => getApplicationInterviewProgress(applicationId) : skipToken,
    staleTime: STALE_TIME_SHORT,
    enabled: isAuthenticated,
  });
}

export function useQueryMyInterviews(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<{ data: MyInterview[] }>({
    queryKey: qk.interviews.my(orgId),
    queryFn: orgId ? () => getMyInterviews(orgId) : skipToken,
    staleTime: STALE_TIME_SHORT,
    enabled: isAuthenticated,
  });
}

export function useQueryInterviewBriefing(applicationId?: string, interviewEventId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: qk.application.interviewBriefing(applicationId, interviewEventId),
    queryFn:
      applicationId && interviewEventId ? () => getInterviewBriefing(applicationId, interviewEventId) : skipToken,
    staleTime: STALE_TIME_SHORT,
    enabled: isAuthenticated,
  });
}

export function useQueryCalendarStatus(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<CalendarStatus>({
    queryKey: qk.calendar.status(orgId),
    queryFn: orgId ? () => getCalendarStatus(orgId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
    enabled: isAuthenticated,
  });
}
