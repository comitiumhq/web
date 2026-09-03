import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getArchiveReasonsList } from '@/lib/api/archive-reasons';

interface QueryParams {
  includeArchived?: boolean;
}

export function useQueryArchiveReasonsList(orgId: string | null, params: QueryParams = {}) {
  return useQuery({
    queryKey: qk.settings.archiveReasonsList(orgId, params),
    queryFn: orgId !== null ? () => getArchiveReasonsList(orgId, params) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
