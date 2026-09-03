import { skipToken, useQuery } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { getFeedbackFormUsage } from '@/lib/api/form-definitions';

export function useQueryFeedbackFormUsage(orgId: string, formId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.settings.formUsage(orgId, formId),
    queryFn: enabled ? () => getFeedbackFormUsage(orgId, formId) : skipToken,
    staleTime: 0,
  });
}
