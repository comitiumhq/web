import { base64 } from '@scure/base';
import { z } from 'zod';

import { cryptoPurposeSchema } from './context';
import { getRecipientPolicyViolation } from './recipient-policy';
import { envelopeRecipientSchema } from './recipients';
import { ALGORITHM_SUITE_VERSION } from './version';

const X25519_PUBLIC_KEY_HEX_REGEX = /^[a-fA-F0-9]{64}$/;

export const XWING_PUBLIC_KEY_BYTES = 1216;
export const XWING_SECRET_KEY_BYTES = 32;
export const XWING_CIPHERTEXT_BYTES = 1120;
export const XWING_MLKEM_CIPHERTEXT_BYTES = 1088;
export const XWING_X25519_CIPHERTEXT_BYTES = 32;
export const XWING_SHARED_SECRET_BYTES = 32;

export const algorithmSuiteVersionSchema = z.literal(ALGORITHM_SUITE_VERSION);
const payloadCompressionSchema = z.enum(['none', 'gzip']);

// `epk` stores X-Wing's X25519 ciphertext half, not a standalone fallback public key.
export const xWingX25519CiphertextSchema = z
  .string()
  .regex(X25519_PUBLIC_KEY_HEX_REGEX, 'Expected 32-byte X-Wing X25519 ciphertext part encoded as hex');

export const base64StringSchema = z
  .string()
  .min(1)
  .refine((value) => decodeCanonicalBase64(value) !== null, 'Expected canonical base64');

export const aesGcmIvSchema = base64BytesSchema(12, 'Expected 12-byte AES-GCM IV encoded as base64');

const xWingPublicKeySchema = base64BytesSchema(
  XWING_PUBLIC_KEY_BYTES,
  'Expected 1216-byte X-Wing public key encoded as base64',
);

const xWingPrivateKeySchema = base64BytesSchema(
  XWING_SECRET_KEY_BYTES,
  'Expected 32-byte X-Wing secret key encoded as base64',
);

export const xWingMlKemCiphertextSchema = base64BytesSchema(
  XWING_MLKEM_CIPHERTEXT_BYTES,
  'Expected 1088-byte ML-KEM ciphertext encoded as base64',
);

export const publicEncryptionKeySchema = z
  .object({
    v: algorithmSuiteVersionSchema,
    xwing: xWingPublicKeySchema,
  })
  .strict();

export const privateEncryptionKeySchema = z
  .object({
    v: algorithmSuiteVersionSchema,
    xwing: xWingPrivateKeySchema,
  })
  .strict();

export const keyVersionSchema = z.number().int().min(1);

export const envelopeKeySchema = z
  .object({
    recipient: envelopeRecipientSchema,
    rkv: keyVersionSchema,
    ek: base64StringSchema,
    epk: xWingX25519CiphertextSchema,
    kemCt: xWingMlKemCiphertextSchema,
    iv: aesGcmIvSchema,
  })
  .strict();

export const encryptedEnvelopeSchema = z
  .object({
    v: algorithmSuiteVersionSchema,
    purpose: cryptoPurposeSchema,
    zip: payloadCompressionSchema,
    ct: base64StringSchema,
    iv: aesGcmIvSchema,
    keys: z.array(envelopeKeySchema).min(1),
  })
  .strict()
  .superRefine((envelope, ctx) => {
    const violation = getRecipientPolicyViolation(
      envelope.purpose,
      envelope.keys.map((key) => key.recipient),
    );

    if (violation !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: violation,
        path: ['keys'],
      });
    }
  });

export type EnvelopeKey = z.infer<typeof envelopeKeySchema>;
export type EncryptedEnvelope = z.infer<typeof encryptedEnvelopeSchema>;
export type PublicEncryptionKey = z.infer<typeof publicEncryptionKeySchema>;
export type PrivateEncryptionKey = z.infer<typeof privateEncryptionKeySchema>;

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return encryptedEnvelopeSchema.safeParse(value).success;
}

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
