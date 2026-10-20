import { z } from 'zod';
import { aesGcmIvSchema, base64BytesSchema } from './encoding';
import { type PublicEncryptionKey, publicEncryptionKeySchema, wrappedKeySchema } from './keys';
import { storedKeyVersionSchema } from './user-key';

export const vaultKeyContextSchema = z
  .object({
    orgId: z.uuid(),
    vaultKeyVersion: storedKeyVersionSchema,
    recipientUserId: z.uuid(),
    recipientKeyVersion: storedKeyVersionSchema,
  })
  .strict();

export const searchKeyContextSchema = z.object({
  orgId: z.uuid(),
  searchKeyVersion: storedKeyVersionSchema,
  vaultKeyVersion: storedKeyVersionSchema,
});

export const wrappedSearchKeySchema = searchKeyContextSchema
  .extend({
    encryptedSearchKey: z
      .object({
        v: z.literal(1),
        ek: base64BytesSchema(48, 'Expected encrypted 32-byte search key'),
        iv: aesGcmIvSchema,
      })
      .strict(),
  })
  .strict();

export const vaultKeyAccessSchema = vaultKeyContextSchema
  .extend({
    vaultPublicKey: publicEncryptionKeySchema,
    wrappedVaultKey: wrappedKeySchema,
    searchKey: wrappedSearchKeySchema,
  })
  .refine((access) => {
    const matchesOrganization = access.orgId === access.searchKey.orgId;
    const matchesVaultVersion = access.vaultKeyVersion === access.searchKey.vaultKeyVersion;

    return matchesOrganization && matchesVaultVersion;
  }, 'Search and vault descriptors must belong to the same organization and vault generation');

export type VaultKeyContext = z.infer<typeof vaultKeyContextSchema>;
export type WrappedSearchKey = z.infer<typeof wrappedSearchKeySchema>;
export type VaultKeyAccess = z.infer<typeof vaultKeyAccessSchema>;
export type VaultKeyPair = { privateKey: Uint8Array; publicKey: PublicEncryptionKey };
export type SearchKeyContext = z.infer<typeof searchKeyContextSchema>;
