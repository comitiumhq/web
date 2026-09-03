import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_LONG } from '@comitium/schemas/api-query-policy';
import type { VaultKeyResponse } from '@comitium/schemas/vault';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getOrgVaultKey } from '@/lib/api/orgs-vault';
import { isDefined } from '@/lib/utils';

export function useQueryOrgVaultKey(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<VaultKeyResponse>({
    queryKey: qk.org.vaultKey(orgId),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getOrgVaultKey(orgId) : skipToken,
    staleTime: STALE_TIME_LONG,
  });
}
