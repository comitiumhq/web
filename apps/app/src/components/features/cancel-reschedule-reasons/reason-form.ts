import { z } from 'zod';

import {
  type ReasonRow,
  reasonAppliesToSchema,
  reasonCategorySchema,
  reasonDescriptionField,
  reasonLabelField,
} from '@/lib/schemas/cancel-reschedule-reasons';

export const reasonFormSchema = z.object({
  category: reasonCategorySchema,
  label: reasonLabelField,
  description: reasonDescriptionField.optional(),
  appliesTo: reasonAppliesToSchema,
});

export type ReasonFormData = z.infer<typeof reasonFormSchema>;

export function reasonToFormDefaults(reason: ReasonRow | null): ReasonFormData {
  return {
    category: reason?.category ?? 'candidate',
    label: reason?.label ?? '',
    description: reason?.description ?? '',
    appliesTo: reason?.appliesTo ?? 'both',
  };
}

export function buildSubmitPayload(data: ReasonFormData) {
  return {
    category: data.category,
    label: data.label,
    description: data.description ? data.description : null,
    appliesTo: data.appliesTo,
  };
}
