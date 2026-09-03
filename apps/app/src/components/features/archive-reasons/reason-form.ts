import { z } from 'zod';
import { type ArchiveReasonRow, reasonLabelField } from '@/lib/schemas/archive-reasons';

export const archiveReasonClassificationSchema = z.enum([
  'organization_rejected',
  'candidate_withdrew',
  'candidate_unresponsive',
  'other',
]);

export type ArchiveReasonClassification = z.infer<typeof archiveReasonClassificationSchema>;

export const ARCHIVE_REASON_CLASSIFICATION_OPTIONS = archiveReasonClassificationSchema.options;

export const reasonFormSchema = z.object({
  label: reasonLabelField,
  classification: archiveReasonClassificationSchema,
});

export type ReasonFormData = z.infer<typeof reasonFormSchema>;

export function reasonToFormDefaults(reason: ArchiveReasonRow | null): ReasonFormData {
  let classification: ArchiveReasonClassification = 'organization_rejected';

  if (reason?.outcome === 'candidate_withdrew') {
    classification = 'candidate_withdrew';
  } else if (reason?.outcome === 'candidate_unresponsive') {
    classification = 'candidate_unresponsive';
  } else if (reason?.reasonType === 'other') {
    classification = 'other';
  }

  return {
    label: reason?.label ?? '',
    classification,
  };
}

export function buildCreatePayload(data: ReasonFormData) {
  if (data.classification === 'candidate_withdrew') {
    return { label: data.label, reasonType: 'rejected_by_candidate' as const, outcome: 'candidate_withdrew' as const };
  }

  if (data.classification === 'candidate_unresponsive') {
    return {
      label: data.label,
      reasonType: 'rejected_by_candidate' as const,
      outcome: 'candidate_unresponsive' as const,
    };
  }

  if (data.classification === 'other') {
    return { label: data.label, reasonType: 'other' as const, outcome: 'employer_rejected' as const };
  }

  return { label: data.label, reasonType: 'rejected_by_org' as const, outcome: 'employer_rejected' as const };
}
