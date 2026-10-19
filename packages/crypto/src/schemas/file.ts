import { z } from 'zod';
import { cryptoPurposeSchema } from './context';
import { aesGcmIvSchema } from './encoding';
import { envelopeKeySchema } from './envelope';
import { algorithmSuiteVersionSchema } from './keys';

export const encryptedFileMetadataSchema = z
  .object({
    v: algorithmSuiteVersionSchema,
    purpose: cryptoPurposeSchema,
    iv: aesGcmIvSchema,
    keys: z.array(envelopeKeySchema).min(1),
    originalSize: z.number().int().min(0),
  })
  .strict();

export type EncryptedFileMetadata = z.infer<typeof encryptedFileMetadataSchema>;
