import { archiveReasonTypeSchema } from '@comitium/schemas/archive-reason-type';
import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

export { type ArchiveReasonType, archiveReasonTypeSchema } from '@comitium/schemas/archive-reason-type';

export const archiveReasonOutcomeSchema = z.enum(['employer_rejected', 'candidate_withdrew', 'candidate_unresponsive']);

export type ArchiveReasonOutcome = z.infer<typeof archiveReasonOutcomeSchema>;

export const REASON_LABEL_MAX = 255;
const MAX_SORT_ORDER = 10000;

export const reasonLabelField = z
  .string()
  .trim()
  .min(1, 'Label is required')
  .max(REASON_LABEL_MAX, `Max ${REASON_LABEL_MAX} characters`);

const sortOrderField = z.number().int().min(0).max(MAX_SORT_ORDER);

export const archiveReasonRowSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  label: z.string(),
  reasonType: archiveReasonTypeSchema,
  outcome: archiveReasonOutcomeSchema,
  isArchived: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ArchiveReasonRow = z.infer<typeof archiveReasonRowSchema>;

export const listArchiveReasonsResponseSchema = z.object({
  data: z.array(archiveReasonRowSchema),
});

const createArchiveReasonBodySchema = z.object({
  label: reasonLabelField,
  reasonType: archiveReasonTypeSchema,
  outcome: archiveReasonOutcomeSchema,
  sortOrder: sortOrderField.optional(),
});

export type CreateArchiveReasonBody = z.infer<typeof createArchiveReasonBodySchema>;

const updateArchiveReasonBodySchema = z
  .object({
    label: reasonLabelField.optional(),
    sortOrder: sortOrderField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdateArchiveReasonBody = z.infer<typeof updateArchiveReasonBodySchema>;
