import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import type { ApplicationApiResponse } from '@comitium/schemas/applications';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getApplication } from '@/lib/api/applications';

export function useQueryApplication(applicationId?: string | null) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<ApplicationApiResponse>({
    queryKey: qk.application.detail(applicationId),
    queryFn: applicationId ? () => getApplication(applicationId) : skipToken,
    staleTime: STALE_TIME_SHORT,
    enabled: isAuthenticated,
  });
}
