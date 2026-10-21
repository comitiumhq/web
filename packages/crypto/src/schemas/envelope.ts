import { z } from 'zod';
import { getRecipientPolicyViolation } from '../recipient-policy';
import { cryptoPurposeSchema } from './context';
import { aesGcmIvSchema, base64StringSchema } from './encoding';
import { algorithmSuiteVersionSchema, xWingMlKemCiphertextSchema, xWingX25519CiphertextSchema } from './keys';
import { envelopeRecipientSchema } from './recipients';

const payloadCompressionSchema = z.enum(['none', 'gzip']);

export const keyVersionSchema = z.number().int().min(1);

export const envelopeKeySchema = z
  .object({
    recipient: envelopeRecipientSchema,
    rkv: keyVersionSchema,
    ek: base64StringSchema,
    epk: xWingX25519CiphertextSchema,
    kemCt: xWingMlKemCiphertextSchema,
    iv: aesGcmIvSchema,
  })
  .strict();

export const encryptedEnvelopeSchema = z
  .object({
    v: algorithmSuiteVersionSchema,
    purpose: cryptoPurposeSchema,
    zip: payloadCompressionSchema,
    ct: base64StringSchema,
    iv: aesGcmIvSchema,
    keys: z.array(envelopeKeySchema).min(1),
  })
  .strict()
  .superRefine((envelope, ctx) => {
    const violation = getRecipientPolicyViolation(
      envelope.purpose,
      envelope.keys.map((key) => key.recipient),
    );

    if (violation !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: violation,
        path: ['keys'],
      });
    }
  });

export type EnvelopeKey = z.infer<typeof envelopeKeySchema>;

export type EncryptedEnvelope = z.infer<typeof encryptedEnvelopeSchema>;

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return encryptedEnvelopeSchema.safeParse(value).success;
}
