import { z } from 'zod';
import { HTTPS_URL_HOSTNAME_REGEX, HTTPS_URL_PROTOCOL_REGEX } from './patterns';

export const httpsUrlSchema = z.url({
  protocol: HTTPS_URL_PROTOCOL_REGEX,
  hostname: HTTPS_URL_HOSTNAME_REGEX,
  error: 'Enter a valid HTTPS URL',
});

export const currencyAnswerSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3).toUpperCase(),
});

export const scoreAnswerSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const uploadedFileValueSchema = z.object({
  fileRef: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string().min(1).max(255),
});

/**
 * Scalar value codecs shared by form fields and the encrypted background projector.
 */
export const connectorValueSchemas = {
  short_answer: z.string().min(1).max(500),
  long_unformatted: z.string().min(1).max(10_000),
  phone: z.string().min(3).max(40),
  email: z.email().max(254),
  url: httpsUrlSchema.max(2_048),
  yes_no: z.enum(['yes', 'no']),
  number: z.number(),
  date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid ISO 8601 date' }),
  currency: z.object({ amount: z.number(), currency: z.string().length(3).toUpperCase() }),
  location: z.object({
    cityId: z.number().int().positive(),
    city: z.string().min(1).max(120),
    region: z.string().min(1).max(120).optional(),
    country: z.string().length(2),
  }),
  file: uploadedFileValueSchema,
};
