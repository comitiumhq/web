import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getCancelRescheduleReasons } from '@/lib/api/cancel-reschedule-reasons';
import type { ReasonAppliesTo } from '@/lib/schemas/cancel-reschedule-reasons';

interface QueryParams {
  includeArchived?: boolean;
  appliesTo?: ReasonAppliesTo;
}

export function useQueryCancelRescheduleReasons(orgId: string | null, params: QueryParams = {}) {
  return useQuery({
    queryKey: qk.settings.cancelRescheduleReasons(orgId, params),
    queryFn: orgId !== null ? () => getCancelRescheduleReasons(orgId, params) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
