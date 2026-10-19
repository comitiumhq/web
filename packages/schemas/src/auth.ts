import { base64BytesSchema, publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { type WrappedUserKey, wrappedUserKeySchema } from '@comitium/crypto/user-key';
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

export const userKeyShareSchema = z
  .object({
    keyShare: base64BytesSchema(32, 'Expected 32-byte key share encoded as base64'),
    version: z.literal(1),
  })
  .strict();

export type UserKeyShare = z.infer<typeof userKeyShareSchema>;

export const publicKeyMapSchema = z.record(z.string(), publicEncryptionKeySchema);
