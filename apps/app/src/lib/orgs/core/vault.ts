import { CryptoProxy, type PublicEncryptionKey, type VaultKeyAccess } from '@comitium/crypto';
import { VaultError } from '@comitium/schemas/product-errors';
import { successSchema } from '@comitium/schemas/public';
import { errAsync, ResultAsync } from 'neverthrow';
import { api, hasApiErrorStatus } from '@/lib/api/client';
import { getOrgVaultKey, getWrappedVaultKey } from '@/lib/api/orgs-vault';

/**
 * Generate vault keypair and wrap for owner.
 * Private key never leaves the Worker.
 */
function generateAndWrapVaultKey(
  orgId: string,
  ownerPublicKey: PublicEncryptionKey,
): ResultAsync<VaultKeyAccess, VaultError> {
  return ResultAsync.fromPromise(
    CryptoProxy.generateAndWrapVaultKey(orgId, ownerPublicKey),
    (e) => new VaultError('generate_vault_key', e),
  );
}

export function ensureOrgVault(orgId: string, ownerPublicKey: PublicEncryptionKey): ResultAsync<void, VaultError> {
  return ResultAsync.fromPromise(getOrgVaultKey(orgId), (error) => error)
    .map(() => undefined)
    .orElse((error) => {
      if (!hasApiErrorStatus(error, 404)) {
        return errAsync(new VaultError('load_vault', error));
      }

      return generateAndWrapVaultKey(orgId, ownerPublicKey)
        .andThen((access) => saveVaultKeys(orgId, access))
        .andThen(() =>
          ResultAsync.fromPromise(
            getWrappedVaultKey(orgId).then(() => undefined),
            (e) => new VaultError('load_vault', e),
          ),
        );
    });
}

/**
 * Save vault keys to backend
 */
export function saveVaultKeys(orgId: string, access: VaultKeyAccess): ResultAsync<void, VaultError> {
  return ResultAsync.fromPromise(
    api
      .post(
        `/orgs/${orgId}/vault`,
        {
          vaultPublicKey: access.vaultPublicKey,
          wrappedVaultKey: access.wrappedVaultKey,
          vaultKeyVersion: access.vaultKeyVersion,
          recipientKeyVersion: access.recipientKeyVersion,
          searchKey: access.searchKey,
        },
        successSchema,
      )
      .then(() => undefined),
    (e) => new VaultError('save_vault', e),
  );
}
