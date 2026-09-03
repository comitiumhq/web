import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getInterviewBusyTimes } from '@/lib/api/interviews';

interface UseInterviewBusyParams {
  applicationId: string | undefined;
  interviewerUserIds: string[];
  startTime: string | undefined;
  endTime: string | undefined;
  timeZone: string;
}

export function useQueryInterviewBusy({
  applicationId,
  interviewerUserIds,
  startTime,
  endTime,
  timeZone,
}: UseInterviewBusyParams) {
  const isAuthenticated = useIsAuthenticated();
  const interviewerKey = [...interviewerUserIds].sort().join(',');

  return useQuery({
    queryKey: qk.interviews.busy(applicationId, interviewerKey, startTime, endTime, timeZone),
    queryFn:
      applicationId && startTime && endTime
        ? () => getInterviewBusyTimes(applicationId, { interviewerUserIds, startTime, endTime, timeZone })
        : skipToken,
    enabled: isAuthenticated && interviewerUserIds.length > 0,
    staleTime: STALE_TIME_SHORT,
    placeholderData: keepPreviousData,
  });
}
