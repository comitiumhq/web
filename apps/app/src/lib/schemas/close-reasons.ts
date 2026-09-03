import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

export const REASON_LABEL_MAX = 255;
const MAX_SORT_ORDER = 10000;

export const reasonLabelField = z
  .string()
  .trim()
  .min(1, 'Label is required')
  .max(REASON_LABEL_MAX, `Max ${REASON_LABEL_MAX} characters`);

const sortOrderField = z.number().int().min(0).max(MAX_SORT_ORDER);

export const closeReasonRowSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  label: z.string(),
  isArchived: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CloseReasonRow = z.infer<typeof closeReasonRowSchema>;

export const listCloseReasonsResponseSchema = z.object({
  data: z.array(closeReasonRowSchema),
});

const createCloseReasonBodySchema = z.object({
  label: reasonLabelField,
  sortOrder: sortOrderField.optional(),
});

export type CreateCloseReasonBody = z.infer<typeof createCloseReasonBodySchema>;

const updateCloseReasonBodySchema = z
  .object({
    label: reasonLabelField.optional(),
    sortOrder: sortOrderField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdateCloseReasonBody = z.infer<typeof updateCloseReasonBodySchema>;
