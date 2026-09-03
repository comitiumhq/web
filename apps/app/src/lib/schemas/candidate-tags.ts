import { encryptedEnvelopeSchema, hmacSha256HexSchema } from '@comitium/schemas/common';
import { TAG_LABEL_REGEX } from '@comitium/schemas/patterns';
import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

// --- Plaintext label rules ---

export const TAG_LABEL_MAX = 40;
export const MAX_TAGS_PER_CANDIDATE = 20;

const TAG_LABEL_ERROR = 'Use letters, numbers, spaces, and - _ . only';

export const tagLabelFieldSchema = z
  .string()
  .trim()
  .min(1, 'Label is required')
  .max(TAG_LABEL_MAX, `Max ${TAG_LABEL_MAX} characters`)
  .regex(TAG_LABEL_REGEX, TAG_LABEL_ERROR);

// --- API response: encrypted tag row ---

const candidateTagSchema = z.object({
  id: uuidSchema,
  label: encryptedEnvelopeSchema,
  labelHash: hmacSha256HexSchema,
  isArchived: z.boolean(),
  createdBy: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CandidateTag = z.infer<typeof candidateTagSchema>;

export const candidateTagsListSchema = z.object({
  data: z.array(candidateTagSchema),
});

export const candidateTagResponseSchema = z.object({
  data: candidateTagSchema,
});

// --- Request bodies ---

const createCandidateTagBodySchema = z.object({
  label: encryptedEnvelopeSchema,
  labelHash: hmacSha256HexSchema,
});

export type CreateCandidateTagBody = z.infer<typeof createCandidateTagBodySchema>;

export type UpdateCandidateTagBody = CreateCandidateTagBody;

const assignTagBodySchema = z.object({
  tagId: uuidSchema,
});

export type AssignTagBody = z.infer<typeof assignTagBodySchema>;

// --- Decrypted view used throughout the UI ---

export const decryptedTagPayloadSchema = z.object({ label: z.string() });

export type DecryptedCandidateTag = Omit<CandidateTag, 'label'> & {
  label: string;
};
