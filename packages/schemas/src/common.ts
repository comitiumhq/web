import { type WrappedKey, wrappedKeySchema } from '@comitium/crypto/envelope-key';
import { type EncryptedEnvelope, encryptedEnvelopeSchema } from '@comitium/crypto/schemas';
import { ALGORITHM_SUITE_VERSION } from '@comitium/crypto/version';
import type { JSONContent } from '@tiptap/core';
import { z } from 'zod';
import { HMAC_SHA256_HEX_REGEX } from './patterns';
import { walletAddressSchema } from './public';

const PUBLIC_HTTPS_HOSTNAME_REGEX =
  /^(?!localhost$)(?!.*\.localhost$)(?!127(?:\.\d{1,3}){3}$)(?!0\.0\.0\.0$)(?!\[::1\]$).+$/i;

export { ALGORITHM_SUITE_VERSION };
export { encryptedEnvelopeSchema };
export type { EncryptedEnvelope };

// --- Blind-index hash ---
// HMAC-SHA256 hex: 32 bytes = 64 hex chars. Used by candidate-tag labels and
// custom-field-value blind indexes. Case-insensitive (callers should normalize
// to lowercase before send, but the schema accepts mixed).

export const hmacSha256HexSchema = z
  .string()
  .regex(HMAC_SHA256_HEX_REGEX, 'Expected hex-encoded HMAC-SHA256 (64 chars)');

export const httpsUrlSchema = z.url({
  protocol: /^https$/,
  hostname: PUBLIC_HTTPS_HOSTNAME_REGEX,
  error: 'Enter a valid HTTPS URL',
});

// --- TipTap / JSON content ---
// TipTap docs are deeply nested recursive structures.
// We validate it's a non-null object; internal structure is TipTap's concern.

export type TipTapDoc = JSONContent;
export const tipTapDocSchema = z.record(z.string(), z.unknown()) as z.ZodType<TipTapDoc>;

// --- Display identity ---

const displayIdentitySchema = z.object({
  walletAddress: walletAddressSchema,
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export type DisplayIdentity = z.infer<typeof displayIdentitySchema>;

export { wrappedKeySchema };
export type { WrappedKey };
