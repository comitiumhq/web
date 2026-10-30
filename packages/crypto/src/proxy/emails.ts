import type { CryptoContextInput } from '../context';
import type { RecipientDescriptor } from '../recipients';
import type { EncryptedEnvelope, EnvelopeKey } from '../schemas';
import type { VaultKeyAccess } from '../schemas/vault-key';
import { runOnWorker } from './runtime';

export const emailsProxy = {
  async encryptEmailContent(
    data: unknown,
    context: CryptoContextInput,
    recipients: RecipientDescriptor[],
  ): Promise<EncryptedEnvelope> {
    return runOnWorker((api) => api.encryptEmailContent(data, context, recipients));
  },

  async encryptEmailContentWithOverlays(
    data: unknown,
    context: CryptoContextInput,
    storedRecipients: RecipientDescriptor[],
    overlayRecipients: RecipientDescriptor[],
  ): Promise<{ envelope: EncryptedEnvelope; overlayKeys: EnvelopeKey[] }> {
    return runOnWorker((api) =>
      api.encryptEmailContentWithOverlays(data, context, storedRecipients, overlayRecipients),
    );
  },

  async decryptEmailContentForOrganization(
    envelope: EncryptedEnvelope,
    orgId: string,
    vaultAccess: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<unknown> {
    return runOnWorker((api) => api.decryptEmailContentForOrganization(envelope, orgId, vaultAccess, context));
  },

  async decryptEmailContentForApplicant(envelope: EncryptedEnvelope, context: CryptoContextInput): Promise<unknown> {
    return runOnWorker((api) => api.decryptEmailContentForApplicant(envelope, context));
  },
};
