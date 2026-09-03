import { substitutionTokensResponseSchema, type TokenRegistry } from '@/lib/schemas/substitution-tokens';

import { api } from './client';

export function getSubstitutionTokens(orgId: string, registry: TokenRegistry) {
  const qs = new URLSearchParams({ registry }).toString();

  return api.get(`/orgs/${orgId}/substitution-tokens?${qs}`, substitutionTokensResponseSchema);
}
