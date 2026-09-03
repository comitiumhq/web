import { FIELD_TYPE_IDS, OBJECT_TYPES } from '@comitium/schemas/forms';
import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

export const objectTypeSchema = z.enum(OBJECT_TYPES);

export const fieldTypeSchema = z.enum(FIELD_TYPE_IDS);

export const selectableValueSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
  isArchived: z.boolean().optional(),
});

export type SelectableValue = z.infer<typeof selectableValueSchema>;

export const CUSTOM_FIELD_TITLE_MAX = 200;
export const CUSTOM_FIELD_DESCRIPTION_MAX = 500;

export const customFieldTitleField = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(CUSTOM_FIELD_TITLE_MAX, `Max ${CUSTOM_FIELD_TITLE_MAX} characters`);

const customFieldDescriptionField = z
  .string()
  .trim()
  .max(CUSTOM_FIELD_DESCRIPTION_MAX, `Max ${CUSTOM_FIELD_DESCRIPTION_MAX} characters`);

export const customFieldRowSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  objectType: objectTypeSchema,
  fieldType: fieldTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  selectableValues: z.array(selectableValueSchema).nullable(),
  isPrivate: z.boolean(),
  isArchived: z.boolean(),
  sortOrder: z.number().int(),
  createdBy: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const reorderCustomFieldsBodySchema = z.object({
  objectType: objectTypeSchema,
  ids: z.array(uuidSchema).min(1).max(200),
});

export type ReorderCustomFieldsBody = z.infer<typeof reorderCustomFieldsBodySchema>;

export type CustomFieldRow = z.infer<typeof customFieldRowSchema>;

export const listCustomFieldsResponseSchema = z.object({
  data: z.array(customFieldRowSchema),
});

export type ListCustomFieldsResponse = z.infer<typeof listCustomFieldsResponseSchema>;

const createCustomFieldBodySchema = z.object({
  objectType: objectTypeSchema,
  fieldType: fieldTypeSchema,
  title: customFieldTitleField,
  description: customFieldDescriptionField.optional(),
  selectableValues: z.array(selectableValueSchema).min(1).max(200).optional(),
  isPrivate: z.boolean().optional(),
});

export type CreateCustomFieldBody = z.infer<typeof createCustomFieldBodySchema>;

const updateCustomFieldBodySchema = z
  .object({
    title: customFieldTitleField.optional(),
    description: customFieldDescriptionField.nullable().optional(),
    selectableValues: z.array(selectableValueSchema).min(1).max(200).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdateCustomFieldBody = z.infer<typeof updateCustomFieldBodySchema>;
