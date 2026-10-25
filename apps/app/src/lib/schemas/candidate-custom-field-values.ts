import { encryptedEnvelopeSchema, hmacSha256HexSchema } from '@comitium/schemas/common';
import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import { fieldTypeSchema, selectableValueSchema } from './custom-fields';

const valueFieldMetaSchema = z.object({
  title: z.string(),
  fieldType: fieldTypeSchema,
  isPrivate: z.boolean(),
  isArchived: z.boolean(),
  selectableValues: z.array(selectableValueSchema).nullable(),
});

const customFieldValueRowSchema = z.object({
  id: uuidSchema,
  fieldId: uuidSchema,
  value: encryptedEnvelopeSchema,
  valueHash: z.string().nullable(),
  setBy: uuidSchema,
  setAt: z.string(),
  field: valueFieldMetaSchema,
});

export type CustomFieldValueRow = z.infer<typeof customFieldValueRowSchema>;

export const listCandidateCustomFieldValuesResponseSchema = z.object({
  data: z.array(customFieldValueRowSchema),
});

const batchCandidateCustomFieldValueItemSchema = z.object({
  fieldId: uuidSchema,
  encryptedValue: encryptedEnvelopeSchema.nullable(),
  valueHash: hmacSha256HexSchema.optional(),
});

export type BatchCandidateCustomFieldValueItem = z.infer<typeof batchCandidateCustomFieldValueItemSchema>;

const batchWriteCandidateCustomFieldValuesBodySchema = z.object({
  updates: z.array(batchCandidateCustomFieldValueItemSchema).min(1).max(100),
});

export type BatchWriteCandidateCustomFieldValuesBody = z.infer<typeof batchWriteCandidateCustomFieldValuesBodySchema>;

export const batchWriteCandidateCustomFieldValuesResponseSchema = z.object({
  success: z.literal(true),
});
