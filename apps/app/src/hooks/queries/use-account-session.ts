import { useSession } from '@comitium/auth/use-session';

import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getMyOrgs, getOrgMe } from '@/lib/api/orgs';
import type { MyOrg, OrgMeResponse } from '@/lib/schemas/org';
import { getPreferredOrg } from '@/lib/utils/org';

async function getPublicSessionOrgs(): Promise<MyOrg[]> {
  const response = await getMyOrgs();

  return response.data;
}

export function useAccountSession() {
  const { user, isSignedIn, isSessionReady } = useSession();

  const orgs = useQuery<MyOrg[]>({
    queryKey: qk.orgs.my(),
    queryFn: getPublicSessionOrgs,
    enabled: isSignedIn,
    retry: false,
    staleTime: STALE_TIME_DEFAULT,
    refetchOnWindowFocus: false,
  });

  const orgList = orgs.data ?? [];
  const preferredOrg = getPreferredOrg(orgList);
  const preferredOrgId = preferredOrg?.id ?? null;

  const orgMember = useQuery<OrgMeResponse>({
    queryKey: qk.org.permissions(preferredOrgId),
    queryFn: preferredOrgId !== null ? () => getOrgMe(preferredOrgId) : skipToken,
    enabled: isSignedIn,
    retry: false,
    staleTime: STALE_TIME_DEFAULT,
    refetchOnWindowFocus: false,
  });

  return {
    isOrgLookupReady: !isSignedIn || orgs.isSuccess,
    isSessionReady,
    isSignedIn,
    org: preferredOrg,
    orgMember: orgMember.data ?? null,
    orgs: orgList,
    user,
  };
}
