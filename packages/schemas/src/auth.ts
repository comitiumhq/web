import {
  type WalletSignaturePersonalKeyWrapper,
  type WrappedPersonalKey,
  wrappedPersonalKeySchema,
} from '@comitium/crypto/personal-key';
import { base64BytesSchema, publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { z } from 'zod';
import { walletAddressSchema } from './public';

// --- User ---

export { wrappedPersonalKeySchema };
export type { WalletSignaturePersonalKeyWrapper, WrappedPersonalKey };

export const userSchema = z.object({
  id: z.string(),
  walletAddress: walletAddressSchema,
  publicKey: publicEncryptionKeySchema.nullable(),
  encryptedPersonalKey: wrappedPersonalKeySchema.nullable(),
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

// --- Public keys ---

export const publicKeyMapSchema = z.record(z.string(), publicEncryptionKeySchema);
