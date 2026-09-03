import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import type { MyApplicationResponse } from '@comitium/schemas/applications';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getMyApplications } from '@/lib/api/applications';

export function useQueryMyApplications() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<MyApplicationResponse[]>({
    queryKey: qk.application.my(),
    queryFn: () => getMyApplications(),
    enabled: isAuthenticated,
    staleTime: STALE_TIME_DEFAULT,
  });
}
