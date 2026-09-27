import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getOrgCreationStatus } from '@/lib/api/orgs-creation';
import type { OrgCreationStatus } from '@/lib/schemas/org';

export function useQueryOrgCreation(options: { enabled?: boolean } = {}) {
  const isAuthenticated = useIsAuthenticated();
  const enabled = options.enabled ?? true;

  return useQuery<OrgCreationStatus>({
    queryKey: qk.orgs.creation(),
    queryFn: getOrgCreationStatus,
    enabled: isAuthenticated && enabled,
    staleTime: STALE_TIME_DEFAULT,
  });
}
