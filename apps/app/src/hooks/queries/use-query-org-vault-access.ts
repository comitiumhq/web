import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import type { VaultKeyAccess } from '@comitium/crypto';
import { STALE_TIME_LONG } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getOrgVaultAccess } from '@/lib/api/orgs-vault';
import { isDefined } from '@/lib/utils';

export function useQueryOrgVaultAccess(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<VaultKeyAccess>({
    queryKey: qk.org.vaultAccess(orgId),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getOrgVaultAccess(orgId) : skipToken,
    staleTime: STALE_TIME_LONG,
  });
}
