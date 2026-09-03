import { STALE_TIME_LONG } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getSubstitutionTokens } from '@/lib/api/substitution-tokens';
import type { TokenRegistry } from '@/lib/schemas/substitution-tokens';

export function useQuerySubstitutionTokens(orgId: string | null, registry: TokenRegistry) {
  return useQuery({
    queryKey: qk.settings.substitutionTokens(orgId, registry),
    queryFn: orgId !== null ? () => getSubstitutionTokens(orgId, registry) : skipToken,
    staleTime: STALE_TIME_LONG,
  });
}
