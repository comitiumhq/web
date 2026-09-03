import { randomBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import { decodeJsonPayload, PAYLOAD_COMPRESSION_NONE, type PayloadCompression } from './payload-compression';

/**
 * AES-GCM ciphertext + its random IV (base64). IV is a public nonce, not a secret.
 */
export interface EncryptedData {
  ct: string;
  iv: string;
}

export function aesGcmParams(iv: Uint8Array, aad?: Uint8Array): AesGcmParams {
  if (!aad) {
    return { name: 'AES-GCM', iv: iv as BufferSource };
  }

  return {
    name: 'AES-GCM',
    iv: iv as BufferSource,
    additionalData: aad as BufferSource,
  };
}

/**
 * AES-256-GCM encrypt JSON under a 32-byte DEK (fresh per-call IV). `aad` authenticated, not encrypted.
 */
export async function encryptData(data: unknown, dek: Uint8Array, aad?: Uint8Array): Promise<EncryptedData> {
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  return encryptPayloadBytes(plaintext, dek, aad);
}

export async function encryptPayloadBytes(
  plaintext: Uint8Array,
  dek: Uint8Array,
  aad?: Uint8Array,
): Promise<EncryptedData> {
  if (dek.length !== 32) {
    throw new Error('DEK must be 32 bytes');
  }

  const iv = randomBytes(12);
  const aesKey = await crypto.subtle.importKey('raw', dek as BufferSource, 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(aesGcmParams(iv, aad), aesKey, plaintext);

  return {
    ct: base64.encode(new Uint8Array(encrypted)),
    iv: base64.encode(iv),
  };
}

/**
 * AES-256-GCM encrypt raw bytes under a 32-byte DEK (fresh per-call IV). `aad` authenticated, not encrypted.
 */
export async function encryptBinaryData(
  data: Uint8Array,
  dek: Uint8Array,
  aad?: Uint8Array,
): Promise<{ ct: Uint8Array; iv: string }> {
  if (dek.length !== 32) {
    throw new Error('DEK must be 32 bytes');
  }

  const iv = randomBytes(12);
  const aesKey = await crypto.subtle.importKey('raw', dek as BufferSource, 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(aesGcmParams(iv, aad), aesKey, data as BufferSource);

  return {
    ct: new Uint8Array(encrypted),
    iv: base64.encode(iv),
  };
}

/**
 * AES-256-GCM decrypt raw bytes; wrong `iv`/`aad` throws (the tamper/wrong-key signal).
 */
export async function decryptBinaryData(
  ct: Uint8Array,
  iv: string,
  dek: Uint8Array,
  aad?: Uint8Array,
): Promise<Uint8Array> {
  if (dek.length !== 32) {
    throw new Error('DEK must be 32 bytes');
  }

  const aesKey = await crypto.subtle.importKey('raw', dek as BufferSource, 'AES-GCM', false, ['decrypt']);
  const ivBytes = base64.decode(iv);

  const plaintext = await crypto.subtle.decrypt(aesGcmParams(ivBytes, aad), aesKey, ct as BufferSource);

  return new Uint8Array(plaintext);
}

/**
 * AES-256-GCM decrypt + JSON-parse; wrong `iv`/`aad` throws. Result is unvalidated — schema-check it.
 */
export async function decryptData<T = unknown>(
  ct: string,
  iv: string,
  dek: Uint8Array,
  aad?: Uint8Array,
  zip: PayloadCompression = PAYLOAD_COMPRESSION_NONE,
): Promise<T> {
  if (dek.length !== 32) {
    throw new Error('DEK must be 32 bytes');
  }

  const aesKey = await crypto.subtle.importKey('raw', dek as BufferSource, 'AES-GCM', false, ['decrypt']);
  const ivBytes = base64.decode(iv);

  const plaintext = await crypto.subtle.decrypt(aesGcmParams(ivBytes, aad), aesKey, base64.decode(ct) as BufferSource);

  return decodeJsonPayload<T>(new Uint8Array(plaintext), zip);
}
