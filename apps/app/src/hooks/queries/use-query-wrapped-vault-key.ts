import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_LONG } from '@comitium/schemas/api-query-policy';
import type { WrappedKey } from '@comitium/schemas/common';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getWrappedVaultKey } from '@/lib/api/orgs-vault';
import { isDefined } from '@/lib/utils';

export function useQueryWrappedVaultKey(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<WrappedKey>({
    queryKey: qk.org.vaultAccess(orgId),
    queryFn: isAuthenticated && isDefined(orgId) ? () => getWrappedVaultKey(orgId) : skipToken,
    staleTime: STALE_TIME_LONG,
  });
}
