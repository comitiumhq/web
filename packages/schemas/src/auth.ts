import { publicEncryptionKeySchema, type WrappedUserKey, wrappedUserKeySchema } from '@comitium/crypto/schemas';
import { z } from 'zod';

export { wrappedUserKeySchema };
export type { WrappedUserKey };

export const userSchema = z.object({
  id: z.string(),
  authUserId: z.string(),
  publicKey: publicEncryptionKeySchema.nullable(),
  encryptedUserKey: wrappedUserKeySchema.nullable(),
  userKeyVersion: z.number().int().positive().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const userPublicKeyDescriptorMapSchema = z.record(
  z.string(),
  z.object({ publicKey: publicEncryptionKeySchema, userKeyVersion: z.number().int().positive() }),
);
