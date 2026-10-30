import * as Comlink from 'comlink';
import type { CryptoContextInput } from '../context';
import type { RecipientDescriptor } from '../recipients';
import type { EnvelopeKey, PublicEncryptionKey } from '../schemas';
import type { VaultKeyAccess } from '../schemas/vault-key';
import { runOnWorker } from './runtime';

export const filesProxy = {
  async encryptFile(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: Uint8Array,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    return runOnWorker((api) =>
      api.encryptFile(vaultPublicKey, vaultKeyVersion, Comlink.transfer(data, [data.buffer]), context),
    );
  },

  async encryptFileWithOverlays(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: Uint8Array,
    context: CryptoContextInput,
    overlayRecipients: RecipientDescriptor[],
  ): Promise<{ blob: Uint8Array; overlayKeys: EnvelopeKey[] }> {
    return runOnWorker((api) =>
      api.encryptFileWithOverlays(
        vaultPublicKey,
        vaultKeyVersion,
        Comlink.transfer(data, [data.buffer]),
        context,
        overlayRecipients,
      ),
    );
  },

  async decryptFile(
    blob: Uint8Array,
    orgId: string,
    vaultAccess: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    return runOnWorker((api) => api.decryptFile(Comlink.transfer(blob, [blob.buffer]), orgId, vaultAccess, context));
  },
};
