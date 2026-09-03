import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { qk } from '@/hooks/query-keys';
import { getInterviewRsvp } from '@/lib/api/interviews';

interface UseInterviewRsvpParams {
  applicationId: string | undefined;
  interviewId: string | undefined;
  enabled: boolean;
}

const RSVP_STALE_TIME_MS = 60 * 1000;
const RSVP_GC_TIME_MS = 5 * 60 * 1000;

export function useQueryInterviewRsvp({ applicationId, interviewId, enabled }: UseInterviewRsvpParams) {
  const isAuthenticated = useIsAuthenticated();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.interviews.rsvp(applicationId, interviewId),
    queryFn: applicationId && interviewId ? () => getInterviewRsvp(applicationId, interviewId) : skipToken,
    enabled: isAuthenticated && enabled,
    staleTime: RSVP_STALE_TIME_MS,
    gcTime: RSVP_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data?.data.status !== 'available' || !applicationId) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: qk.application.interviewProgress(applicationId) });
  }, [applicationId, query.dataUpdatedAt, query.data?.data.status, queryClient]);

  return query;
}
