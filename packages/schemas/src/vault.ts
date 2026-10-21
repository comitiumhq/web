import { keyVersionSchema, publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { z } from 'zod';

export { vaultKeyAccessSchema } from '@comitium/crypto/schemas';

export const vaultKeySchema = z.object({
  vaultPublicKey: publicEncryptionKeySchema,
  keyVersion: keyVersionSchema,
});

export type VaultKeyResponse = z.infer<typeof vaultKeySchema>;
