import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getForm } from '@/lib/api/form-definitions';

export function useQueryForm(orgId: string | null, formId: string | null) {
  return useQuery({
    queryKey: qk.settings.form(orgId, formId),
    queryFn: orgId !== null && formId !== null ? () => getForm(orgId, formId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
