import { skipToken, useQuery } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { getApplicationFormUsage } from '@/lib/api/form-definitions';

export function useQueryApplicationFormUsage(orgId: string, formId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.settings.formUsage(orgId, formId),
    queryFn: enabled ? () => getApplicationFormUsage(orgId, formId) : skipToken,
    staleTime: 0,
  });
}
