import { randomBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';

import { aesGcmParams } from './data-encryption';
import type { PublicEncryptionKey } from './schemas';
import { ALGORITHM_SUITE_VERSION } from './version';
import { decapsulateXWing, deriveXWingKeyEncryptionKey, encapsulateXWing } from './xwing';

export type WrappedKeyMaterial = {
  v: typeof ALGORITHM_SUITE_VERSION;
  ek: string;
  epk: string;
  kemCt: string;
  iv: string;
};

/**
 * Shared X-Wing + AES-GCM primitive for wrapping private keys and per-envelope DEKs.
 * Public callers own material-specific validation and version checks.
 */
export async function wrapKeyMaterial(
  keyMaterial: Uint8Array,
  recipientPublicKey: PublicEncryptionKey,
  aad?: Uint8Array,
): Promise<WrappedKeyMaterial> {
  const encapsulated = encapsulateXWing(recipientPublicKey);

  try {
    const aesKey = await deriveXWingKeyEncryptionKey({
      sharedSecret: encapsulated.sharedSecret,
      ciphertext: encapsulated.ciphertext,
      recipientPublicKeyBytes: encapsulated.recipientPublicKeyBytes,
      aad,
      usages: ['encrypt'],
    });
    const iv = randomBytes(12);
    const encrypted = await crypto.subtle.encrypt(aesGcmParams(iv, aad), aesKey, keyMaterial as BufferSource);

    return {
      v: ALGORITHM_SUITE_VERSION,
      ek: base64.encode(new Uint8Array(encrypted)),
      epk: encapsulated.ciphertext.epk,
      kemCt: encapsulated.ciphertext.kemCt,
      iv: base64.encode(iv),
    };
  } finally {
    encapsulated.sharedSecret.fill(0);
  }
}

export async function unwrapKeyMaterial(
  wrappedKey: WrappedKeyMaterial,
  privateKey: Uint8Array,
  aad?: Uint8Array,
): Promise<Uint8Array> {
  const decapsulated = decapsulateXWing({ kemCt: wrappedKey.kemCt, epk: wrappedKey.epk }, privateKey);

  try {
    const aesKey = await deriveXWingKeyEncryptionKey({
      sharedSecret: decapsulated.sharedSecret,
      ciphertext: { kemCt: wrappedKey.kemCt, epk: wrappedKey.epk },
      recipientPublicKeyBytes: decapsulated.recipientPublicKeyBytes,
      aad,
      usages: ['decrypt'],
    });
    const iv = base64.decode(wrappedKey.iv);
    const decrypted = await crypto.subtle.decrypt(
      aesGcmParams(iv, aad),
      aesKey,
      base64.decode(wrappedKey.ek) as BufferSource,
    );

    return new Uint8Array(decrypted);
  } finally {
    decapsulated.sharedSecret.fill(0);
  }
}
