import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getCloseReasonsList } from '@/lib/api/close-reasons';

interface QueryParams {
  includeArchived?: boolean;
}

export function useQueryCloseReasonsList(orgId: string | null, params: QueryParams = {}) {
  return useQuery({
    queryKey: qk.settings.closeReasonsList(orgId, params),
    queryFn: orgId !== null ? () => getCloseReasonsList(orgId, params) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
