import { z } from 'zod';
import { aesGcmIvSchema, base64BytesSchema, base64StringSchema } from './encoding';

export const PASSWORD_KDF_PROFILE = { alg: 'argon2id', m: 65536, t: 3, p: 4 } as const;

export const storedKeyVersionSchema = z.number().int().min(1).max(32767);
const encryptedUnlockKeySchema = base64BytesSchema(48, 'Expected encrypted 32-byte unlock key');

export const passwordWrapSchema = z
  .object({
    method: z.literal('password'),
    id: z.uuidv7(),
    kdf: z
      .object({
        alg: z.literal(PASSWORD_KDF_PROFILE.alg),
        m: z.literal(PASSWORD_KDF_PROFILE.m),
        t: z.literal(PASSWORD_KDF_PROFILE.t),
        p: z.literal(PASSWORD_KDF_PROFILE.p),
        salt: base64BytesSchema(16, 'Expected 16-byte Argon2 salt'),
      })
      .strict(),
    ek: encryptedUnlockKeySchema,
    iv: aesGcmIvSchema,
  })
  .strict();

export const recoveryWrapSchema = z
  .object({
    method: z.literal('recovery_code'),
    id: z.uuidv7(),
    kdf: z
      .object({
        alg: z.literal('hkdf-sha256'),
        salt: base64BytesSchema(32, 'Expected 32-byte recovery salt'),
      })
      .strict(),
    ek: encryptedUnlockKeySchema,
    iv: aesGcmIvSchema,
  })
  .strict();

export const unlockKeyWrapsSchema = z
  .array(z.discriminatedUnion('method', [passwordWrapSchema, recoveryWrapSchema]))
  .min(1)
  .max(2)
  .refine((wraps) => {
    const passwordWraps = wraps.filter((wrap) => wrap.method === 'password');
    const wrapIds = wraps.map((wrap) => wrap.id);
    const hasSinglePasswordWrap = passwordWraps.length === 1;
    const hasUniqueIds = new Set(wrapIds).size === wrapIds.length;

    return hasSinglePasswordWrap && hasUniqueIds;
  }, 'Expected one password wrapper and at most one recovery-code wrapper with distinct IDs');

export const wrappedUserKeySchema = z
  .object({
    v: z.literal(1),
    keyVersion: storedKeyVersionSchema,
    pk: z.object({ ek: base64StringSchema, iv: aesGcmIvSchema }).strict(),
    wraps: unlockKeyWrapsSchema,
  })
  .strict();

export type PasswordWrap = z.infer<typeof passwordWrapSchema>;
export type RecoveryWrap = z.infer<typeof recoveryWrapSchema>;
export type UnlockKeyWrap = PasswordWrap | RecoveryWrap;
export type WrappedUserKey = z.infer<typeof wrappedUserKeySchema>;
export const userKeyContextSchema = z.object({ userId: z.uuid(), keyVersion: storedKeyVersionSchema });
export type UserKeyContext = z.infer<typeof userKeyContextSchema>;
export type UnlockedUserKey = { userPrivateKey: Uint8Array; unlockKey: Uint8Array };
