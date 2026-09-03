import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

// --- Enums ---

export const reasonCategorySchema = z.enum(['candidate', 'interviewer', 'company']);
export const reasonAppliesToSchema = z.enum(['cancel', 'reschedule', 'both']);
const reasonPolicySchema = z.enum(['off', 'optional', 'required']);

export type ReasonCategory = z.infer<typeof reasonCategorySchema>;
export type ReasonAppliesTo = z.infer<typeof reasonAppliesToSchema>;
export type ReasonPolicy = z.infer<typeof reasonPolicySchema>;

// --- Field constraints ---

export const REASON_LABEL_MAX = 255;
export const REASON_DESCRIPTION_MAX = 1000;
const MAX_SORT_ORDER = 10000;

export const reasonLabelField = z
  .string()
  .trim()
  .min(1, 'Label is required')
  .max(REASON_LABEL_MAX, `Max ${REASON_LABEL_MAX} characters`);

export const reasonDescriptionField = z
  .string()
  .trim()
  .max(REASON_DESCRIPTION_MAX, `Max ${REASON_DESCRIPTION_MAX} characters`);

const sortOrderField = z.number().int().min(0).max(MAX_SORT_ORDER);

// --- Server response shapes ---

export const reasonRowSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  category: reasonCategorySchema,
  label: z.string(),
  description: z.string().nullable(),
  appliesTo: reasonAppliesToSchema,
  isArchived: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReasonRow = z.infer<typeof reasonRowSchema>;

const reasonPoliciesSchema = z.object({
  cancel: reasonPolicySchema,
  reschedule: reasonPolicySchema,
});

export const listReasonsResponseSchema = z.object({
  data: z.array(reasonRowSchema),
  policies: reasonPoliciesSchema,
});

// --- Mutation request bodies ---

const createReasonBodySchema = z.object({
  category: reasonCategorySchema,
  label: reasonLabelField,
  description: reasonDescriptionField.nullable().optional(),
  appliesTo: reasonAppliesToSchema.optional(),
  sortOrder: sortOrderField.optional(),
});

export type CreateReasonBody = z.infer<typeof createReasonBodySchema>;

const updateReasonBodySchema = z
  .object({
    category: reasonCategorySchema.optional(),
    label: reasonLabelField.optional(),
    description: reasonDescriptionField.nullable().optional(),
    appliesTo: reasonAppliesToSchema.optional(),
    sortOrder: sortOrderField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdateReasonBody = z.infer<typeof updateReasonBodySchema>;
