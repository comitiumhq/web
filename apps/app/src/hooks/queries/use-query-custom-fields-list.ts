import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import type { ObjectType } from '@comitium/schemas/forms';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getCustomFieldsList } from '@/lib/api/custom-fields';

interface QueryParams {
  objectType?: ObjectType;
  includeArchived?: boolean;
}

export function useQueryCustomFieldsList(orgId: string | null, params: QueryParams = {}) {
  return useQuery({
    queryKey: qk.settings.customFieldsList(orgId, params),
    queryFn: orgId !== null ? () => getCustomFieldsList(orgId, params) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
