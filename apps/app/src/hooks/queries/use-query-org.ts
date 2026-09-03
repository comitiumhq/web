import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getOrg } from '@/lib/api/orgs';

import type { OrgDetails } from '@/lib/schemas/org';

export type { OrgDetails };

export function useQueryOrg(orgId: string) {
  return useQuery<OrgDetails>({
    queryKey: qk.org.detail(orgId),
    queryFn: () => getOrg(orgId),
    staleTime: STALE_TIME_DEFAULT,
  });
}
