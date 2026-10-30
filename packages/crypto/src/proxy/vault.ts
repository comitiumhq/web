import type { PublicEncryptionKey } from '../schemas';
import type { WrappedKey } from '../schemas/keys';
import type { VaultKeyAccess, VaultKeyContext } from '../schemas/vault-key';
import { runOnWorker } from './runtime';

export const vaultProxy = {
  generateAndWrapVaultKey(orgId: string, ownerPublicKey: PublicEncryptionKey): Promise<VaultKeyAccess> {
    return runOnWorker((api) => api.generateAndWrapVaultKey(orgId, ownerPublicKey));
  },

  grantVaultAccess(
    ownAccess: VaultKeyAccess,
    memberPublicKey: PublicEncryptionKey,
    recipient: Pick<VaultKeyContext, 'recipientUserId' | 'recipientKeyVersion'>,
  ): Promise<WrappedKey> {
    return runOnWorker((api) => api.grantVaultAccess(ownAccess, memberPublicKey, recipient));
  },
};
