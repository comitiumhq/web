import type { CryptoContextInput } from './context';
import {
  decryptEnvelope,
  type EncryptedEnvelopeWithOverlays,
  encryptEnvelope,
  encryptEnvelopeWithOverlays,
} from './envelope';
import type { RecipientDescriptor } from './recipients';
import type { EncryptedEnvelope } from './schemas';

export type { EncryptedEnvelope } from './schemas';

export async function encryptEmailContent(
  data: unknown,
  context: CryptoContextInput,
  recipients: readonly RecipientDescriptor[],
): Promise<EncryptedEnvelope> {
  return encryptEnvelope(data, context, recipients);
}

export async function encryptEmailContentWithOverlays(
  data: unknown,
  context: CryptoContextInput,
  storedRecipients: readonly RecipientDescriptor[],
  overlayRecipients: readonly RecipientDescriptor[],
): Promise<EncryptedEnvelopeWithOverlays> {
  return encryptEnvelopeWithOverlays(data, context, storedRecipients, overlayRecipients);
}

export async function decryptEmailContentWithVaultKey<T = unknown>(
  envelope: EncryptedEnvelope,
  vaultPrivateKey: Uint8Array,
  context: CryptoContextInput,
): Promise<T> {
  return decryptEnvelope<T>(envelope, context, { recipient: 'org_vault', privateKey: vaultPrivateKey });
}

export async function decryptEmailContentWithPersonalKey<T = unknown>(
  envelope: EncryptedEnvelope,
  personalPrivateKey: Uint8Array,
  context: CryptoContextInput,
): Promise<T> {
  return decryptEnvelope<T>(envelope, context, { recipient: 'applicant', privateKey: personalPrivateKey });
}
