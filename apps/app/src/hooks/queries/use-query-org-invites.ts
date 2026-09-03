import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';

import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getOrgInvites } from '@/lib/api/orgs-invites';
import type { OrgInvite } from '@/lib/schemas/org';
import { isDefined } from '@/lib/utils';

export type { OrgInvite };

export function useQueryOrgInvites(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<OrgInvite[]>({
    queryKey: qk.org.invites(orgId),
    queryFn:
      isAuthenticated && isDefined(orgId)
        ? async () => {
            const data = await getOrgInvites(orgId);

            return data.data;
          }
        : skipToken,
    staleTime: STALE_TIME_SHORT,
  });
}
