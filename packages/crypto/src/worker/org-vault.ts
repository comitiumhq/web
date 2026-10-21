import { randomBytes } from '@noble/hashes/utils.js';
import type { PublicEncryptionKey } from '../schemas';
import type { WrappedKey } from '../schemas/keys';
import { type VaultKeyAccess, type VaultKeyContext, vaultKeyAccessSchema } from '../schemas/vault-key';
import { generateVaultKeyPair, unwrapSearchKey, unwrapVaultKey, wrapSearchKey, wrapVaultKey } from '../vault-key';
import type { UserKeySession } from './user-key-session';

/**
 * Verifies and caches organization vault/search keys for the current user session.
 */
export class OrgVault {
  constructor(private readonly session: UserKeySession) {}

  async generateAndWrapVaultKey(orgId: string, ownerPublicKey: PublicEncryptionKey): Promise<VaultKeyAccess> {
    const identity = this.session.requireIdentity();

    if (!this.session.matchesPublicKey(ownerPublicKey)) {
      throw new Error('Vault owner must match the unlocked user identity');
    }

    const { privateKey, publicKey } = generateVaultKeyPair();
    const searchKey = randomBytes(32);
    const context = {
      orgId,
      vaultKeyVersion: 1,
      recipientUserId: identity.userId,
      recipientKeyVersion: identity.keyVersion,
    };

    try {
      const wrappedVaultKey = await wrapVaultKey(privateKey, ownerPublicKey, context);
      const wrappedSearchKey = await wrapSearchKey(searchKey, privateKey, {
        orgId,
        vaultKeyVersion: 1,
        searchKeyVersion: 1,
      });

      return { ...context, vaultPublicKey: publicKey, wrappedVaultKey, searchKey: wrappedSearchKey };
    } finally {
      privateKey.fill(0);
      searchKey.fill(0);
    }
  }

  async grantVaultAccess(
    ownAccess: VaultKeyAccess,
    memberPublicKey: PublicEncryptionKey,
    recipient: Pick<VaultKeyContext, 'recipientUserId' | 'recipientKeyVersion'>,
  ): Promise<WrappedKey> {
    const vaultKey = await this.getVaultKey(ownAccess.orgId, ownAccess);

    return wrapVaultKey(vaultKey, memberPublicKey, {
      orgId: ownAccess.orgId,
      vaultKeyVersion: ownAccess.vaultKeyVersion,
      ...recipient,
    });
  }

  async getVaultKey(orgId: string, value: VaultKeyAccess): Promise<Uint8Array> {
    const access = this.validateAccess(orgId, value);

    return this.session.keys.getOrUnwrapVaultKey(access, () =>
      unwrapVaultKey(access, this.session.keys.getUserPrivateKey()),
    );
  }

  async getSearchKey(orgId: string, value: VaultKeyAccess): Promise<Uint8Array> {
    const access = this.validateAccess(orgId, value);

    return this.session.keys.getOrUnwrapSearchKey(access, async () => {
      const vaultKey = await this.getVaultKey(orgId, access);

      return unwrapSearchKey(access.searchKey, vaultKey);
    });
  }

  private validateAccess(orgId: string, value: VaultKeyAccess): VaultKeyAccess {
    const identity = this.session.requireIdentity();
    const access = vaultKeyAccessSchema.parse(value);

    const matchesRecipient =
      access.recipientUserId === identity.userId && access.recipientKeyVersion === identity.keyVersion;

    if (access.orgId !== orgId || !matchesRecipient) {
      throw new Error('Vault access does not match the current crypto identity');
    }

    return access;
  }
}
