import { vaultKeySchema, wrappedVaultKeyResponseSchema } from '@comitium/schemas/vault';

import { api } from './client';

export function getOrgVaultKey(orgId: string) {
  return api.get(`/orgs/${orgId}/vault-key`, vaultKeySchema);
}

export async function getWrappedVaultKey(orgId: string) {
  const { encryptedVaultKey } = await api.get(`/orgs/${orgId}/vault-access`, wrappedVaultKeyResponseSchema);

  return encryptedVaultKey;
}
