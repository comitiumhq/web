import { z } from 'zod';
import { base64BytesSchema, sha256FingerprintSchema } from './encoding';
import { publicEncryptionKeySchema } from './keys';
import { type WrappedUserKey, wrappedUserKeySchema } from './user-key';

export const keyShareResponseSchema = z.object({
  userId: z.uuid(),
  keyShare: base64BytesSchema(32, 'Expected 32-byte key share'),
  version: z.literal(1),
  keyVersion: z.number().int().positive().nullable(),
  wrapsFingerprint: sha256FingerprintSchema.nullable(),
});

export const keyBundleResponseSchema = z.object({
  id: z.uuid(),
  publicKey: publicEncryptionKeySchema,
  encryptedUserKey: wrappedUserKeySchema,
  userKeyVersion: z.number().int().positive(),
});

export const deviceIdSchema = z.uuidv7();

export const deviceResponseSchema = z.object({
  deviceId: deviceIdSchema,
  serverDeviceKey: base64BytesSchema(32, 'Expected 32-byte device key'),
});

const unlockApiErrorCodeSchema = z.enum(['API_ERROR', 'KEY_SHARE_UNAVAILABLE', 'FRESH_AUTHENTICATION_REQUIRED']);
export const unlockApiErrorResponseSchema = z.object({ error: z.object({ code: unlockApiErrorCodeSchema }) });
export const serializedUnlockApiErrorSchema = z.object({
  kind: z.literal('comitium.unlock-api-error'),
  status: z.number().int().min(400).max(599),
  code: unlockApiErrorCodeSchema,
});

export const successSchema = z.object({ success: z.literal(true) });
export type KeyShareResponse = z.infer<typeof keyShareResponseSchema>;
export type KeyBundleResponse = z.infer<typeof keyBundleResponseSchema>;

export type KeyBundleWrite = {
  publicKey: KeyBundleResponse['publicKey'];
  encryptedUserKey: WrappedUserKey;
  keyAuthSecret: string;
};

export type CurrentKeyProof = { keyVersion: number; prevWrapsFingerprint: string; keyAuthSecret: string };
export type DeviceEnrollment = CurrentKeyProof & { previousDeviceId?: string };
export type RecoveryCodeHandler = (recoveryCode: string) => Promise<void>;
export type FreshAuthenticationHandler = (force?: boolean) => Promise<void>;
export type RememberedDeviceStatus = 'not_requested' | 'remembered' | 'unavailable' | 'cleanup_failed';
export type UnlockResult = { rememberedDevice: RememberedDeviceStatus };
export type RewrapOptions = { password?: string; rotateRecoveryCode: boolean; repairShare: boolean };

export interface RememberedDeviceRewrapOptions extends RewrapOptions {
  password: string;
}

export type UserKeyIdentity = { wrapped: WrappedUserKey; userId: string; publicKey: KeyBundleResponse['publicKey'] };
export type UnlockApiErrorCode = z.infer<typeof unlockApiErrorCodeSchema>;
