import { type WrappedKey, wrappedKeySchema } from '@comitium/crypto/envelope-key';
import { type EncryptedEnvelope, encryptedEnvelopeSchema } from '@comitium/crypto/schemas';
import { ALGORITHM_SUITE_VERSION } from '@comitium/crypto/version';
import type { JSONContent } from '@tiptap/core';
import { z } from 'zod';

export { ALGORITHM_SUITE_VERSION };

export { encryptedEnvelopeSchema };

export type { EncryptedEnvelope };

// --- Blind-index hash ---
// HMAC-SHA256 hex: 32 bytes = 64 hex chars. Used by candidate-tag labels and
// custom-field-value blind indexes. Case-insensitive (callers should normalize
// to lowercase before send, but the schema accepts mixed).

export { httpsUrlSchema } from '@comitium/crypto/form-values';
export { hmacSha256HexSchema } from '@comitium/crypto/schemas';

// --- TipTap / JSON content ---
// TipTap docs are deeply nested recursive structures.
// We validate it's a non-null object; internal structure is TipTap's concern.

export type TipTapDoc = JSONContent;
export const tipTapDocSchema = z.record(z.string(), z.unknown()) as z.ZodType<TipTapDoc>;

// --- Display identity ---

const displayIdentitySchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export type DisplayIdentity = z.infer<typeof displayIdentitySchema>;

export { wrappedKeySchema };

export type { WrappedKey };
