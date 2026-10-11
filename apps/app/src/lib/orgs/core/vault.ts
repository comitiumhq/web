import { CryptoProxy, type PublicEncryptionKey } from '@comitium/crypto';
import type { WrappedKey } from '@comitium/schemas/common';
import { VaultError } from '@comitium/schemas/product-errors';
import { successSchema } from '@comitium/schemas/public';
import { errAsync, ResultAsync } from 'neverthrow';
import { api, hasApiErrorStatus } from '@/lib/api/client';
import { getOrgVaultKey } from '@/lib/api/orgs-vault';

interface VaultKeyData {
  vaultPublicKey: PublicEncryptionKey;
  wrappedVaultKey: WrappedKey;
}

/**
 * Generate vault keypair and wrap for owner.
 * Private key never leaves the Worker.
 */
function generateAndWrapVaultKey(ownerPublicKey: PublicEncryptionKey): ResultAsync<VaultKeyData, VaultError> {
  return ResultAsync.fromPromise(
    CryptoProxy.generateAndWrapVaultKey(ownerPublicKey),
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

      return generateAndWrapVaultKey(ownerPublicKey).andThen(({ vaultPublicKey, wrappedVaultKey }) =>
        saveVaultKeys(orgId, vaultPublicKey, wrappedVaultKey),
      );
    });
}

/**
 * Save vault keys to backend
 */
export function saveVaultKeys(
  orgId: string,
  vaultPublicKey: PublicEncryptionKey,
  wrappedVaultKey: WrappedKey,
): ResultAsync<void, VaultError> {
  return ResultAsync.fromPromise(
    api.post(`/orgs/${orgId}/vault`, { vaultPublicKey, wrappedVaultKey }, successSchema).then(() => undefined),
    (e) => new VaultError('save_vault', e),
  );
}
