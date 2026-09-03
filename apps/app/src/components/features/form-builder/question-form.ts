import { FIELD_TYPE_IDS, type FieldTypeId } from '@comitium/schemas/forms';
import type { FormQuestionRow } from '@comitium/schemas/forms/form-definitions';
import { z } from 'zod';

export const questionFormSchema = z
  .object({
    questionType: z.enum(FIELD_TYPE_IDS),
    prompt: z.string().trim().min(1, 'Prompt is required').max(1000, 'Max 1000 characters'),
    description: z.string().trim().max(2000, 'Max 2000 characters'),
    isRequired: z.boolean(),
    isPrivate: z.boolean(),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'Option label is required').max(120, 'Max 120 characters'),
          value: z.string().max(128).optional(),
          isArchived: z.boolean().optional(),
        }),
      )
      .max(200, 'Max 200 options'),
  })
  .superRefine((data, ctx) => {
    if (isChoiceType(data.questionType) && data.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'At least one option is required',
      });
    }

    const seen = new Set<string>();

    for (const [i, opt] of data.options.entries()) {
      const key = opt.label.toLowerCase();

      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options', i, 'label'],
          message: 'Duplicate option label',
        });
      }

      seen.add(key);
    }
  });

export type QuestionFormData = z.infer<typeof questionFormSchema>;

export const FORM_DEFAULTS: QuestionFormData = {
  questionType: 'short_answer',
  prompt: '',
  description: '',
  isRequired: false,
  isPrivate: false,
  options: [],
};

export type FormBuilderQuestion = FormQuestionRow & {
  serverId: string | null;
};

function labelToSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

export function optionsToSelectableValues(
  options: QuestionFormData['options'],
): { label: string; value: string; isArchived?: boolean }[] {
  const used = new Set<string>();

  return options.map((opt) => {
    let value = opt.value ?? (labelToSlug(opt.label) || 'option');

    while (opt.value === undefined && used.has(value)) {
      value = `${value}_x`;
    }

    used.add(value);

    return { label: opt.label.trim(), value, ...(opt.isArchived ? { isArchived: true } : {}) };
  });
}

export function selectableValuesToOptions(
  values: { label: string; value: string; isArchived?: boolean }[] | null,
): QuestionFormData['options'] {
  return (values ?? []).map((v) => ({
    label: v.label,
    value: v.value,
    ...(v.isArchived ? { isArchived: true } : {}),
  }));
}

export function isChoiceType(fieldType: FieldTypeId): boolean {
  return fieldType === 'multiple_choice' || fieldType === 'checkboxes';
}
