import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import type { FormClass } from '@comitium/schemas/forms';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getFormsList } from '@/lib/api/form-definitions';

interface QueryParams {
  formClass?: FormClass;
  includeArchived?: boolean;
}

export function useQueryFormsList(orgId: string | null, params: QueryParams = {}) {
  return useQuery({
    queryKey: qk.settings.formsList(orgId, params),
    queryFn: orgId !== null ? () => getFormsList(orgId, params) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
