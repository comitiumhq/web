import { keyVersionSchema, publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { z } from 'zod';
import { wrappedKeySchema } from './common';

export const vaultKeySchema = z.object({
  vaultPublicKey: publicEncryptionKeySchema,
  keyVersion: keyVersionSchema,
});

export type VaultKeyResponse = z.infer<typeof vaultKeySchema>;

export const wrappedVaultKeyResponseSchema = z.object({
  encryptedVaultKey: wrappedKeySchema,
  keyVersion: keyVersionSchema,
});
