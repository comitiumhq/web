import { z } from 'zod';
import type { CryptoSessionIdentity } from '../session';
import { aesGcmIvSchema, base64StringSchema, sha256FingerprintSchema } from './encoding';
import { type PublicEncryptionKey, publicEncryptionKeySchema } from './keys';

export const rememberedDeviceRecordSchema = z
  .object({
    v: z.literal(1),
    userId: z.uuid(),
    keyVersion: z.number().int().positive(),
    encryptedKeyFingerprint: sha256FingerprintSchema,
    userPublicKey: publicEncryptionKeySchema,
    deviceId: z.uuidv7(),
    localDeviceKey: z.custom<CryptoKey>(
      (value) =>
        isCryptoKey(value) &&
        value.type === 'secret' &&
        !value.extractable &&
        value.algorithm.name === 'AES-GCM' &&
        value.usages.includes('encrypt') &&
        value.usages.includes('decrypt'),
    ),
    iv: aesGcmIvSchema,
    ct: base64StringSchema,
  })
  .strict();

export const rememberedDeviceCiphertextSchema = z.object({ ct: base64StringSchema, iv: aesGcmIvSchema }).strict();

export type RememberedDeviceRecord = z.infer<typeof rememberedDeviceRecordSchema>;
export type RememberedDeviceContext = { identity: CryptoSessionIdentity; userPublicKey: PublicEncryptionKey };
export type DeviceBinding = Omit<RememberedDeviceRecord, 'localDeviceKey' | 'iv' | 'ct'>;

function isCryptoKey(value: unknown): value is CryptoKey {
  const cryptoKeyConstructor = globalThis.CryptoKey;

  return cryptoKeyConstructor !== undefined && value instanceof cryptoKeyConstructor;
}
