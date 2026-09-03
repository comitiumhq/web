import { type FieldTypeId, fieldTypeRegistry } from '@comitium/schemas/forms';
import { z } from 'zod';
import {
  customFieldTitleField,
  fieldTypeSchema,
  objectTypeSchema,
  type SelectableValue,
} from '@/lib/schemas/custom-fields';

const optionEntrySchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(120),
  value: z.string().optional(),
  isArchived: z.boolean().optional(),
});

export type OptionEntry = z.infer<typeof optionEntrySchema>;

export const customFieldFormSchema = z
  .object({
    title: customFieldTitleField,
    description: z.string().trim().max(500),
    objectType: objectTypeSchema,
    fieldType: fieldTypeSchema,
    options: z.array(optionEntrySchema).max(200),
    isPrivate: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const def = fieldTypeRegistry[data.fieldType];

    if (!def.capabilities.requiresSelectableValues) {
      return;
    }

    if (data.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'At least one option is required',
      });

      return;
    }

    const seen = new Set<string>();

    for (const [i, opt] of data.options.entries()) {
      const slug = labelToSlug(opt.label);

      if (slug.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options', i, 'label'],
          message: 'Label must contain at least one letter or digit',
        });

        continue;
      }

      if (seen.has(slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options', i, 'label'],
          message: 'Duplicate option',
        });
      }

      seen.add(slug);
    }
  });

export type CustomFieldFormData = z.infer<typeof customFieldFormSchema>;

const DEFAULT_FIELD_TYPE: FieldTypeId = 'short_answer';

export const FORM_DEFAULTS: CustomFieldFormData = {
  title: '',
  description: '',
  objectType: 'candidate',
  fieldType: DEFAULT_FIELD_TYPE,
  options: [],
  isPrivate: false,
};

function labelToSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export function optionsToSelectableValues(options: OptionEntry[]): SelectableValue[] {
  return options.map((o) => {
    const base: SelectableValue = {
      label: o.label.trim(),
      value: o.value ?? labelToSlug(o.label),
    };

    if (o.isArchived) {
      base.isArchived = true;
    }

    return base;
  });
}
