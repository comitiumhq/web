import { base64 } from '@scure/base';
import { z } from 'zod';
import { SHA256_FINGERPRINT_REGEX } from '../patterns';

export const sha256FingerprintSchema = z.string().regex(SHA256_FINGERPRINT_REGEX);

export const base64StringSchema = z
  .string()
  .min(1)
  .refine((value) => decodeCanonicalBase64(value) !== null, 'Expected canonical base64');

export const aesGcmIvSchema = base64BytesSchema(12, 'Expected 12-byte AES-GCM IV encoded as base64');

export function base64BytesSchema(byteLength: number, message: string) {
  return base64StringSchema.refine((value) => {
    const decoded = decodeCanonicalBase64(value);

    if (decoded === null) {
      return false;
    }

    return decoded.length === byteLength;
  }, message);
}

function decodeCanonicalBase64(value: string): Uint8Array | null {
  try {
    const decoded = base64.decode(value);
    const encoded = base64.encode(decoded);

    if (encoded !== value) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
