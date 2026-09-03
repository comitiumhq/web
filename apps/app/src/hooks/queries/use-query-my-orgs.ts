import { useSession } from '@comitium/auth/use-session';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getMyOrgs } from '@/lib/api/orgs';

import type { MyOrg } from '@/lib/schemas/org';

export type { MyOrg };

export function useQueryMyOrgs() {
  const { isSignedIn } = useSession();

  return useQuery<MyOrg[]>({
    queryKey: qk.orgs.my(),
    queryFn: async () => {
      const data = await getMyOrgs();

      return data.data;
    },
    enabled: isSignedIn,
    staleTime: STALE_TIME_DEFAULT,
    refetchOnWindowFocus: false,
  });
}
