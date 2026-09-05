import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getWorkspaceSetup } from '@/lib/api/orgs';

export function useQueryWorkspaceSetup(orgId?: string, enabled = true) {
  return useQuery({
    queryKey: qk.org.workspaceSetup(orgId),
    queryFn: orgId ? async () => (await getWorkspaceSetup(orgId)).data : skipToken,
    enabled,
    staleTime: STALE_TIME_SHORT,
    refetchOnWindowFocus: 'always',
    retry: false,
  });
}
