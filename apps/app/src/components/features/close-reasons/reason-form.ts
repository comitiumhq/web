import { z } from 'zod';

import { type CloseReasonRow, reasonLabelField } from '@/lib/schemas/close-reasons';

export const reasonFormSchema = z.object({
  label: reasonLabelField,
});

export type ReasonFormData = z.infer<typeof reasonFormSchema>;

export function reasonToFormDefaults(reason: CloseReasonRow | null): ReasonFormData {
  return {
    label: reason?.label ?? '',
  };
}

export function buildSubmitPayload(data: ReasonFormData) {
  return {
    label: data.label,
  };
}
