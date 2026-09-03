import { z } from 'zod';
import { type CryptoContextInput, keyWrapAad } from './context';
import { unwrapKeyMaterial, wrapKeyMaterial } from './key-wrapping';
import type { RecipientDescriptor } from './recipients';
import {
  aesGcmIvSchema,
  base64StringSchema,
  type EnvelopeKey,
  envelopeKeySchema,
  type PublicEncryptionKey,
  xWingMlKemCiphertextSchema,
  xWingX25519CiphertextSchema,
} from './schemas';
import { ALGORITHM_SUITE_VERSION, assertSupportedAlgorithmSuiteVersion } from './version';

export const wrappedKeySchema = z
  .object({
    v: z.literal(ALGORITHM_SUITE_VERSION),
    ek: base64StringSchema,
    epk: xWingX25519CiphertextSchema,
    kemCt: xWingMlKemCiphertextSchema,
    iv: aesGcmIvSchema,
  })
  .strict();

export type WrappedKey = z.infer<typeof wrappedKeySchema>;

/**
 * Wrap a 32-byte DEK to a recipient public key.
 * `aad` binds the wrap to a crypto context — a wrapped key can't be relocated elsewhere.
 */
export async function wrapDek(
  dek: Uint8Array,
  recipientPublicKey: PublicEncryptionKey,
  aad?: Uint8Array,
): Promise<WrappedKey> {
  if (dek.length !== 32) {
    throw new Error('DEK must be 32 bytes');
  }

  return wrapKeyMaterial(dek, recipientPublicKey, aad);
}

/**
 * Unwrap a DEK with a recipient private key; fails closed on unsupported suite, zeroizes on length mismatch.
 */
export async function unwrapDek(wrappedKey: WrappedKey, privateKey: Uint8Array, aad?: Uint8Array): Promise<Uint8Array> {
  assertSupportedAlgorithmSuiteVersion(wrappedKey.v);

  if (privateKey.length !== 32) {
    throw new Error('Private key must be 32 bytes');
  }

  const dek = await unwrapKeyMaterial(wrappedKey, privateKey, aad);

  if (dek.length !== 32) {
    dek.fill(0);
    throw new Error('DEK must be 32 bytes');
  }

  return dek;
}

/**
 * Wrap a DEK to one recipient → validated `EnvelopeKey`. AAD binds it to
 * context+recipient, so a copied wrap fails auth. Shared by envelopes and blobs.
 */
export async function wrapRecipientKey(
  dek: Uint8Array,
  context: CryptoContextInput,
  recipient: RecipientDescriptor,
): Promise<EnvelopeKey> {
  const wrapped = await wrapDek(dek, recipient.publicKey, keyWrapAad(context, recipient.recipient));

  return envelopeKeySchema.parse({
    recipient: recipient.recipient,
    rkv: recipient.keyVersion,
    ek: wrapped.ek,
    epk: wrapped.epk,
    kemCt: wrapped.kemCt,
    iv: wrapped.iv,
  });
}

/**
 * Drop the recipient label to recover the standalone `WrappedKey` for `unwrapDek`.
 */
export function envelopeKeyToWrappedKey(key: EnvelopeKey): WrappedKey {
  return { v: ALGORITHM_SUITE_VERSION, ek: key.ek, epk: key.epk, kemCt: key.kemCt, iv: key.iv };
}
