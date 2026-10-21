import { vaultKeyAccessSchema, vaultKeySchema } from '@comitium/schemas/vault';

import { api } from './client';

export function getOrgVaultKey(orgId: string) {
  return api.get(`/orgs/${orgId}/vault-key`, vaultKeySchema);
}

export function getOrgVaultAccess(orgId: string) {
  return api.get(`/orgs/${orgId}/vault-access`, vaultKeyAccessSchema);
}
