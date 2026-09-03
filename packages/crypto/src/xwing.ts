import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { ml_kem768_x25519 } from '@noble/post-quantum/hybrid.js';
import { base64 } from '@scure/base';

import {
  type PrivateEncryptionKey,
  type PublicEncryptionKey,
  privateEncryptionKeySchema,
  publicEncryptionKeySchema,
  XWING_CIPHERTEXT_BYTES,
  XWING_MLKEM_CIPHERTEXT_BYTES,
  XWING_SECRET_KEY_BYTES,
  XWING_SHARED_SECRET_BYTES,
  XWING_X25519_CIPHERTEXT_BYTES,
} from './schemas';
import { ALGORITHM_SUITE_VERSION } from './version';

const KEY_WRAP_TRANSCRIPT_SUITE = 'comitium-envelope-v1';
const HKDF_KEY_BYTES = 32;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * X-Wing ciphertext split into ML-KEM (`kemCt`) + X25519 (`epk`) parts; split is presentation only.
 */
export type XWingCiphertextParts = {
  kemCt: string;
  epk: string;
};

export function generateXWingKeyPair(): { privateKey: Uint8Array; publicKey: PublicEncryptionKey } {
  const keyPair = ml_kem768_x25519.keygen();

  return {
    privateKey: new Uint8Array(keyPair.secretKey),
    publicKey: publicEncryptionKeySchema.parse({
      v: ALGORITHM_SUITE_VERSION,
      xwing: base64.encode(new Uint8Array(keyPair.publicKey)),
    }),
  };
}

/**
 * Serialize private key as a versioned `PrivateEncryptionKey` bundle so an unsupported suite fails closed on deserialize.
 */
export function serializePrivateEncryptionKey(privateKey: Uint8Array): Uint8Array {
  assertXWingSecretKeyBytes(privateKey);

  const bundle: PrivateEncryptionKey = privateEncryptionKeySchema.parse({
    v: ALGORITHM_SUITE_VERSION,
    xwing: base64.encode(privateKey),
  });

  return textEncoder.encode(JSON.stringify(bundle));
}

export function deserializePrivateEncryptionKey(serialized: Uint8Array): Uint8Array {
  const bundle = privateEncryptionKeySchema.parse(JSON.parse(textDecoder.decode(serialized)));

  return privateEncryptionKeyToBytes(bundle);
}

export function serializePublicEncryptionKey(publicKey: PublicEncryptionKey): string {
  const parsed = publicEncryptionKeySchema.parse(publicKey);

  return JSON.stringify({ v: parsed.v, xwing: parsed.xwing });
}

export function isSamePublicEncryptionKey(left: PublicEncryptionKey, right: PublicEncryptionKey): boolean {
  return left.v === right.v && left.xwing === right.xwing;
}

/**
 * Encapsulate to an X-Wing public key (X25519+ML-KEM-768). @noble combiner is
 * authoritative — don't reimplement; `epk` is not a standalone X25519 key.
 */
export function encapsulateXWing(publicKey: PublicEncryptionKey): {
  sharedSecret: Uint8Array;
  ciphertext: XWingCiphertextParts;
  recipientPublicKeyBytes: Uint8Array;
} {
  const recipientPublicKeyBytes = publicEncryptionKeyToBytes(publicKey);
  const result = ml_kem768_x25519.encapsulate(recipientPublicKeyBytes);
  const cipherText = new Uint8Array(result.cipherText);

  if (cipherText.length !== XWING_CIPHERTEXT_BYTES) {
    throw new Error(`X-Wing ciphertext must be ${XWING_CIPHERTEXT_BYTES} bytes`);
  }

  const sharedSecret = new Uint8Array(result.sharedSecret);
  assertXWingSharedSecretBytes(sharedSecret);

  return {
    sharedSecret,
    // X-Wing returns kemCt || epk; envelopes keep them split for explicit validation.
    ciphertext: {
      kemCt: base64.encode(cipherText.slice(0, XWING_MLKEM_CIPHERTEXT_BYTES)),
      epk: bytesToHex(cipherText.slice(XWING_MLKEM_CIPHERTEXT_BYTES)),
    },
    recipientPublicKeyBytes,
  };
}

/**
 * Rebuild the X-Wing ciphertext (`kemCt || epk`) and decapsulate.
 * Parts must be re-joined exactly — never decapsulated independently.
 */
export function decapsulateXWing(
  ciphertext: XWingCiphertextParts,
  privateKey: Uint8Array,
): { sharedSecret: Uint8Array; recipientPublicKeyBytes: Uint8Array } {
  assertXWingSecretKeyBytes(privateKey);

  const kemCt = base64.decode(ciphertext.kemCt);
  const epk = hexToBytes(ciphertext.epk);

  if (kemCt.length !== XWING_MLKEM_CIPHERTEXT_BYTES) {
    throw new Error(`X-Wing ML-KEM ciphertext must be ${XWING_MLKEM_CIPHERTEXT_BYTES} bytes`);
  }

  if (epk.length !== XWING_X25519_CIPHERTEXT_BYTES) {
    throw new Error(`X-Wing X25519 ciphertext must be ${XWING_X25519_CIPHERTEXT_BYTES} bytes`);
  }

  const sharedSecret = new Uint8Array(ml_kem768_x25519.decapsulate(concatBytes(kemCt, epk), privateKey));
  assertXWingSharedSecretBytes(sharedSecret);

  return {
    sharedSecret,
    recipientPublicKeyBytes: new Uint8Array(ml_kem768_x25519.getPublicKey(privateKey)),
  };
}

/**
 * Derive the AES-GCM key-wrap key from the X-Wing shared secret (HKDF-SHA256).
 * Transcript as HKDF `info` binds the wrap to one recipient/context; empty salt is intentional.
 */
export async function deriveXWingKeyEncryptionKey(params: {
  sharedSecret: Uint8Array;
  ciphertext: XWingCiphertextParts;
  recipientPublicKeyBytes: Uint8Array;
  aad?: Uint8Array;
  usages: KeyUsage[];
}): Promise<CryptoKey> {
  assertXWingSharedSecretBytes(params.sharedSecret);

  const keyMaterial = hkdf(
    sha256,
    params.sharedSecret,
    new Uint8Array(0),
    keyWrapTranscript(params.ciphertext, params.recipientPublicKeyBytes, params.aad),
    HKDF_KEY_BYTES,
  );

  try {
    return await crypto.subtle.importKey('raw', keyMaterial as BufferSource, 'AES-GCM', false, params.usages);
  } finally {
    keyMaterial.fill(0);
  }
}

function publicEncryptionKeyToBytes(publicKey: PublicEncryptionKey): Uint8Array {
  return base64.decode(publicEncryptionKeySchema.parse(publicKey).xwing);
}

function privateEncryptionKeyToBytes(privateKey: PrivateEncryptionKey): Uint8Array {
  return base64.decode(privateEncryptionKeySchema.parse(privateKey).xwing);
}

/**
 * HKDF transcript: suite label, AAD, ciphertext parts, recipient fingerprint.
 * Wire-frozen — changing the field set or order orphans every stored envelope and the API twin.
 */
function keyWrapTranscript(
  ciphertext: XWingCiphertextParts,
  recipientPublicKeyBytes: Uint8Array,
  aad?: Uint8Array,
): Uint8Array {
  return textEncoder.encode(
    JSON.stringify({
      suite: KEY_WRAP_TRANSCRIPT_SUITE,
      aad: aad ? base64.encode(aad) : null,
      kemCt: ciphertext.kemCt,
      epk: ciphertext.epk,
      recipientPublicKeyFingerprint: bytesToHex(sha256(recipientPublicKeyBytes)),
    }),
  );
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.length + right.length);

  result.set(left);
  result.set(right, left.length);

  return result;
}

function assertXWingSecretKeyBytes(privateKey: Uint8Array): void {
  if (privateKey.length !== XWING_SECRET_KEY_BYTES) {
    throw new Error(`X-Wing secret key must be ${XWING_SECRET_KEY_BYTES} bytes`);
  }
}

function assertXWingSharedSecretBytes(sharedSecret: Uint8Array): void {
  if (sharedSecret.length !== XWING_SHARED_SECRET_BYTES) {
    throw new Error(`X-Wing shared secret must be ${XWING_SHARED_SECRET_BYTES} bytes`);
  }
}
