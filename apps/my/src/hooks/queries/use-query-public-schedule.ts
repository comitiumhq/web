import { STALE_TIME_SHORT, shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getPublicScheduleSlots, getPublicScheduleState } from '@/lib/api/public-schedule';
import type { PublicScheduleSlotsResponse, PublicScheduleStateResponse } from '@/lib/schemas/public-schedule';

interface UseQueryPublicScheduleSlotsParams {
  token: string;
  from: string;
  to: string;
  timeZone: string;
  enabled: boolean;
}

export function useQueryPublicScheduleState(token: string) {
  return useQuery<PublicScheduleStateResponse>({
    queryKey: qk.publicSchedule.state(token),
    queryFn: () => getPublicScheduleState(token),
    staleTime: STALE_TIME_SHORT,
    retry: shouldRetryQuery,
  });
}

export function useQueryPublicScheduleSlots(params: UseQueryPublicScheduleSlotsParams) {
  return useQuery<PublicScheduleSlotsResponse>({
    queryKey: qk.publicSchedule.slots(params.token, params.from, params.to, params.timeZone),
    queryFn: () =>
      getPublicScheduleSlots(params.token, {
        from: params.from,
        to: params.to,
        timeZone: params.timeZone,
      }),
    staleTime: STALE_TIME_SHORT,
    enabled: params.enabled,
    retry: shouldRetryQuery,
  });
}
