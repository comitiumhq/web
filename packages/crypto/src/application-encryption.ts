import type { CryptoContextInput } from './context';
import {
  decryptEnvelope,
  type EncryptedEnvelopeWithOverlays,
  encryptEnvelope,
  encryptEnvelopeWithOverlays,
} from './envelope';
import { orgVaultRecipient, type RecipientDescriptor } from './recipients';
import type { EncryptedEnvelope, PublicEncryptionKey } from './schemas';

export type { EncryptedEnvelope } from './schemas';

export async function encryptApplicationWithVaultKey(
  vaultPublicKey: PublicEncryptionKey,
  vaultKeyVersion: number,
  data: unknown,
  context: CryptoContextInput,
): Promise<EncryptedEnvelope> {
  return encryptEnvelope(data, context, [orgVaultRecipient(vaultPublicKey, vaultKeyVersion)]);
}

export async function encryptApplicationWithVaultKeyAndOverlays(
  vaultPublicKey: PublicEncryptionKey,
  vaultKeyVersion: number,
  data: unknown,
  context: CryptoContextInput,
  overlayRecipients: RecipientDescriptor[],
): Promise<EncryptedEnvelopeWithOverlays> {
  return encryptEnvelopeWithOverlays(
    data,
    context,
    [orgVaultRecipient(vaultPublicKey, vaultKeyVersion)],
    overlayRecipients,
  );
}

export async function decryptApplicationWithVaultKey<T = unknown>(
  envelope: EncryptedEnvelope,
  vaultPrivateKey: Uint8Array,
  context: CryptoContextInput,
): Promise<T> {
  return decryptEnvelope<T>(envelope, context, { recipient: 'org_vault', privateKey: vaultPrivateKey });
}
