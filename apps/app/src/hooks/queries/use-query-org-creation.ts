import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getOrgCreationStatus } from '@/lib/api/orgs-creation';
import type { OrgCreationStatus } from '@/lib/schemas/org';

const CREATION_STATUS_REFETCH_INTERVAL_MS = 2_000;

export function useQueryOrgCreation(options: { enabled?: boolean; pollWhileCreating?: boolean } = {}) {
  const isAuthenticated = useIsAuthenticated();
  const enabled = options.enabled ?? true;
  const pollWhileCreating = options.pollWhileCreating ?? false;

  return useQuery<OrgCreationStatus>({
    queryKey: qk.orgs.creation(),
    queryFn: getOrgCreationStatus,
    enabled: isAuthenticated && enabled,
    staleTime: STALE_TIME_DEFAULT,
    refetchInterval: (query) => {
      if (pollWhileCreating && query.state.data?.status === 'creating') {
        return CREATION_STATUS_REFETCH_INTERVAL_MS;
      }

      return false;
    },
    refetchOnWindowFocus: (state) => {
      return pollWhileCreating && state.state.data?.status === 'creating' ? 'always' : false;
    },
  });
}
