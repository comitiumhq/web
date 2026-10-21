import { z } from 'zod';
import { X25519_PUBLIC_KEY_HEX_REGEX } from '../patterns';
import { ALGORITHM_SUITE_VERSION } from '../version';
import { aesGcmIvSchema, base64BytesSchema, base64StringSchema } from './encoding';

export const XWING_PUBLIC_KEY_BYTES = 1216;
export const XWING_SECRET_KEY_BYTES = 32;
export const XWING_CIPHERTEXT_BYTES = 1120;
export const XWING_MLKEM_CIPHERTEXT_BYTES = 1088;
export const XWING_X25519_CIPHERTEXT_BYTES = 32;
export const XWING_SHARED_SECRET_BYTES = 32;

export const algorithmSuiteVersionSchema = z.literal(ALGORITHM_SUITE_VERSION);

export const xWingX25519CiphertextSchema = z
  .string()
  .regex(X25519_PUBLIC_KEY_HEX_REGEX, 'Expected 32-byte X-Wing X25519 ciphertext part encoded as hex');

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
export type PublicEncryptionKey = z.infer<typeof publicEncryptionKeySchema>;
export type PrivateEncryptionKey = z.infer<typeof privateEncryptionKeySchema>;
