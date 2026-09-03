import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getPipelineSummary } from '@/lib/api/pipeline';
import type { PipelineSummaryResponse } from '@/lib/schemas/pipeline';
import { isDefined } from '@/lib/utils';

export function useQueryPipelineSummary(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<PipelineSummaryResponse>({
    queryKey: qk.pipeline.summary(orgId),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getPipelineSummary(orgId) : skipToken,
    staleTime: STALE_TIME_SHORT,
    placeholderData: keepPreviousData,
  });
}
