import type { CryptoContextInput } from '../context';
import type { RecipientDescriptor } from '../recipients';
import type { EncryptedEnvelope, EnvelopeKey, PublicEncryptionKey } from '../schemas';
import type { VaultKeyAccess } from '../schemas/vault-key';
import { runOnWorker } from './runtime';

export const applicationsProxy = {
  async encryptApplication(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: unknown,
    context: CryptoContextInput,
  ): Promise<EncryptedEnvelope> {
    return runOnWorker((api) => api.encryptApplication(vaultPublicKey, vaultKeyVersion, data, context));
  },

  async encryptApplicationWithOverlays(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: unknown,
    context: CryptoContextInput,
    overlayRecipients: RecipientDescriptor[],
  ) {
    return runOnWorker((api) =>
      api.encryptApplicationWithOverlays(vaultPublicKey, vaultKeyVersion, data, context, overlayRecipients),
    );
  },

  async decryptApplication(
    envelope: EncryptedEnvelope,
    orgId: string,
    vaultAccess: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<Record<string, unknown>> {
    return runOnWorker((api) => api.decryptApplication(envelope, orgId, vaultAccess, context));
  },

  async rewrapEnvelopeKey(
    orgId: string,
    vaultAccess: VaultKeyAccess,
    sourceKey: EnvelopeKey,
    context: CryptoContextInput,
    recipient: RecipientDescriptor,
  ): Promise<EnvelopeKey> {
    return runOnWorker((api) => api.rewrapEnvelopeKey(orgId, vaultAccess, sourceKey, context, recipient));
  },
};
